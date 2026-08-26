# 待优化项

本文件记录**已经发现、但暂时没做**的问题，按优先级排列。它不是路线图，也不承诺
排期——只是把当时的分析结果留住，免得下次重新推一遍。

面向本项目。与项目无关的、这类应用的通用注意点见
[APP-DESIGN-NOTES.md](APP-DESIGN-NOTES.md)。

约定：每条给出**现状**（带代码位置）、**风险**、**建议**、**大致工作量**。做掉之后
移到最后的「已处理」里，留一行结论。

---

## P0 · 两个实例可以同时打开同一个数据库

**现状**　[main.go](main.go) 里 `application.Options` 没有配 `SingleInstance`
（Wails v3 beta.13 原生支持 `SingleInstanceOptions`）。双击两次、或从终端再起一个，
就是两个进程同时操作同一个 `postpigeon.db`。

**风险**　WAL + `busy_timeout(5000)` 让它**不会立刻报错**，所以问题是静默的：

- `window.state`、settings、cookie 互相覆盖，后关的那个赢；
- 自动更新替换二进制时另一个实例还在跑；
- 两个进程会同时跑迁移与迁移前备份。

**建议**　加单实例锁。注意顺序：Wails 的单实例检查在 `application.New` 里，而
`database.Initialize` 在它**之前**——直接加 `SingleInstance` 并不能阻止第二个实例
先跑一遍迁移。要么在 `Initialize` 之前自己在数据目录上拿一个文件锁，要么把
`Initialize` 挪到 `application.New` 之后。

**工作量**　半天（含各平台验证）。

---

## P1 · 数据库只增不减

**现状**

- 历史清理（[request_history_service.go](internal/services/request_history_service.go)）
  只 `DELETE`。SQLite 默认 `auto_vacuum=NONE`，全库也没有任何地方调过 `VACUUM`，
  **删完文件大小一点不回落**。
- form-data 的文件字段是 **base64 存进库**的
  （[http_service.go](internal/services/http_service.go) 的 `parseFileField`，
  约定 `{"fileName":..,"content":<base64>}`），一个 10 MB 附件在库里约 13 MB，
  且跟着接口永久存在。

**风险**　用久了就是「我明明清了历史，怎么还是几百 MB」。备份、同步、导出都跟着变慢。

**建议**　设置里显示数据库大小 + 一个「压缩数据库」按钮（`VACUUM`）。或者建库时开
`auto_vacuum=INCREMENTAL` 再定期 `incremental_vacuum`——注意这个只能在建库时或
`VACUUM` 时改，对存量库要走一次全量 `VACUUM`。附件是否该改成外部文件 + 引用，可以
再单独评估。

**工作量**　按钮版一天以内；附件外置是另一个话题。

---

## P1 · 用户拿不到自己的数据

**现状**

- 全库只有一个文件（`<UserConfigDir>/com.akagiyui.postpigeon/postpigeon.db`），
  界面里**没有任何入口**指向它。
- 导入导出只到模块粒度（OpenAPI / Postman），没有「导出全部数据」。
- 迁移前自动备份已经在做了，但用户既看不见也不知道怎么用——只有启动失败的对话框里
  提了一句。

**风险**　换电脑、重装、想手动备份，都得让用户自己去 Finder / 资源管理器里翻。出事
的时候没有自救路径，只能来问作者。

**建议**　设置里加三个入口：「打开数据目录」「导出全部数据」「从备份恢复」。第三个
可以就是列出 `postpigeon.db.bak-*` 让用户选一份，确认后替换并重启。

**工作量**　一到两天，收益/成本比最高的一项。

---

## P1 · localStorage 是第二个「数据库」，但没有任何版本管理

**现状**　[stores/app.ts](frontend/src/stores/app.ts) 的 `loadFromStorage`：

```ts
return JSON.parse(raw) as T
```

`as T` 是断言不是校验。键没有版本号，也没有形状校验。

**风险**　跨版本改了结构（比如 `openProjectIds` 从 `string[]` 变成对象数组），旧数据
会被当成新类型一路用下去，然后在某个组件里炸掉。这和数据库降级**是同一个问题**：
状态跨版本存活，而读它的代码变了。虽然有
[AppErrorBoundary](frontend/src/components/AppErrorBoundary.tsx)，但 store 是模块
初始化时读的，抛在边界之前就是白屏。

**建议**　每个键存成 `{ v: 1, data: ... }`，读时校验版本与基本形状，对不上就回退默认
值（而不是抛错）。比后端那套 goose 机制简单得多，几十行的事。

**工作量**　半天。

---

## P2 · 你永远看不到用户的崩溃

