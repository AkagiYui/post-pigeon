# 待优化项

本文件记录**已经发现、但暂时没做**的问题，按优先级排列。它不是路线图，也不承诺
排期——只是把当时的分析结果留住，免得下次重新推一遍。

面向本项目。与项目无关的、这类应用的通用注意点见
[APP-DESIGN-NOTES.md](APP-DESIGN-NOTES.md)。

约定：每条给出**现状**（带代码位置）、**风险**、**建议**、**大致工作量**。做掉之后
移到最后的「已处理」里，留一行结论。

---

## P3 · 大附件仍会整个读进内存

**现状**　附件改存路径之后，发送时仍是 `os.ReadFile` 读进内存再拼进 multipart 缓冲区
（[http_service.go](internal/services/http_service.go)）。

**风险**　几百 MB 的附件会把内存顶起来。此前存 base64 时更糟（库里存一份、内存里两份），
所以这不是新问题，只是没顺手解决。

**建议**　照 Yaak 的做法改成流式：把各段拼成 `io.MultiReader`，文件段惰性打开，
content-length 用 `os.Stat` 的大小算，`req.GetBody` 重新构造一份 reader 供重定向重放。
需要手写 multipart 分隔与 Content-Disposition 转义（Go 标准库的 `multipart.Writer`
只能往 buffer 里写）。

**工作量**　一天。

---

## 已处理

- **项目导出前确认带不带凭据**（`fc73a64`）：项目里确实有凭据时才弹确认，默认不带；
  不带时秘密变量的值与鉴权凭据字段清空，变量名、tokenUrl、clientId、用户名这些配置
  保留，对方导入后自己填。
- **第二个实例会把已有窗口叫到前面**（`10e72d7`）：文件锁照旧挡住数据（它在
  `database.Initialize` 之前就位），再叠一层 Wails 的单实例——第二个进程用一个最小的
  application.New 把消息发给第一个实例，第一个实例 Show + Focus 主窗口。通知不成功时
  退回原来的提示对话框。
- **后台协程加 panic 兜底**（`b3618bc`）：新增 `internal/safego`，`Go` / `Run` /
  `Recover` 三个入口，panic 记日志（含堆栈）而不是杀掉进程。WebSocket 读写、流式响应
  推送、脚本发请求、更新检查、历史清理、入库 worker 全部接上。
- **附件改存路径**（`__HASH__`）：文件字段与 Binary 请求体的 value 改成
  `{fileName, path}`，发送时才读盘；选择器换成 Wails 原生对话框（浏览器的
  `<input type="file">` 拿不到路径）。历史数据里内联的 base64 仍然认，也不会因为
  打开老接口按下保存而丢失；文件被移走时报 `http.file_missing`。
  代价是不再自包含：换台机器路径就失效——这是明确接受的取舍。
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
