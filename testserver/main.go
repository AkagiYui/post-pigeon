// Command testserver 是一个基于 gin 的接口测试服务器，覆盖不同方法、协议、请求与响应，
// 用于本项目（PostPigeon）的功能测试。启动后访问 http://localhost:9900/ 查看接口索引，
// 或将 http://localhost:9900/openapi.json 导入 PostPigeon 进行测试。
package main

import (
	"encoding/xml"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/coder/websocket"
	"github.com/gin-gonic/gin"
)

func main() {
	addr := flag.String("addr", ":9900", "监听地址")
	flag.Parse()

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery(), corsMiddleware())

	// 首页：接口索引
	r.GET("/", indexHandler)
	// OpenAPI 文档（可导入 PostPigeon）
	r.GET("/openapi.json", func(c *gin.Context) { c.Data(http.StatusOK, "application/json; charset=utf-8", openAPISpec) })

	registerHTTPMethods(r)
	registerRequestBodies(r)
	registerResponses(r)
	registerAuth(r)
	registerMisc(r)

	// 不同协议：WebSocket 回声 / SSE 流
	r.GET("/ws", wsEcho)
	r.GET("/sse", sseStream)

	log.Printf("测试服务器已启动: http://localhost%s  (OpenAPI: http://localhost%s/openapi.json)", *addr, *addr)
	if err := r.Run(*addr); err != nil {
		log.Fatal(err)
	}
}

// corsMiddleware 允许跨域，便于任意来源测试。
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "*")
		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			c.Abort()
			return
		}
		c.Next()
	}
}

type user struct {
	ID    int    `json:"id" xml:"id"`
	Name  string `json:"name" xml:"name"`
	Email string `json:"email" xml:"email"`
}

var sampleUsers = []user{
	{ID: 1, Name: "Alice", Email: "alice@example.com"},
	{ID: 2, Name: "Bob", Email: "bob@example.com"},
}

// ---- 不同 HTTP 方法 ----

func registerHTTPMethods(r *gin.Engine) {
	g := r.Group("/api")
	g.GET("/ping", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"message": "pong", "time": time.Now().Format(time.RFC3339)}) })
	g.GET("/users", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"total": len(sampleUsers), "items": sampleUsers}) })
	g.GET("/users/:id", func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		for _, u := range sampleUsers {
			if u.ID == id {
				c.JSON(http.StatusOK, u)
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found", "id": id})
	})
	g.POST("/users", func(c *gin.Context) {
		var u user
		if err := c.ShouldBindJSON(&u); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		u.ID = len(sampleUsers) + 1
		c.JSON(http.StatusCreated, u)
	})
	g.PUT("/users/:id", func(c *gin.Context) {
		var u user
		_ = c.ShouldBindJSON(&u)
		u.ID, _ = strconv.Atoi(c.Param("id"))
		c.JSON(http.StatusOK, gin.H{"updated": true, "user": u})
	})
	g.PATCH("/users/:id", func(c *gin.Context) {
		patch := map[string]any{}
		_ = c.ShouldBindJSON(&patch)
		c.JSON(http.StatusOK, gin.H{"patched": true, "id": c.Param("id"), "fields": patch})
	})
	g.DELETE("/users/:id", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	g.HEAD("/users", func(c *gin.Context) {
		c.Header("X-Total-Count", strconv.Itoa(len(sampleUsers)))
		c.Status(http.StatusOK)
	})
}

// ---- 不同请求体 ----

func registerRequestBodies(r *gin.Engine) {
	g := r.Group("/api")
	// application/x-www-form-urlencoded
	g.POST("/form", func(c *gin.Context) {
		_ = c.Request.ParseForm()
		fields := map[string]string{}
		for k := range c.Request.PostForm {
			fields[k] = c.PostForm(k)
		}
		c.JSON(http.StatusOK, gin.H{"contentType": "form", "fields": fields})
	})
	// multipart/form-data（文件上传）
	g.POST("/upload", func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 file 字段"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"filename": file.Filename, "size": file.Size, "fields": c.Request.PostForm})
	})
	// application/xml
	g.POST("/xml", func(c *gin.Context) {
		body, _ := io.ReadAll(c.Request.Body)
		var u user
		if err := xml.Unmarshal(body, &u); err != nil {
			c.XML(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.XML(http.StatusOK, u)
	})
	// text/plain（原始文本）
	g.POST("/echo-body", func(c *gin.Context) {
		body, _ := io.ReadAll(c.Request.Body)
		c.Data(http.StatusOK, "text/plain; charset=utf-8", body)
	})
	// application/octet-stream（二进制回声）
	g.POST("/echo-binary", func(c *gin.Context) {
		body, _ := io.ReadAll(c.Request.Body)
		c.Data(http.StatusOK, "application/octet-stream", body)
	})
}

// ---- 不同响应 ----

func registerResponses(r *gin.Engine) {
	g := r.Group("/api/content")
	g.GET("/json", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"type": "json", "items": sampleUsers}) })
	g.GET("/xml", func(c *gin.Context) { c.XML(http.StatusOK, sampleUsers[0]) })
	g.GET("/html", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", []byte("<!doctype html><html><body><h1>Hello</h1><p>测试 HTML 响应</p></body></html>"))
	})
	g.GET("/text", func(c *gin.Context) { c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte("纯文本响应")) })
	g.GET("/image", func(c *gin.Context) { c.Data(http.StatusOK, "image/png", pngPixel) })
	g.GET("/pdf", func(c *gin.Context) { c.Data(http.StatusOK, "application/pdf", minimalPDF) })
}

