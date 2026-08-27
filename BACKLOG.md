# 待优化项

本文件记录**已经发现、但暂时没做**的问题，按优先级排列。它不是路线图，也不承诺
排期——只是把当时的分析结果留住，免得下次重新推一遍。

面向本项目。与项目无关的、这类应用的通用注意点见
[APP-DESIGN-NOTES.md](APP-DESIGN-NOTES.md)。

约定：每条给出**现状**（带代码位置）、**风险**、**建议**、**大致工作量**。做掉之后
移到最后的「已处理」里，留一行结论。

---

## P3 · 附件以 base64 存在库里（同类产品都存路径）

**现状**　文件字段的 value 是 `{"fileName":..,"content":<base64>}`
（[http_service.go](internal/services/http_service.go) 的 `parseFileField`），
整个附件内容存进 `endpoint_body_fields`。Binary 请求体是同一套做法，存在
`endpoints.body_content` 里。一个 10 MB 附件在库里约 13 MB，且跟着接口永久存在。

**同类产品怎么做**（2026-08 在 `tmp/` 下的参考实现里逐个查过）：

| 客户端 | 存法 |
| --- | --- |
| Yaak（Tauri + SQLite，架构最接近本项目） | 存路径。发送时 `tokio::fs` 流式读，靠 metadata 算 content-length，文件不在就报 `File not found`（`crates/yaak-http/src/types.rs` 的 `build_multipart_body`） |
| Insomnia（Electron） | 存路径。`RequestBodyParameter.fileName` 是绝对路径，发送时才读盘 |
| Bruno（文件式集合） | 存路径。`.bru` 里写成 `@file(<path>)` |
| Hoppscotch（浏览器） | 存内容——但它是网页，拿不到路径，别无选择 |

Apifox 本地那份材料（`tmp/apifox/`）只有渲染层的部分 bundle 与设计探测笔记，
不含请求体构造的代码，**无法据此证实它存的是路径**；不过从上面三个开源桌面客户端
看，存路径是这类产品的通行做法。我们现在这套是「网页做法用在桌面应用上」。

**风险**　库体积、备份耗时、导出体积都被附件放大，而且是永久的：压缩数据库只能回收
删除后的空间，存量附件本身不会变小。

**真正的拦路虎不是存储格式，是选择器**：
[BodyEditor.tsx](frontend/src/components/endpoint/BodyEditor.tsx) 用的是
`<input type="file">` + `FileReader.readAsDataURL`，浏览器出于安全根本不给路径——
所以要改存路径，先得把选择器换成 Wails 的原生
`Dialog.OpenFile()`（`DataService` 里已经在用同一套 API）。

**建议**　改成「库里只存路径 + 发送时流式读盘」，但要一并想清楚这几件事：

- **自包含性会丢**：现在导出/备份天然带着附件，改完之后换台机器路径就失效了。
  Yaak 的选择是直接报错。可以考虑「小文件仍内联、大文件存路径」，或者把附件复制进
  数据目录再存相对路径——后者能同时解决体积与自包含。
- 删接口时要清理孤儿附件；
- 导出/恢复要带上附件目录；
- 存量数据要迁移（base64 → 落盘），且迁移得满足降级兼容的约定。

**工作量**　三天起，含选择器替换、迁移与导出格式变更。

## P3 · 第二个实例只提示不聚焦

**现状**　[instancelock](internal/instancelock/instancelock.go) 拦住了第二个实例，
它会弹一句「已经在运行了」然后退出，但**不会把已有窗口叫到前面**。

**风险**　很轻。macOS 上双击图标由 LaunchServices 处理，本来就不会起第二个；
主要是 Windows / Linux 上从快捷方式或终端重复启动时，用户得自己去找窗口。

**建议**　给 `application.Options` 配上 `SingleInstanceOptions`，在
`OnSecondInstanceLaunch` 里把主窗口 Show + Focus。文件锁保留：它挡的是「碰数据库
之前」那一段，Wails 的机制在 `application.New` 里才生效，两者不冲突。

**工作量**　半天（三个平台各验一次）。

---

## P3 · 自己起的 goroutine 没有 recover

**现状**　Wails 会接住 service 方法里的 panic（见下面「顺带确认过」），但我们自己
`go func()` 起的协程不在它的保护范围内：
[updates/manager.go](internal/updates/manager.go) 的延时检查协程没有 recover
（[http_service.go](internal/services/http_service.go) 的两处流式协程有）。

**风险**　低但真实：这类协程里 panic 会直接杀掉整个进程。好在现在崩溃会被运行标记
记下来，堆栈也会写进日志。

**建议**　给长期存活的协程统一加一层 recover + 记日志。

**工作量**　一小时。

---

## 已处理

- **项目导出前确认带不带凭据**（`89028fe`）：项目里确实有凭据时才弹确认，默认不带；
  不带时秘密变量的值与鉴权凭据字段清空，变量名、tokenUrl、clientId、用户名这些配置
  保留，对方导入后自己填。
