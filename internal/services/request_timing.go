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
