# 变更日志

本文件记录值得使用者关注的变更。发版时的详细条目由
[scripts/generate_changelog.py](scripts/generate_changelog.py) 依据 commit 自动生成，
本文件只保留人工整理的摘要。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增

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