// ---- 认证 ----

func registerAuth(r *gin.Engine) {
	g := r.Group("/api/auth")
	g.GET("/basic", func(c *gin.Context) {
		u, p, ok := c.Request.BasicAuth()
		if !ok || u != "admin" || p != "secret" {
			c.Header("WWW-Authenticate", `Basic realm="test"`)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid basic auth"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"authenticated": true, "user": u})
	})
	g.GET("/bearer", func(c *gin.Context) {
		if c.GetHeader("Authorization") != "Bearer test-token" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid bearer token"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"authenticated": true})
	})
	g.GET("/apikey", func(c *gin.Context) {
		if c.GetHeader("Apikey") != "test-key" && c.Query("apikey") != "test-key" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"authenticated": true})
	})
}

// ---- 其它：状态码 / 延时 / 头 / Cookie / 重定向 / 查询参数 ----

func registerMisc(r *gin.Engine) {
	g := r.Group("/api")
	g.GET("/echo", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"query": c.Request.URL.Query()}) })
	g.GET("/status/:code", func(c *gin.Context) {
		code, _ := strconv.Atoi(c.Param("code"))
		if code < 100 || code > 599 {
			code = 200
		}
		c.JSON(code, gin.H{"status": code})
	})
	g.GET("/delay/:seconds", func(c *gin.Context) {
		sec, _ := strconv.Atoi(c.Param("seconds"))
		if sec > 10 {
			sec = 10
		}
		time.Sleep(time.Duration(sec) * time.Second)
		c.JSON(http.StatusOK, gin.H{"delayed": sec})
	})
	g.GET("/headers", func(c *gin.Context) {
		h := map[string]string{}
		for k := range c.Request.Header {
			h[k] = c.GetHeader(k)
		}
		c.JSON(http.StatusOK, gin.H{"headers": h})
	})
	g.GET("/cookies/set", func(c *gin.Context) {
		c.SetCookie("test_cookie", "cookie_value", 3600, "/", "", false, true)
		c.JSON(http.StatusOK, gin.H{"set": "test_cookie"})
	})
	g.GET("/cookies", func(c *gin.Context) {
		cookies := map[string]string{}
		for _, ck := range c.Request.Cookies() {
			cookies[ck.Name] = ck.Value
		}
		c.JSON(http.StatusOK, gin.H{"cookies": cookies})
	})
	g.GET("/redirect", func(c *gin.Context) { c.Redirect(http.StatusFound, "/api/ping") })
}

// ---- WebSocket 回声 ----

func wsEcho(c *gin.Context) {
	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		return
	}
	defer conn.Close(websocket.StatusNormalClosure, "")
	ctx := c.Request.Context()
	_ = conn.Write(ctx, websocket.MessageText, []byte("欢迎连接测试 WebSocket，发送任意消息将被回声"))
	for {
		typ, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		if err := conn.Write(ctx, typ, append([]byte("echo: "), data...)); err != nil {
			return
		}
	}
}

// ---- SSE 流 ----

func sseStream(c *gin.Context) {
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	ctx := c.Request.Context()
	for i := 1; i <= 20; i++ {
		select {
		case <-ctx.Done():
			return
		default:
		}
		fmt.Fprintf(c.Writer, "id: %d\nevent: tick\ndata: {\"n\": %d, \"time\": \"%s\"}\n\n", i, i, time.Now().Format(time.RFC3339))
		c.Writer.Flush()
		time.Sleep(time.Second)
	}
}

func indexHandler(c *gin.Context) {
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(indexHTML))
}
