package services

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"PostPigeon/internal/models"

	"github.com/coder/websocket"
	"github.com/wailsapp/wails/v3/pkg/application"
	"gorm.io/gorm"
)

// StreamEvent 是推送给前端的流式事件（WebSocket / SSE 通用）。
// 连接存活于 Go 侧，前端切换标签页不会中断连接。
type StreamEvent struct {
	ConnID    string `json:"connId"`
	Kind      string `json:"kind"`      // open, message, sent, close, error
	Data      string `json:"data"`      // 消息内容
	Timestamp int64  `json:"timestamp"` // 毫秒时间戳
}

// emitStream 通过 Wails 事件把流式事件推给前端（无运行中的 App 时静默跳过，便于测试）。
func emitStream(eventName string, ev StreamEvent) {
	app := application.Get()
	if app == nil || app.Event == nil {
		return
	}
	app.Event.Emit(eventName, ev)
}

func nowMillis() int64 { return time.Now().UnixMilli() }

// ---- WebSocket ----

// WebSocketService 管理多个持久 WebSocket 连接。
type WebSocketService struct {
	db    *gorm.DB
	mu    sync.Mutex
	conns map[string]*wsConn
}

type wsConn struct {
	conn   *websocket.Conn
	cancel context.CancelFunc
}

// NewWebSocketService 创建 WebSocket 服务实例。db 用于按端点解析生效代理。
func NewWebSocketService(db *gorm.DB) *WebSocketService {
	return &WebSocketService{db: db, conns: map[string]*wsConn{}}
}

// WSEventName 是前端监听的 WebSocket 事件名
const WSEventName = "ws:event"

// Connect 建立一个 WebSocket 连接。connID 由前端生成（对已保存端点即端点 ID），
// 用于区分不同标签页的连接，并据此解析该端点的生效代理。proxyConfig 为接口级代理选择（可空）。
func (s *WebSocketService) Connect(connID, urlStr string, headers map[string]string, proxyConfig string) error {
	s.Close(connID) // 若已存在同 ID 连接，先关闭

	ctx, cancel := context.WithCancel(context.Background())
	opts := &websocket.DialOptions{HTTPHeader: http.Header{}}
	for k, v := range headers {
		opts.HTTPHeader.Set(k, v)
	}

	// 代理：按端点(connID)反查模块→项目，沿「接口→项目→全局」解析生效代理并注入拨号传输。
	if s.db != nil {
		var ep models.EndpointProxy
		if strings.TrimSpace(proxyConfig) != "" {
			_ = models.FromJSON(proxyConfig, &ep)
		}
		moduleID := moduleIDFromEndpoint(s.db, connID)
		if pf := buildProxyFunc(resolveEffectiveProxy(s.db, moduleID, ep), nil); pf != nil {
			opts.HTTPClient = &http.Client{Transport: &http.Transport{Proxy: pf}}
		}
	}

	conn, _, err := websocket.Dial(ctx, urlStr, opts)
	if err != nil {
		cancel()
		emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "error", Data: err.Error(), Timestamp: nowMillis()})
		return fmt.Errorf("WebSocket 连接失败: %w", err)
	}
	conn.SetReadLimit(-1)

	s.mu.Lock()
	s.conns[connID] = &wsConn{conn: conn, cancel: cancel}
	s.mu.Unlock()

	emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "open", Timestamp: nowMillis()})

	go s.readLoop(ctx, connID, conn)
	return nil
}

func (s *WebSocketService) readLoop(ctx context.Context, connID string, conn *websocket.Conn) {
	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "close", Data: err.Error(), Timestamp: nowMillis()})
			s.cleanup(connID)
			return
		}
		emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "message", Data: string(data), Timestamp: nowMillis()})
	}
}

// Send 向指定连接发送一条文本消息。
func (s *WebSocketService) Send(connID, message string) error {
	s.mu.Lock()
	c := s.conns[connID]
	s.mu.Unlock()
	if c == nil {
		return fmt.Errorf("连接不存在: %s", connID)
	}
	if err := c.conn.Write(context.Background(), websocket.MessageText, []byte(message)); err != nil {
		return fmt.Errorf("发送失败: %w", err)
	}
	emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "sent", Data: message, Timestamp: nowMillis()})
	return nil
}

// Close 关闭并移除指定连接。
func (s *WebSocketService) Close(connID string) error {
	s.mu.Lock()
	c := s.conns[connID]
	delete(s.conns, connID)
	s.mu.Unlock()
	if c != nil {
		c.cancel()
		_ = c.conn.Close(websocket.StatusNormalClosure, "client closed")
	}
	return nil
}

func (s *WebSocketService) cleanup(connID string) {
	s.mu.Lock()
	c := s.conns[connID]
	delete(s.conns, connID)
	s.mu.Unlock()
	if c != nil {
		c.cancel()
	}
}

// IsConnected 返回指定连接是否处于活动状态。
func (s *WebSocketService) IsConnected(connID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.conns[connID]
	return ok
}
