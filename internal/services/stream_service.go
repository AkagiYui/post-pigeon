package services

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
	"github.com/wailsapp/wails/v3/pkg/application"
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
	mu    sync.Mutex
	conns map[string]*wsConn
}

type wsConn struct {
	conn   *websocket.Conn
	cancel context.CancelFunc
}

// NewWebSocketService 创建 WebSocket 服务实例
func NewWebSocketService() *WebSocketService {
	return &WebSocketService{conns: map[string]*wsConn{}}
}

// WSEventName 是前端监听的 WebSocket 事件名
const WSEventName = "ws:event"

// Connect 建立一个 WebSocket 连接。connID 由前端生成，用于区分不同标签页的连接。
func (s *WebSocketService) Connect(connID, urlStr string, headers map[string]string) error {
	s.Close(connID) // 若已存在同 ID 连接，先关闭

	ctx, cancel := context.WithCancel(context.Background())
	opts := &websocket.DialOptions{HTTPHeader: http.Header{}}
	for k, v := range headers {
		opts.HTTPHeader.Set(k, v)
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

// ---- SSE（Server-Sent Events） ----

// SSEService 管理多个持久 SSE 连接。
type SSEService struct {
	mu    sync.Mutex
	conns map[string]context.CancelFunc
}

// NewSSEService 创建 SSE 服务实例
func NewSSEService() *SSEService {
	return &SSEService{conns: map[string]context.CancelFunc{}}
}

// SSEEventName 是前端监听的 SSE 事件名
const SSEEventName = "sse:event"

// SSEConnectData SSE 连接参数
type SSEConnectData struct {
	ConnID  string            `json:"connId"`
	URL     string            `json:"url"`
	Method  string            `json:"method"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

// Connect 建立一个 SSE 连接并持续读取事件流。
func (s *SSEService) Connect(data SSEConnectData) error {
	s.Close(data.ConnID)

	ctx, cancel := context.WithCancel(context.Background())
	method := data.Method
	if method == "" {
		method = http.MethodGet
	}
	var bodyReader io.Reader
	if data.Body != "" {
		bodyReader = strings.NewReader(data.Body)
	}
	req, err := http.NewRequestWithContext(ctx, strings.ToUpper(method), data.URL, bodyReader)
	if err != nil {
		cancel()
		return fmt.Errorf("创建 SSE 请求失败: %w", err)
	}
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")
	for k, v := range data.Headers {
		req.Header.Set(k, v)
	}

	s.mu.Lock()
	s.conns[data.ConnID] = cancel
	s.mu.Unlock()

	go s.readLoop(req, data.ConnID)
	return nil
}

func (s *SSEService) readLoop(req *http.Request, connID string) {
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		emitStream(SSEEventName, StreamEvent{ConnID: connID, Kind: "error", Data: err.Error(), Timestamp: nowMillis()})
		s.cleanup(connID)
		return
	}
	defer resp.Body.Close()

	emitStream(SSEEventName, StreamEvent{ConnID: connID, Kind: "open", Data: fmt.Sprintf("%d", resp.StatusCode), Timestamp: nowMillis()})

	reader := bufio.NewReader(resp.Body)
	var dataLines []string
	flush := func() {
		if len(dataLines) == 0 {
			return
		}
		emitStream(SSEEventName, StreamEvent{ConnID: connID, Kind: "message", Data: strings.Join(dataLines, "\n"), Timestamp: nowMillis()})
		dataLines = dataLines[:0]
	}
	for {
		line, err := reader.ReadString('\n')
		if len(line) > 0 {
			trimmed := strings.TrimRight(line, "\r\n")
			switch {
			case trimmed == "":
				flush() // 空行表示一个事件结束
			case strings.HasPrefix(trimmed, ":"):
				// 注释行，忽略
			case strings.HasPrefix(trimmed, "data:"):
				dataLines = append(dataLines, strings.TrimSpace(strings.TrimPrefix(trimmed, "data:")))
			default:
				// 其它字段（event:/id:/retry:）原样透传
				dataLines = append(dataLines, trimmed)
			}
		}
		if err != nil {
			flush()
			emitStream(SSEEventName, StreamEvent{ConnID: connID, Kind: "close", Data: err.Error(), Timestamp: nowMillis()})
			s.cleanup(connID)
			return
		}
	}
}

// Close 关闭并移除指定 SSE 连接。
func (s *SSEService) Close(connID string) error {
	s.mu.Lock()
	cancel := s.conns[connID]
	delete(s.conns, connID)
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	return nil
}

func (s *SSEService) cleanup(connID string) {
	s.mu.Lock()
	cancel := s.conns[connID]
	delete(s.conns, connID)
	s.mu.Unlock()
	if cancel != nil {
		cancel()
	}
	slog.Debug("SSE 连接已清理", "connId", connID)
}

// IsConnected 返回指定 SSE 连接是否活动。
func (s *SSEService) IsConnected(connID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.conns[connID]
	return ok
}
