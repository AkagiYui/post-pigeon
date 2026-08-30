package services

import (
	"testing"
	"time"

	"PostPigeon/internal/models"
)

func TestRequestLifecycleTimingCompletesPrepareProcessAndTotal(t *testing.T) {
	start := time.Unix(100, 0)
	timing := &requestLifecycleTiming{
		startedAt:          start,
		networkStartedAt:   start.Add(10 * time.Millisecond),
		responseFinishedAt: start.Add(80 * time.Millisecond),
	}

	got := timing.complete(models.TimingInfo{Stalled: 4, TLSHandshake: 6}, start.Add(100*time.Millisecond))
	if got.Prepare != 10 || got.Process != 20 || got.Total != 100 {
		t.Fatalf("lifecycle timing = %+v", got)
	}
	if got.Socket != 4 || !got.TLSUsed {
		t.Fatalf("compatibility fields = %+v", got)
	}
}

func TestRequestLifecycleTimingClampsNegativeDurations(t *testing.T) {
	start := time.Unix(100, 0)
	timing := &requestLifecycleTiming{
		startedAt:          start,
		networkStartedAt:   start.Add(-time.Millisecond),
		responseFinishedAt: start.Add(5 * time.Millisecond),
	}
	got := timing.complete(models.TimingInfo{}, start.Add(4*time.Millisecond))
	if got.Prepare != 0 || got.Process != 0 || got.Total != 4 {
		t.Fatalf("negative durations should be clamped: %+v", got)
	}
}
