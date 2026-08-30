package services

import (
	"time"

	"PostPigeon/internal/models"
)

// requestLifecycleTiming 记录一次用户触发请求从进入服务层到响应可交付的边界。
// 网络内部的细分由 httptraceCollector 提供；这里负责准备、响应处理和完整总时长。
type requestLifecycleTiming struct {
	startedAt          time.Time
	networkStartedAt   time.Time
	responseFinishedAt time.Time
}

func newRequestLifecycleTiming() *requestLifecycleTiming {
	return &requestLifecycleTiming{startedAt: time.Now()}
}

func (t *requestLifecycleTiming) startNetwork() time.Time {
	t.networkStartedAt = time.Now()
	return t.networkStartedAt
}

func (t *requestLifecycleTiming) finishResponse(at time.Time) {
	t.responseFinishedAt = at
}

func (t *requestLifecycleTiming) complete(base models.TimingInfo, completedAt time.Time) models.TimingInfo {
	if !t.startedAt.IsZero() && !t.networkStartedAt.IsZero() {
		base.Prepare = nonNegativeDuration(t.networkStartedAt.Sub(t.startedAt))
	}
	if !t.responseFinishedAt.IsZero() {
		base.Process = nonNegativeDuration(completedAt.Sub(t.responseFinishedAt))
	}
	if !t.startedAt.IsZero() {
		base.Total = nonNegativeDuration(completedAt.Sub(t.startedAt))
	}
	if base.Socket == 0 {
		base.Socket = base.Stalled
	}
	base.TLSUsed = base.TLSUsed || base.TLSHandshake > 0
	return base
}

func nonNegativeDuration(duration time.Duration) float64 {
	if duration <= 0 {
		return 0
	}
	return durMs(duration)
}

// networkTimingFromTrace 把 httptrace 的时间点变成连续、互不重叠的网络阶段。
// 每个阶段都从上一个里程碑结束处开始，因而 Socket + DNS + TCP + TLS + TTFB + 下载
// 始终覆盖 networkStartedAt → responseFinishedAt，不会遗漏请求上传或重复计算握手时间。
func networkTimingFromTrace(trace *httptraceCollector, networkStartedAt, responseFinishedAt time.Time) models.TimingInfo {
	if trace == nil || networkStartedAt.IsZero() || responseFinishedAt.Before(networkStartedAt) {
		return models.TimingInfo{}
	}

	current := networkStartedAt
	firstNetworkEvent := earliestTimeAfter(networkStartedAt, responseFinishedAt,
		traceTime(trace.dnsStart), traceTime(trace.connectStart), traceTime(trace.tlsStart), traceTime(trace.gotConn), traceTime(trace.gotFirstByte))
	if firstNetworkEvent.IsZero() {
		firstNetworkEvent = responseFinishedAt
	}

	timing := models.TimingInfo{Reused: traceBool(trace.reused)}
	timing.Socket, current = advanceTiming(current, firstNetworkEvent, responseFinishedAt)
	timing.DNSLookup, current = advanceTiming(current, traceTime(trace.dnsEnd), responseFinishedAt)
	timing.TCPConnect, current = advanceTiming(current, traceTime(trace.connectEnd), responseFinishedAt)

	tlsEnd := traceTime(trace.tlsEnd)
	timing.TLSUsed = !traceTime(trace.tlsStart).IsZero() || !tlsEnd.IsZero()
	if timing.TLSUsed {
		timing.TLSHandshake, current = advanceTiming(current, tlsEnd, responseFinishedAt)
	}

	firstByte := traceTime(trace.gotFirstByte)
	timing.Wait, current = advanceTiming(current, firstByte, responseFinishedAt)
	timing.Download, current = advanceTiming(current, responseFinishedAt, responseFinishedAt)
	timing.Stalled = timing.Socket
	if !firstByte.IsZero() && !firstByte.Before(networkStartedAt) {
		timing.TTFB = nonNegativeDuration(firstByte.Sub(networkStartedAt))
	}
	timing.Total = nonNegativeDuration(responseFinishedAt.Sub(networkStartedAt))
	return timing
}

func traceTime(value *time.Time) time.Time {
	if value == nil {
		return time.Time{}
	}
	return *value
}

func traceBool(value *bool) bool {
	return value != nil && *value
}

func earliestTimeAfter(start, end time.Time, candidates ...time.Time) time.Time {
	var earliest time.Time
	for _, candidate := range candidates {
		if candidate.IsZero() || candidate.Before(start) || candidate.After(end) {
			continue
		}
		if earliest.IsZero() || candidate.Before(earliest) {
			earliest = candidate
		}
	}
	return earliest
}

func advanceTiming(current, milestone, end time.Time) (float64, time.Time) {
	if milestone.IsZero() || milestone.Before(current) {
		return 0, current
	}
	if milestone.After(end) {
		milestone = end
	}
	return nonNegativeDuration(milestone.Sub(current)), milestone
}
