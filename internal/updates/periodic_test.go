package updates

import (
	"context"
	"io"
	"sync/atomic"
	"testing"
	"time"

	"github.com/wailsapp/wails/v3/pkg/updater"
)

type checkProvider struct {
	check func(context.Context) (*updater.Release, error)
}

func (p *checkProvider) Name() string { return "test" }
func (p *checkProvider) Check(ctx context.Context, _ updater.CheckRequest) (*updater.Release, error) {
	return p.check(ctx)
}
func (*checkProvider) Download(context.Context, *updater.Release, io.Writer, func(int64, int64)) error {
	panic("automatic checks must never download")
}

type checkHost struct{}

func (checkHost) Emit(string, ...any) bool         { return true }
func (checkHost) OnEvent(string, func(any)) func() { return func() {} }
func (checkHost) OpenWindow(updater.WindowOptions) updater.WindowHandle {
	panic("automatic checks must never open a framework window")
}
func (checkHost) Quit() { panic("automatic checks must never quit") }

func attachedCheckManager(t *testing.T, check func(context.Context) (*updater.Release, error)) *Manager {
	t.Helper()
	m := newTestManager(t, "")
	m.provider.stable = &checkProvider{check: check}
	if err := m.Attach(updater.New(checkHost{})); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(m.StopPeriodicCheck)
	return m
}

func waitForCheck(t *testing.T, checked <-chan struct{}) {
	t.Helper()
	select {
	case <-checked:
	case <-time.After(time.Second):
		t.Fatal("automatic check did not run")
	}
}

func TestPeriodicCheckStopsAndRestarts(t *testing.T) {
	checked := make(chan struct{}, 16)
	var calls atomic.Int32
	m := attachedCheckManager(t, func(context.Context) (*updater.Release, error) {
		calls.Add(1)
		checked <- struct{}{}
		return nil, nil
	})
	m.StartPeriodicCheck(0, 10*time.Millisecond)
	waitForCheck(t, checked)
	waitForCheck(t, checked) // 不止启动时的一次检查
	m.StopPeriodicCheck()
	m.StopPeriodicCheck()
	stoppedAt := calls.Load()
	time.Sleep(30 * time.Millisecond)
	if calls.Load() != stoppedAt {
		t.Fatal("checks continued after stopping")
	}
	for len(checked) > 0 {
		<-checked
	}
	m.StartPeriodicCheck(0, time.Hour)
	waitForCheck(t, checked)
	m.StopPeriodicCheck()
	if calls.Load() != stoppedAt+1 {
		t.Fatal("restart should perform exactly one immediate check")
	}
	if _, err := m.Check(context.Background()); err != nil {
		t.Fatalf("manual checks must still work when auto checks are disabled: %v", err)
	}
}

func TestPeriodicCheckDuplicateStartKeepsExistingSchedule(t *testing.T) {
	checked := make(chan struct{}, 4)
	m := attachedCheckManager(t, func(context.Context) (*updater.Release, error) {
		checked <- struct{}{}
		return nil, nil
	})
	m.StartPeriodicCheck(time.Hour, time.Hour)
	m.StartPeriodicCheck(0, time.Millisecond)
	select {
	case <-checked:
		t.Fatal("saving other preferences restarted the existing schedule")
	case <-time.After(30 * time.Millisecond):
	}
	m.StopPeriodicCheck()
	m.StartPeriodicCheck(0, time.Hour)
	waitForCheck(t, checked)
}

func TestStopPeriodicCheckCancelsInFlightRequest(t *testing.T) {
	started := make(chan struct{})
	m := attachedCheckManager(t, func(ctx context.Context) (*updater.Release, error) {
		close(started)
		<-ctx.Done()
		return nil, ctx.Err()
	})
	m.StartPeriodicCheck(0, time.Hour)
	waitForCheck(t, started)
	stopped := make(chan struct{})
	go func() {
		m.StopPeriodicCheck()
		close(stopped)
	}()
	select {
	case <-stopped:
	case <-time.After(time.Second):
		t.Fatal("stopping waited for the network timeout instead of canceling")
	}
}

func TestCheckCompletionSeesSavedResultAndHonorsSkip(t *testing.T) {
	release := &updater.Release{Version: "2.0.0"}
	m := attachedCheckManager(t, func(context.Context) (*updater.Release, error) { return release, nil })
	var observed *updater.Release
	m.opts.OnCheckComplete = func() { observed = m.Pending() }
	if _, err := m.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if observed == nil || observed.Version != "2.0.0" {
		t.Fatal("completion event fired before pending release was saved")
	}
	m.SkipVersion("2.0.0")
	if m.Pending() != nil || m.State() != "up-to-date" {
		t.Fatal("skipping must immediately hide the available update")
	}
	if _, err := m.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if observed != nil {
		t.Fatal("no-update completion still exposed an old release")
	}
	m.SkipVersion("")
	if _, err := m.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if observed == nil {
		t.Fatal("clearing skipped version did not restore discovery")
	}
}

func TestBackgroundCheckDoesNotInterruptUpdateOperation(t *testing.T) {
	m := attachedCheckManager(t, func(context.Context) (*updater.Release, error) {
		t.Fatal("background check interrupted an active update operation")
		return nil, nil
	})
	m.operationMu.Lock()
	defer m.operationMu.Unlock()
	m.checkQuietly(context.Background())
}

type stagingProvider struct{ checkProvider }

func (*stagingProvider) Download(_ context.Context, _ *updater.Release, dst io.Writer, progress func(int64, int64)) error {
	n, err := io.WriteString(dst, "test application")
	progress(int64(n), int64(n))
	return err
}

func TestChecksPreserveStagedUpdate(t *testing.T) {
	// 只暂存到测试目录，绝不调用 Restart 或替换运行中的程序。
	t.Setenv("TMPDIR", t.TempDir())
	checks := 0
	m := attachedCheckManager(t, func(context.Context) (*updater.Release, error) { return nil, nil })
	m.provider.stable = &stagingProvider{checkProvider{check: func(context.Context) (*updater.Release, error) {
		checks++
		return &updater.Release{Version: "2.0.0", Artifact: updater.Artifact{Filename: "app.bin"}}, nil
	}}}
	if _, err := m.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if err := m.DownloadAndInstall(context.Background()); err != nil {
		t.Fatal(err)
	}
	m.checkQuietly(context.Background())
	if _, err := m.Check(context.Background()); err != nil {
		t.Fatal(err)
	}
	if checks != 1 || m.State() != "ready" {
		t.Fatalf("checks discarded the staged update: checks=%d state=%s", checks, m.State())
	}
}
