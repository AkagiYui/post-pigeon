package instancelock

import (
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// TestAcquireRejectsSecondInstance 第二次加锁必须被拒绝，释放后又能重新拿到。
func TestAcquireRejectsSecondInstance(t *testing.T) {
	dir := t.TempDir()

	first, err := Acquire(dir)
	if err != nil {
		t.Fatalf("首次加锁失败: %v", err)
	}

	if _, err := Acquire(dir); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("第二个实例应被拒绝，实际: %v", err)
	}

	if err := first.Release(); err != nil {
		t.Fatalf("释放锁失败: %v", err)
	}

	second, err := Acquire(dir)
	if err != nil {
		t.Fatalf("释放后应能重新加锁，实际: %v", err)
	}
	if err := second.Release(); err != nil {
		t.Fatalf("释放锁失败: %v", err)
	}
}

// TestAcquireAcrossProcesses 跨进程才是真实场景：子进程持锁期间父进程必须拿不到，
// 子进程被杀掉（模拟崩溃）之后锁应由操作系统释放，不留僵尸锁。
func TestAcquireAcrossProcesses(t *testing.T) {
	if os.Getenv("INSTANCELOCK_HOLDER_DIR") != "" {
		// 子进程分支：拿住锁并挂起，等父进程杀掉
		holdLockForever()
		return
	}

	dir := t.TempDir()
	cmd := exec.Command(os.Args[0], "-test.run", "TestAcquireAcrossProcesses")
	cmd.Env = append(os.Environ(), "INSTANCELOCK_HOLDER_DIR="+dir)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		t.Fatalf("创建管道失败: %v", err)
	}
	if err := cmd.Start(); err != nil {
		t.Fatalf("启动子进程失败: %v", err)
	}
	defer func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	// 等子进程报告已拿到锁
	buf := make([]byte, 6)
	if _, err := stdout.Read(buf); err != nil {
		t.Fatalf("子进程未能拿到锁: %v", err)
	}

	if _, err := Acquire(dir); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("子进程持锁期间不应能加锁，实际: %v", err)
	}

	// 直接杀掉子进程，等价于应用崩溃
	if err := cmd.Process.Kill(); err != nil {
		t.Fatalf("杀死子进程失败: %v", err)
	}
	_ = cmd.Wait()

	lock, err := Acquire(dir)
	if err != nil {
		t.Fatalf("持锁进程被杀后应能重新加锁（不留僵尸锁），实际: %v", err)
	}
	if err := lock.Release(); err != nil {
		t.Fatalf("释放锁失败: %v", err)
	}

	if _, err := os.Stat(filepath.Join(dir, lockFileName)); err != nil {
		t.Fatalf("锁文件应当存在: %v", err)
	}
}

// holdLockForever 供子进程分支使用：拿到锁后打印一行并永久阻塞。
func holdLockForever() {
	if _, err := Acquire(os.Getenv("INSTANCELOCK_HOLDER_DIR")); err != nil {
		os.Exit(1)
	}
	os.Stdout.WriteString("locked")
	select {}
}
