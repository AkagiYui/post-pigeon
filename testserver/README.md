# 测试服务器

基于 [gin](https://github.com/gin-gonic/gin) 的接口测试服务器，覆盖不同 HTTP 方法、请求体、响应类型与协议（HTTP / WebSocket / SSE），用于测试 Post Pigeon。

## 启动

```bash
go run ./testserver            # 默认监听 :9900
go run ./testserver -addr :8080
```

启动后：

- 首页接口索引：<http://localhost:9900/>
- OpenAPI 文档：<http://localhost:9900/openapi.json> —— 可直接导入 Post Pigeon 批量测试

## 覆盖内容

- **方法**：GET / POST / PUT / PATCH / DELETE / HEAD / OPTIONS
- **请求体**：JSON、x-www-form-urlencoded、multipart 文件上传、XML、纯文本、二进制
- **响应**：JSON / XML / HTML / 纯文本 / 图片(PNG) / PDF、任意状态码、延时、重定向、Cookie
- **认证**：Basic（admin/secret）、Bearer（test-token）、API Key（`Apikey: test-key`）
- **协议**：WebSocket 回声（`ws://localhost:9900/ws`）、SSE 流（`/sse`）
