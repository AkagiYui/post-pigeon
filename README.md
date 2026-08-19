# PostPigeon

[![Build](https://github.com/AkagiYui/post-pigeon/actions/workflows/build.yaml/badge.svg)](https://github.com/AkagiYui/post-pigeon/actions/workflows/build.yaml)
[![CI](https://github.com/AkagiYui/post-pigeon/actions/workflows/ci.yaml/badge.svg)](https://github.com/AkagiYui/post-pigeon/actions/workflows/ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

PostPigeon 是一个基于 [Wails 3](https://v3.wails.io/) 构建的桌面 API 调试工具：
Go 负责网络与数据，SolidJS 负责界面，全部数据存在本地 SQLite，不联网、不登录。

## 功能

**请求**

- HTTP：全部方法、JSON / XML / 纯文本 / 表单 / multipart / 二进制请求体
- 流式响应：`text/event-stream` 自动转为实时事件流展示，可随时停止
- WebSocket：长连接存活于 Go 侧，切换标签页不断线；支持二进制帧与心跳保活
- 请求可中途取消；响应体大小、入库体积、WebSocket 帧大小均可配限额
- 计时分解：准备 / DNS / TCP / TLS / 等待 / 下载，连接在同配置下复用

**组织**

- 项目 → 模块 → 文件夹 → 接口 四级结构，支持拖拽排序与移动
- 环境变量、项目全局变量、脚本库；`{{变量}}` 占位符在任意字段中生效
- 模块与文件夹可设默认认证、自动参数、前置/后置操作，接口按层级继承

**脚本**

- Postman / Apifox 风格的 `pm.*` 运行时（goja + 事件循环）
- 完整的 `pm.test` / chai 断言、`pm.sendRequest`、变量作用域、`setTimeout`
- 内置 20+ JS 库（lodash、crypto-js、cheerio、jsrsasign、ajv、mockjs…）

**集合运行**

- 按模块或文件夹批量运行，支持多轮、请求间隔、失败即停
- 实时进度 + 断言汇总，报告可导出 Markdown / JSON

**互通**

- 导入：OpenAPI 3.x / Swagger 2.0、Postman Collection v2.x、Apifox、cURL
- 导出：OpenAPI 3.1、项目 JSON、cURL 命令、响应体另存

**网络与安全**

- 代理与 TLS 均为「接口 → 项目 → 全局」三级设置
- TLS 支持跳过校验、自定义 CA、客户端证书（双向 TLS）、最低版本
- 认证：Basic、Bearer、API Key、Digest、OAuth 2.0（client_credentials / password）
- Cookie 按项目持久化，登录态自动带到后续请求
- 请求历史默认对 Authorization / Cookie / 秘密变量脱敏

## 安装

### 下载预构建版本

前往 [Actions](https://github.com/AkagiYui/post-pigeon/actions/workflows/build.yaml) 页面，
在最新的工作流运行记录中下载对应平台的构建产物（macOS arm64/x64、Windows x64、Linux x64）。

### 从源码构建

环境要求：

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Go | 见 [go.mod](go.mod) | 后端与构建 |
| Node.js | ≥ 24 | 前端构建 |
| pnpm | 见 [frontend/package.json](frontend/package.json) 的 `packageManager` | 前端包管理 |
| Wails CLI | v3 | `go install github.com/wailsapp/wails/v3/cmd/wails3@latest` |

Linux 还需要 `libgtk-3-dev` 与 `libwebkit2gtk-4.1-dev`。

```bash
git clone https://github.com/AkagiYui/post-pigeon.git
cd post-pigeon
wails3 build          # 产物在 bin/
```

## 开发

```bash
wails3 dev            # 启动开发模式（自动起 Vite 并热重载）
```

常用任务（[Taskfile.yml](Taskfile.yml)）：

```bash
wails3 task check          # 跑一遍 CI 的全部校验
wails3 task check:go       # gofmt + vet + build + race 测试
wails3 task check:frontend # 类型检查 + ESLint + 前端单测
wails3 task test           # 只跑单元测试
wails3 task package        # 打包安装程序
```

### 目录结构

```
main.go                     应用入口：服务注册、菜单、窗口
internal/
  apperr/                   结构化错误（错误码 + 参数），文案由前端 i18n 渲染
  config/                   数据目录与构建信息
  database/                 SQLite 初始化与 goose 迁移
  logger/                   日志与轮转
  models/                   数据模型（GORM）
  platform/                 平台相关工具
  scripting/                pm.* 脚本运行时与内置 JS 库
  services/                 全部业务服务，也是暴露给前端的绑定层
frontend/src/
  components/               UI 组件（ui/ 为基础组件）
  routes/                   TanStack Router 路由
  stores/                   全局状态（含 toast）
  lib/                      纯函数工具
  i18n/                     中英文词条
testserver/                 覆盖各种响应形态的本地测试服务器
```

### 测试服务器

仓库自带一个覆盖各种响应形态的测试服务器，用于自测：

```bash
go run ./testserver         # 默认监听 :9900
```

详见 [testserver/README.md](testserver/README.md)。

### 窗口状态重置

窗口位置和大小会被记住。若窗口跑到屏幕外，用下面任一方式回到默认布局：

- 启动时按住 <kbd>Shift</kbd>（macOS / Windows）
- 设置环境变量 `POSTPIGEON_RESET_WINDOW=1`
- 启动时带上 `--reset-window` 参数

后两种与桌面环境无关，是 Linux（尤其是 Wayland）下的推荐方式。

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

[MIT](LICENSE)
