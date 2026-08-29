package services

import (
	"context"
	"encoding/base64"
	"net/http"
	"strings"
	"sync"
	"time"

	"PostPigeon/internal/apperr"
	"PostPigeon/internal/models"

	"github.com/coder/websocket"
	"github.com/wailsapp/wails/v3/pkg/application"
	"gorm.io/gorm"

	"PostPigeon/internal/safego"
)

// StreamEvent 是推送给前端的流式事件（WebSocket / SSE 通用）。
// 连接存活于 Go 侧，前端切换标签页不会中断连接。
type StreamEvent struct {
	ConnID string `json:"connId"`
	Kind   string `json:"kind"` // open, message, sent, close, error
	Data   string `json:"data"` // 消息内容；Binary 为 true 时是 base64
	// Binary 为 true 表示这是一帧二进制消息，Data 为其 base64 编码。
	// 二进制帧不能直接 string() 转换——非法 UTF-8 字节会被替换成 U+FFFD，数据就毁了。
	Binary    bool  `json:"binary,omitempty"`
	Timestamp int64 `json:"timestamp"` // 毫秒时间戳
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

// wsPingInterval 是 WebSocket 保活心跳间隔。
// 没有心跳时，中间的负载均衡/NAT 会在空闲若干分钟后静默掐断连接，
// 前端看到的现象是「连接还显示着，但再也收不到消息」。
const wsPingInterval = 30 * time.Second

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

// ServiceShutdown 应用退出时关闭全部 WebSocket 连接，避免连接与 goroutine 悬挂。
func (s *WebSocketService) ServiceShutdown() error {
	s.mu.Lock()
	conns := make([]*wsConn, 0, len(s.conns))
	for id, c := range s.conns {
		conns = append(conns, c)
		delete(s.conns, id)
	}
	s.mu.Unlock()

	for _, c := range conns {
		c.cancel()
		_ = c.conn.Close(websocket.StatusGoingAway, "application shutting down")
	}
	return nil
}

// Connect 建立一个 WebSocket 连接。connID 由前端生成（对已保存端点即端点 ID），
// 用于区分不同标签页的连接，并据此解析该端点的生效代理与 TLS 设置。
// proxyConfig / tlsConfig 为接口级选择（可空）。autoConvertWSProtocol 为当前编辑态按五级继承算出的最终开关。
func (s *WebSocketService) Connect(connID, urlStr string, headers map[string]string, proxyConfig, tlsConfig string, autoConvertWSProtocol bool) error {
	s.Close(connID) // 若已存在同 ID 连接，先关闭
	urlStr = convertHTTPToWSProtocol(urlStr, autoConvertWSProtocol)

	ctx, cancel := context.WithCancel(context.Background())
	opts := &websocket.DialOptions{HTTPHeader: http.Header{}}
	for k, v := range headers {
		opts.HTTPHeader.Set(k, v)
	}

	limits := models.DefaultRequestSettings
	// 代理与 TLS：按端点(connID)反查完整五级链后注入拨号传输。
	if s.db != nil {
		limits = getRequestSettings(s.db)
		endpoint := endpointForRequest(s.db, connID, moduleIDFromEndpoint(s.db, connID))
		path := loadRequestScopePath(s.db, endpoint)

		var epProxy models.EndpointProxy
		if strings.TrimSpace(proxyConfig) != "" {
			_ = models.FromJSON(proxyConfig, &epProxy)
		}
		var epTLS models.EndpointTLS
		if strings.TrimSpace(tlsConfig) != "" {
			_ = models.FromJSON(tlsConfig, &epTLS)
		}

		proxy := resolveProxy(resolveEffectiveProxyFromPath(s.db, path, epProxy), nil)
		transport, err := sharedTransport(proxy, resolveEffectiveTLSFromPath(s.db, path, epTLS))
		if err != nil {
			cancel()
			return err
		}
		opts.HTTPClient = &http.Client{Transport: transport}
	}

	conn, _, err := websocket.Dial(ctx, urlStr, opts)
	if err != nil {
		cancel()
		emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "error", Data: err.Error(), Timestamp: nowMillis()})
		return apperr.Wrap(err, apperr.CodeWSConnect, apperr.P("url", urlStr))
	}
	// 单帧上限：-1 表示不限制，会让一个超大帧直接把内存打满
	if limits.MaxWebSocketMessageBytes > 0 {
		conn.SetReadLimit(limits.MaxWebSocketMessageBytes)
	} else {
		conn.SetReadLimit(-1)
	}

	s.mu.Lock()
	s.conns[connID] = &wsConn{conn: conn, cancel: cancel}
	s.mu.Unlock()

	emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "open", Timestamp: nowMillis()})

	safego.Go("ws.readLoop", func() { s.readLoop(ctx, connID, conn) })
	safego.Go("ws.keepAlive", func() { s.keepAlive(ctx, conn) })
	return nil
}

// keepAlive 定期发送 ping，维持空闲连接不被中间设备掐断。
func (s *WebSocketService) keepAlive(ctx context.Context, conn *websocket.Conn) {
	ticker := time.NewTicker(wsPingInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
			err := conn.Ping(pingCtx)
			cancel()
			if err != nil {
				// ping 失败说明连接已不可用，交给 readLoop 走正常的关闭流程
				return
			}
		}
	}
}

func (s *WebSocketService) readLoop(ctx context.Context, connID string, conn *websocket.Conn) {
	for {
		msgType, data, err := conn.Read(ctx)
		if err != nil {
			emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "close", Data: err.Error(), Timestamp: nowMillis()})
			s.cleanup(connID)
			return
		}
		ev := StreamEvent{ConnID: connID, Kind: "message", Timestamp: nowMillis()}
		if msgType == websocket.MessageBinary {
			ev.Binary = true
			ev.Data = base64.StdEncoding.EncodeToString(data)
		} else {
			ev.Data = string(data)
		}
		emitStream(WSEventName, ev)
	}
}

// Send 向指定连接发送一条文本消息。
func (s *WebSocketService) Send(connID, message string) error {
	return s.write(connID, websocket.MessageText, []byte(message), message, false)
}

// SendBinary 向指定连接发送一帧二进制消息，payload 为 base64 编码。
func (s *WebSocketService) SendBinary(connID, payloadBase64 string) error {
	raw, err := base64.StdEncoding.DecodeString(payloadBase64)
	if err != nil {
		return apperr.Wrap(err, apperr.CodeInvalidInput, apperr.P("field", "payload"))
	}
	return s.write(connID, websocket.MessageBinary, raw, payloadBase64, true)
}

// write 是 Send / SendBinary 的公共实现。
func (s *WebSocketService) write(connID string, msgType websocket.MessageType, payload []byte, echo string, binary bool) error {
	s.mu.Lock()
	c := s.conns[connID]
	s.mu.Unlock()
	if c == nil {
		return apperr.New(apperr.CodeWSNotConnected, apperr.P("connId", connID))
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := c.conn.Write(ctx, msgType, payload); err != nil {
		return apperr.Wrap(err, apperr.CodeWSSend)
	}
	emitStream(WSEventName, StreamEvent{ConnID: connID, Kind: "sent", Data: echo, Binary: binary, Timestamp: nowMillis()})
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