**现状**　`recover()` 只有两处（[http_service.go](internal/services/http_service.go)
的请求执行路径、[scripting.go](internal/scripting/scripting.go) 的脚本执行）。其它
service 方法 panic 就是整个应用消失。也没有「上次异常退出」的检测。

**风险**　用户看到的是「用着用着突然没了」，反馈给你的信息量为零。

**建议**

- 启动时写 `running.lock`、正常退出删掉；下次启动发现它还在就提示「上次异常退出，
  日志在这里 [打开]」。
- 加一个「导出诊断信息」：日志 + 版本 + 构建哈希 + 数据库大小，脱敏后打成 zip。
  用户反馈问题的质量会完全不一样。

**工作量**　一天。

---

## P2 · 日志按天切，但没有大小上限

**现状**　[logger.go](internal/logger/logger.go) 每天一个文件、保留 30 天，单个文件
不封顶。

**风险**　集合运行器跑几千个请求、或者流式响应刷屏，单日日志可以很大。

**建议**　加单文件大小上限，超了滚到 `-1`、`-2`。

**工作量**　两小时。

---

## P2 · 数据库文件即凭据

**现状**　`IsSecret`（[environment.go](internal/models/environment.go)）按注释只是
**前端显示成密码**，库里是明文；接口上的 Bearer token、Basic 密码、OAuth
`ClientSecret` 同样明文。历史记录有 `MaskSensitive` 兜底，但那只管历史。

**风险**　数据库文件被拷走 = 凭据泄漏。

**判断**　同类工具（Postman、Insomnia 早期）都是这样，现阶段**不建议**上系统钥匙串
——那会带来跨平台一致性、导出、备份恢复一连串新问题。但这是个**预期管理**问题：
README / 文档里要明说，并且想清楚导出与分享功能要不要带上 secret 的值。

**工作量**　文档半小时；真要做钥匙串是另一个量级。

---

## P2 · 版本降级的已知语义坑

**现状**　00006 迁移把 `endpoints.follow_redirects` 从二态改成三态（历史行的 `1`
收敛为 `NULL`）。schema 没变，所以
`TestMigrationsAreAdditive` 抓不到——它只看 schema。

**风险**　0.0.5 发布后降级回 0.0.4：旧模型是 `bool`，读到 `NULL` 得到 `false`，
原本跟随重定向的接口显示成关闭；在旧版本里编辑保存一次，就把「继承」固化成
「显式关闭」，回到新版本也回不来了。

**建议**　已发布版本之间不受影响（现有四个 tag 的迁移集完全相同），所以这条只是
**待沟通**：0.0.5 的 CHANGELOG 里明写一句「降级回旧版本会看到什么」。以后避免这类
改动，见 [CONTRIBUTING.md 的「数据库迁移」](CONTRIBUTING.md#数据库迁移)。

**工作量**　写一句话。

---

## P3 · 零散项

- **包管理器安装的版本要不要禁用自更新**：AppImage / Homebrew / 未来的 winget 装的
  版本，自更新会和包管理器打架。
- **「关于」里给历史版本下载链接**：既然用户会退版本，比让他们自己翻 GitHub Release
  友好。
- **卸载不清数据是对的**，但应该在文档里说清楚数据在哪、怎么彻底删掉。

---

## 已处理

- **数据库迁移前自动备份**（`a38b6ad`）：`VACUUM INTO` 出
  `postpigeon.db.bak-<时间>-<版本>`，保留最近 3 份；只在确有待应用迁移时做；备份失败
  就不迁移。
- **启动失败弹原生对话框**（`979c858`）：配置 / 日志 / 数据库初始化失败不再是「双击
  没反应」，并告诉用户备份在哪、怎么用。
- **迁移降级兼容性测试**（`a299033`）：`TestMigrationsAreAdditive` 逐版本对比 schema，
  拦下删表删列、以及给已有表加无默认值的 `NOT NULL` 列。
- **迁移准则写进 CONTRIBUTING**（`3c05a56`）：见
  [CONTRIBUTING.md 的「数据库迁移」](CONTRIBUTING.md#数据库迁移)。

### 顺带确认过、当前没问题的

- 索引覆盖完整（[00001_baseline.sql](internal/database/migrations/00001_baseline.sql)），
  大数据量下的列表查询不用担心。
- 资源上限齐全：响应体 32 MB、入库 1 MB、WebSocket 单帧 32 MB。
- 更新链路有 `SHA256SUMS` 校验和「跳过版本」持久化
  （[updates/manager.go](internal/updates/manager.go)），比多数同类规矩。
- 向前跨版本升级（0.0.1 直接跳 0.0.9）是安全的：goose 按序补跑未登记的迁移。
