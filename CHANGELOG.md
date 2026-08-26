# 变更日志

本文件是面向使用者的变更日志的唯一事实源：发版时
[scripts/extract_changelog.py](scripts/extract_changelog.py) 会抽出对应版本的小节
作为 GitHub Release 正文，应用内的更新提示也读它（详见
[CONTRIBUTING.md](CONTRIBUTING.md#变更日志)）。由 commit 生成的详细清单折叠在
Release 正文后面备查。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

## [0.0.3] - 2026-08-26

### 变更

- 本版本不包含面向使用者的功能变更，应用代码与 0.0.2 相同。改动集中在 CI：
  构建与发布流水线整体提速三到四成，其中 Linux 打包从 6 分 38 秒降到 3 分 06 秒
  （Go 构建缓存改为按负载分键、并随 go.sum 滚动更新），发版流程本身也借这一版
  做一次实跑验证

## [0.0.2] - 2026-08-26

### 变更

- 「关于」里的构建时间补上时区，如 `2026/08/26 15:52:59 GMT+8`。构建时间由 CI
  以 UTC 记录、展示时转成本地时区，不标时区就没法判断它到底是哪儿的时间

## [0.0.1] - 2026-08-26

### 新增

- **应用内自动更新**：从 GitHub Releases 检查、下载、校验并原地安装新版本，
  重启后生效。默认每 6 小时后台检查一次，只检查不自动下载，是否更新由用户决定；
  可关闭自动检查、切换到预发布通道、跳过指定版本。下载完成后按发布产物附带的
  `SHA256SUMS` 校验摘要，不匹配则拒绝安装。
  包管理器安装的副本（deb/rpm）与 AppImage 不做原地替换，只提示新版本并引导到
  下载页；开发构建不参与更新
- **跨版本更新说明**：跨多个版本升级时，更新面板会列出当前版本到新版本之间
  每一个版本的变更内容，而不只是最新一版。设置里也能查看完整的历史更新日志
- **集合运行器**：按模块或文件夹批量运行接口，支持多轮、请求间隔、失败即停；
  实时进度与断言汇总，报告可导出 Markdown / JSON
- **Cookie 管理**：按项目持久化 Cookie，登录态自动带到后续请求；
  项目设置内可查看、手工增删、清理过期与一键清空
- **cURL 双向互转**：从 cURL 命令新建请求（兼容浏览器「Copy as cURL」），
  以及把当前请求复制为可直接执行的 cURL
- **Postman Collection v2.x 导入**与 **OpenAPI 3.1 导出**
- **GraphQL 请求体**：查询与变量分栏编辑，发送时组装为标准的
  GraphQL over HTTP JSON；cURL / OpenAPI 导出与 Postman 导入同步支持
- **TLS 设置**（接口 → 项目 → 全局三级）：跳过证书校验、自定义 CA、
  客户端证书（双向 TLS）、最低 TLS 版本
- **Digest 与 OAuth 2.0 认证**（client_credentials / password 授权，令牌自动缓存）
- **请求取消**：进行中的请求可随时中断，不必等到超时
- **限额与保留策略**：响应体上限、入库体积上限、WebSocket 单帧上限，
  以及请求历史的保留天数与条数上限
- **全局轻提示与错误边界**：所有失败路径都有可见反馈，渲染异常不再白屏
- 响应体可另存为文件；二进制响应按原始字节写出

### 变更

- 后端错误改为「错误码 + 参数」的结构化形式，文案由前端 i18n 渲染，
  英文界面不再出现中文错误
- 请求历史默认对 Authorization / Cookie / API Key 请求头与秘密变量值脱敏
- 窗口状态重置新增 `POSTPIGEON_RESET_WINDOW=1` 与 `--reset-window` 两种方式
  （Linux/Wayland 下按 Shift 无效）
- 发版流程新增版本号一致性校验：`build/config.yml` 的版本号现在提交进仓库并与
  git tag 保持一致，由 `.githooks/pre-push`（本地）与 release 工作流的第一个
  job（CI，硬性）两处校验，对不上就不构建。新增
  `wails3 task release:prepare -- 1.2.0` 一键对齐版本号与变更日志并提交
- 发布产物改用 `PostPigeon-<平台>-<架构>` 命名，压缩包只含单个顶层条目
  （macOS 为 `.app` 的 zip、Linux 为二进制的 tar.gz、Windows 为单个 exe），
  这是自动更新能原地替换的前提；NSIS 安装包、deb/rpm/AppImage 改用独立文件名，
  仅作首次安装渠道。Release 新增 `SHA256SUMS` 与 `CHANGELOG.md` 两个资产
- 升级到 Wails v3.0.0-beta.13。Linux 桌面栈随上游从 GTK3/WebKit2GTK 4.1
  切到 GTK4/WebKitGTK 6.0（GTK3 在上游 v3.1 会移除），运行时依赖改为
  `libgtk-4-1` 与 `libwebkitgtk-6.0-4`，最低发行版要求抬到
  Ubuntu 24.04 / Debian 13；macOS 最低版本由 10.15 抬到 12.0

### 修复

- HTTP 连接现在可跨请求复用，并正确协商 HTTP/2（此前每次请求都新建
  Transport，连接从不复用且始终退回 HTTP/1.1）
- 同一接口开多个流式标签页时，先开的流不再被后开的覆盖而无法停止
- 新建接口时不再丢失类型、状态、标签、描述与前后置脚本
- 端点自带的脚本在没有配置「操作」时不再被忽略
- 下拉框中值为空字符串的选项（「无」「默认」等）现在可以正常选中与显示
- 修复应用初始化与全屏状态读取的未捕获 Promise 拒绝
- WebSocket 二进制帧不再被错误地按文本解码
- macOS 的 platform 包补上 framework 链接声明，此前无法单独构建与测试

### 安全

- WebSocket 单帧大小恢复为可配上限（此前完全不限，超大帧可打满内存）
- 响应体读取受限额约束，不再把任意大小的响应整个读进内存并写入数据库
