package main

// openAPISpec 是本测试服务器的 OpenAPI 3.0 文档，可直接导入 Post Pigeon。
var openAPISpec = []byte(`{
  "openapi": "3.0.3",
  "info": { "title": "Post Pigeon 测试服务器", "version": "1.0.0", "description": "覆盖不同方法、协议、请求与响应的测试接口" },
  "servers": [ { "url": "http://localhost:9900", "description": "本地测试环境" } ],
  "paths": {
    "/api/ping": { "get": { "summary": "健康检查", "responses": { "200": { "description": "pong" } } } },
    "/api/users": {
      "get": { "summary": "用户列表", "responses": { "200": { "description": "列表" } } },
      "post": {
        "summary": "创建用户",
        "requestBody": { "required": true, "content": { "application/json": { "schema": {
          "type": "object", "properties": { "name": { "type": "string", "example": "Alice" }, "email": { "type": "string", "example": "alice@example.com" } } } } } },
        "responses": { "201": { "description": "已创建" } }
      },
      "head": { "summary": "用户数量头", "responses": { "200": { "description": "ok" } } }
    },
    "/api/users/{id}": {
      "get": {
        "summary": "获取单个用户",
        "parameters": [ { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" }, "example": 1 } ],
        "responses": { "200": { "description": "ok" }, "404": { "description": "不存在" } }
      },
      "put": {
        "summary": "更新用户",
        "parameters": [ { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } } ],
        "requestBody": { "content": { "application/json": { "schema": { "type": "object", "properties": { "name": { "type": "string" }, "email": { "type": "string" } } } } } },
        "responses": { "200": { "description": "ok" } }
      },
      "patch": {
        "summary": "部分更新用户",
        "parameters": [ { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } } ],
        "requestBody": { "content": { "application/json": { "schema": { "type": "object" } } } },
        "responses": { "200": { "description": "ok" } }
      },
      "delete": {
        "summary": "删除用户",
        "parameters": [ { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } } ],
        "responses": { "204": { "description": "已删除" } }
      }
    },
    "/api/form": {
      "post": {
        "summary": "表单请求体",
        "requestBody": { "content": { "application/x-www-form-urlencoded": { "schema": {
          "type": "object", "properties": { "username": { "type": "string" }, "age": { "type": "string" } } } } } },
        "responses": { "200": { "description": "ok" } }
      }
    },
    "/api/upload": {
      "post": {
        "summary": "文件上传（multipart）",
        "requestBody": { "content": { "multipart/form-data": { "schema": {
          "type": "object", "properties": { "file": { "type": "string", "format": "binary" }, "note": { "type": "string" } } } } } },
        "responses": { "200": { "description": "ok" } }
      }
    },
    "/api/xml": {
      "post": {
        "summary": "XML 请求体",
        "requestBody": { "content": { "application/xml": { "schema": { "type": "object" }, "example": "<user><name>Alice</name><email>a@b.com</email></user>" } } },
        "responses": { "200": { "description": "ok" } }
      }
    },
    "/api/echo-body": {
      "post": {
        "summary": "纯文本回声",
        "requestBody": { "content": { "text/plain": { "schema": { "type": "string" }, "example": "hello world" } } },
        "responses": { "200": { "description": "ok" } }
      }
    },
    "/api/echo": {
      "get": {
        "summary": "查询参数回声",
        "parameters": [ { "name": "msg", "in": "query", "schema": { "type": "string" }, "example": "hi" }, { "name": "n", "in": "query", "schema": { "type": "integer" } } ],
        "responses": { "200": { "description": "ok" } }
      }
    },
    "/api/status/{code}": {
      "get": {
        "summary": "返回指定状态码",
        "parameters": [ { "name": "code", "in": "path", "required": true, "schema": { "type": "integer" }, "example": 404 } ],
        "responses": { "200": { "description": "ok" } }
      }
    },
    "/api/delay/{seconds}": {
      "get": {
        "summary": "延时响应",
        "parameters": [ { "name": "seconds", "in": "path", "required": true, "schema": { "type": "integer" }, "example": 2 } ],
        "responses": { "200": { "description": "ok" } }
      }
    },
    "/api/headers": { "get": { "summary": "回显请求头", "responses": { "200": { "description": "ok" } } } },
    "/api/cookies/set": { "get": { "summary": "设置 Cookie", "responses": { "200": { "description": "ok" } } } },
    "/api/cookies": { "get": { "summary": "读取 Cookie", "responses": { "200": { "description": "ok" } } } },
    "/api/redirect": { "get": { "summary": "302 重定向", "responses": { "302": { "description": "redirect" } } } },
    "/api/content/json": { "get": { "summary": "JSON 响应", "responses": { "200": { "description": "ok" } } } },
    "/api/content/xml": { "get": { "summary": "XML 响应", "responses": { "200": { "description": "ok" } } } },
    "/api/content/html": { "get": { "summary": "HTML 响应", "responses": { "200": { "description": "ok" } } } },
    "/api/content/text": { "get": { "summary": "纯文本响应", "responses": { "200": { "description": "ok" } } } },
    "/api/content/image": { "get": { "summary": "图片(PNG)响应", "responses": { "200": { "description": "ok" } } } },
    "/api/content/pdf": { "get": { "summary": "PDF 响应", "responses": { "200": { "description": "ok" } } } },
    "/api/auth/basic": { "get": { "summary": "Basic 认证 (admin/secret)", "security": [ { "basicAuth": [] } ], "responses": { "200": { "description": "ok" }, "401": { "description": "未授权" } } } },
    "/api/auth/bearer": { "get": { "summary": "Bearer 认证 (test-token)", "security": [ { "bearerAuth": [] } ], "responses": { "200": { "description": "ok" }, "401": { "description": "未授权" } } } },
    "/api/auth/apikey": { "get": { "summary": "API Key 认证 (Apikey: test-key)", "security": [ { "apiKeyAuth": [] } ], "responses": { "200": { "description": "ok" }, "401": { "description": "未授权" } } } }
  },
  "components": {
    "securitySchemes": {
      "basicAuth": { "type": "http", "scheme": "basic" },
      "bearerAuth": { "type": "http", "scheme": "bearer" },
      "apiKeyAuth": { "type": "apiKey", "in": "header", "name": "Apikey" }
    }
  }
}`)
