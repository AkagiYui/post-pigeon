package services

import (
	"math"
	"testing"
	"time"

	"PostPigeon/internal/models"
)

func timingPhaseTotal(timing models.TimingInfo) float64 {
	return timing.Prepare + timing.Socket + timing.DNSLookup + timing.TCPConnect +
		timing.TLSHandshake + timing.Wait + timing.Download + timing.Process
}

func timingNearlyEqual(left, right float64) bool {
	return math.Abs(left-right) < 0.02
}

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

func TestNetworkTimingFromTraceBuildsContiguousTLSWaterfall(t *testing.T) {
	start := time.Unix(100, 0)
	dnsStart := start.Add(2 * time.Millisecond)
	dnsEnd := start.Add(5 * time.Millisecond)
	connectStart := dnsEnd
	connectEnd := start.Add(10 * time.Millisecond)
	tlsStart := connectEnd
	tlsEnd := start.Add(15 * time.Millisecond)
	gotConn := start.Add(16 * time.Millisecond)
	wroteRequest := start.Add(30 * time.Millisecond)
	firstByte := start.Add(40 * time.Millisecond)
	reused := false
	trace := &httptraceCollector{
		dnsStart: &dnsStart, dnsEnd: &dnsEnd,
		connectStart: &connectStart, connectEnd: &connectEnd,
		tlsStart: &tlsStart, tlsEnd: &tlsEnd,
		gotConn: &gotConn, wroteRequest: &wroteRequest, gotFirstByte: &firstByte,
		reused: &reused,
	}

	got := networkTimingFromTrace(trace, start, start.Add(50*time.Millisecond))
	if got.Socket != 2 || got.DNSLookup != 3 || got.TCPConnect != 5 || got.TLSHandshake != 5 ||
		got.Wait != 25 || got.Download != 10 {
		t.Fatalf("network waterfall = %+v", got)
	}
	if !got.TLSUsed || got.Reused || got.TTFB != 40 {
		t.Fatalf("network metadata = %+v", got)
	}
	if got.Wait <= nonNegativeDuration(firstByte.Sub(wroteRequest)) {
		t.Fatalf("TTFB phase must include request upload: %+v", got)
	}
	if !timingNearlyEqual(got.Total, got.Socket+got.DNSLookup+got.TCPConnect+got.TLSHandshake+got.Wait+got.Download) {
		t.Fatalf("network phases must cover total: %+v", got)
	}
}

func TestNetworkTimingFromTraceHandlesReusedConnection(t *testing.T) {
	start := time.Unix(100, 0)
	gotConn := start.Add(5 * time.Millisecond)
	firstByte := start.Add(20 * time.Millisecond)
	reused := true
	trace := &httptraceCollector{gotConn: &gotConn, gotFirstByte: &firstByte, reused: &reused}

	got := networkTimingFromTrace(trace, start, start.Add(30*time.Millisecond))
	if got.Socket != 5 || got.Wait != 15 || got.Download != 10 || !got.Reused || got.TLSUsed {
		t.Fatalf("reused connection timing = %+v", got)
	}
}
