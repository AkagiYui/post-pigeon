# PostPigeon

[![Build](https://github.com/AkagiYui/post-pigeon/actions/workflows/build.yaml/badge.svg)](https://github.com/AkagiYui/post-pigeon/actions/workflows/build.yaml)
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

#### Windows 该下哪个

Windows 版依赖系统里的 **WebView2 运行时**（Win11 自带，Win10 多数机器也有）。
但精简版 / Ghost 版系统常把它裁掉，网吧还原卡与无盘环境更是装完一重启就被还原掉。
为此 Windows 有两套产物：

| 场景 | 下载 | 说明 |
| --- | --- | --- |
| 一般情况 | `-installer.exe` 或裸 `.exe` | 体积小，用系统的 WebView2；缺失时安装包会尝试联网补装 |
| 打不开、提示缺少 WebView2；系统是精简版 / Ghost 版；网吧还原卡、无盘、离线内网机 | `-fixedwebview.zip`（绿色免安装）或 `-fixedwebview-installer.exe` | 内核随包分发，不装、不写注册表、不需要管理员权限；代价是体积大得多 |

内置内核版与常规版是**同一个二进制**，区别只在应用目录下有没有 `webview2\` 文件夹：
有就用它，没有就退回系统的那份。所以常规版哪天碰到系统运行时损坏，把这个文件夹拷进去
就能自救，不必重装。

当前实际使用的内核、版本、来源与目录，可以在应用内「设置 → 关于」里查看。

### 从源码构建

环境要求：

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Go | 见 [go.mod](go.mod) | 后端与构建 |
| Node.js | ≥ 24 | 前端构建 |
| pnpm | 见 [frontend/package.json](frontend/package.json) 的 `packageManager` | 前端包管理 |
| Wails CLI | v3 | `go install github.com/wailsapp/wails/v3/cmd/wails3@v3.0.0-beta.13` |

Linux 还需要 `libgtk-4-dev` 与 `libwebkitgtk-6.0-dev`（Ubuntu 24.04+ / Debian 13+）。

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

## 数据与隐私

PostPigeon 没有账号、没有服务端，也不往任何地方上传数据：你的东西全在这台机器上。
设置 →「数据」里可以直接打开数据目录、查看数据库大小、导出或恢复。

数据目录：

| 平台 | 位置 |
| --- | --- |
| macOS | `~/Library/Application Support/com.akagiyui.postpigeon/` |
| Windows | `%AppData%\com.akagiyui.postpigeon\` |
| Linux | `~/.config/com.akagiyui.postpigeon/` |

有几件事值得先知道：

- **数据库文件里的凭据是明文的。** `postpigeon.db` 保存着你填过的一切，包括
  Bearer token、Basic 密码、OAuth 客户端密钥，以及被标记为「秘密」的环境变量——
  「秘密」只决定界面上是否打码，不做加密。**这个文件被拷走，等于这些凭据被拿走。**
  升级前的自动备份（`postpigeon.db.bak-*`）和「导出全部数据」产生的文件同理，
  请当作密码文件保管。
- **导出项目（JSON）会带上环境变量的值**，包括秘密变量。发给同事之前先确认里面
  没有你自己的密钥。
- **请求历史默认脱敏**：凭据类请求头与秘密变量的值不会原样写进历史（设置 →
  「请求与历史」→「历史脱敏」）。关掉之后，历史里会留下完整的 token。
- **诊断信息压缩包不含数据库**，只有版本、平台、体积摘要与最近几天的日志，
  可以放心附在问题反馈里。

### 彻底删除数据

卸载 PostPigeon **不会**删掉上面那个数据目录，这是有意的：重装或换版本时你的项目
还在。真要清干净，先退出应用，再手动删掉数据目录（里面是数据库、自动备份和日志），
最后卸载应用本体：

| 平台 | 卸载方式 |
| --- | --- |
| macOS | 把 `PostPigeon.app` 拖进废纸篓 |
| Windows | 「设置 → 应用」里卸载，或用安装目录下的 uninstaller |
| Linux | 删掉 AppImage 文件，或按当初的安装方式用包管理器卸载 |

删之前想留个念想的话，「设置 → 数据 → 导出全部数据」可以先导出一份完整的数据库
文件，将来用「选择文件恢复」装回来。

## 反馈问题

用着不对劲就开一个 [issue](https://github.com/AkagiYui/post-pigeon/issues/new/choose)，
模板里列了需要提供的信息。最省事的填法是先在**设置 →「数据」→「导出诊断信息」**
生成一个 zip 拖上去——里面有版本、系统、数据库体积和最近几天的日志，不含数据库文件。

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

[MIT](LICENSE)