- **数据库迁移前自动备份**（`a38b6ad`）：`VACUUM INTO` 出
  `postpigeon.db.bak-<时间>-<版本>`，保留最近 3 份；只在确有待应用迁移时做；备份失败
  就不迁移。
- **启动失败弹原生对话框**（`979c858`）：配置 / 日志 / 数据库初始化失败不再是「双击
  没反应」，并告诉用户备份在哪、怎么用。
- **迁移降级兼容性测试**（`a299033`）：`TestMigrationsAreAdditive` 逐版本对比 schema，
  拦下删表删列、以及给已有表加无默认值的 `NOT NULL` 列。
- **迁移准则写进 CONTRIBUTING**（`3c05a56`）：见
  [CONTRIBUTING.md 的「数据库迁移」](CONTRIBUTING.md#数据库迁移)。
- **单实例锁**（`ed30b9a`）：数据目录上的 `instance.lock`（unix flock / Windows 独占
  打开），在 `database.Initialize` 之前拿，第二个实例碰不到数据库。崩溃时由内核释放，
  不留僵尸锁。残留的「聚焦已有窗口」另立一条。
- **数据库体积可见并可压缩**（`e8cb38a`）：「设置 → 数据」显示磁盘占用与可回收空间，
  一键 `VACUUM` + `wal_checkpoint(TRUNCATE)`。
- **数据目录、整库导出与从备份恢复**（`8d82b56`）：三个入口都在「设置 → 数据」。
  恢复分两步——暂存时当场校验，下次启动在打开数据库之前替换，被覆盖的库连同
  `-wal`/`-shm` 一起改名保留。
- **localStorage 加版本与形状校验**（`23b0d85`）：写入带版本信封，读取过类型守卫，
  对不上回退默认值；信封之前的裸值形状对就继续接受。
- **异常退出可被察觉 + 诊断导出**（`be51c13`）：`running.marker` 判定上次是否崩溃，
  `debug.SetCrashOutput` 把进程级崩溃的堆栈写进日志，诊断 zip 含摘要与最近日志、
  不含数据库。
- **日志单文件大小上限**（`7ea0ddc`）：8 MiB 滚动成 `postpigeon-<日期>.N.log`，
  仍保留 30 天。
- **凭据明文的预期管理**（`307cc88`）：README 新增「数据与隐私」，说清楚数据库、备份、
  整库导出都含明文凭据，历史默认脱敏，诊断包不含数据库。剩下的「导出要不要带 secret」
  是个待定的决定，已另立一条。
- **「关于」里给历史版本入口**（`bb910bf`）：`AppInfo` 带上仓库与 releases 地址，
  退回旧版本不必自己翻 GitHub。
- **Wails 侧日志接进应用日志**（`eda6cc5`）：不传 `Options.Logger` 的话，production
  构建下 Wails 用的是写向 `io.Discard` 的默认 logger——被它接住的 service panic
  连堆栈一起蒸发。现在和应用日志写在一起。
- **降级语义坑写进 CHANGELOG**（`49d26d1`）：说明退回 0.0.4 及更早版本时
  「跟随重定向」会看到什么、以及怎么改回来。
- **彻底删除数据的说明**（`09a0ab5`）：README 里写明卸载不会删数据目录、怎么清干净、
  删之前可以先导出。

### 顺带确认过、当前没问题的

- **service 方法里的 panic 不会杀掉应用**。Wails v3 的
  `BoundMethod.Call`（bindings.go）会 recover 并转成前端的调用错误。此前本文件写的
  「其它 service 方法 panic 就是整个应用消失」是错的。真正会杀进程的是我们自己起的
  协程，已另立一条。
- **包管理器 / AppImage 安装的版本已经禁用了自更新**：
  [updates/manager.go](internal/updates/manager.go) 的 `SelfUpdateBlockedReason`
  查 `APPIMAGE` 环境变量，再用「能否在目录里建临时文件」判断可写性，覆盖 deb/rpm 的
  `/usr/bin`、NSIS 的 Program Files 与只读挂载，这些情况下只提示新版本并引导去下载页。
- 索引覆盖完整（[00001_baseline.sql](internal/database/migrations/00001_baseline.sql)），
  大数据量下的列表查询不用担心。
- 资源上限齐全：响应体 32 MB、入库 1 MB、WebSocket 单帧 32 MB。
- 更新链路有 `SHA256SUMS` 校验和「跳过版本」持久化
  （[updates/manager.go](internal/updates/manager.go)），比多数同类规矩。
- 向前跨版本升级（0.0.1 直接跳 0.0.9）是安全的：goose 按序补跑未登记的迁移。
- 向后降级不会执行 goose 的 Down：旧二进制不认识库里更高的版本号，`goose.Up` 空转。
  所以降级等于「旧代码跑在新 schema 上」，靠 `TestMigrationsAreAdditive` 守住。
