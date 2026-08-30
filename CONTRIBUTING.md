# 贡献指南

## 开发环境

见 [README 的「从源码构建」](README.md#从源码构建)。装好后：

```bash
wails3 task setup:hooks   # 克隆后跑一次，启用仓库自带的 git 钩子
wails3 dev                # 开发模式，前端热重载
```

## 提交前必须通过的检查

```bash
wails3 task check
```

它等价于 CI 跑的全部内容：

| 检查 | 命令 |
| --- | --- |
| Go 格式 | `gofmt -l .` |
| Go 静态检查 | `go vet ./...` |
| Go 构建 | `go build ./...` |
| Go 测试（带竞态检测） | `go test -race ./internal/... ./testserver/...` |
| 前端类型 | `pnpm -C frontend typecheck` |
| 前端 Lint | `pnpm -C frontend lint` |
| 前端测试 | `pnpm -C frontend test` |

校验在 [.github/workflows/check.yaml](.github/workflows/check.yaml)，打包与发版会先跑它。

## Commit 规范

采用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <描述>
```

常用 type：`feat`、`fix`、`perf`、`refactor`、`docs`、`style`、`test`、`chore`、`ci`。

- `feat` / `fix` / `perf` / `refactor` / `revert` 会进入发版变更日志
- 只含 `docs:` 或 `style:` 的推送不会触发构建（见 [scripts/check_build.py](scripts/check_build.py)）
- 破坏性变更在 type 后加 `!`，例如 `feat(api)!: 移除 XXX`

## 代码约定

**Go**

- 注释解释「为什么这么做」，而不是复述代码
- 面向用户的错误一律用 `internal/apperr` 的错误码，不要在后端拼中文文案：
  文案的唯一来源是前端 i18n 词条
- 新增错误码时同步补 `frontend/src/i18n/{zh-CN,en}.json` 的 `error.<code>`
- 数据库 schema 只通过 `internal/database/migrations/` 下的 goose 迁移变更，
  且必须满足降级兼容（见下面的[数据库迁移](#数据库迁移)）
- 新增导出 / 分享 / 上报类功能时，先问一句「这会不会把凭据带出去」：数据库、
  自动备份、项目导出 JSON 里都是明文的 token、密码与秘密变量值（详见
  [README 的「数据与隐私」](README.md#数据与隐私)）。诊断信息压缩包因此刻意
  不含数据库，只带摘要与日志

**前端**

- 不使用 `any`（ESLint 已设为警告，PR 中不应新增）
- 失败路径要给用户反馈：用 `toastError(e, "error.op.xxxFailed")`，
  不要只 `console.error`
- 界面文案一律走 i18n；两种语言的键集合与占位符必须一致（有单测把关）
- 组件文件只放渲染，纯逻辑抽到同目录的 `.ts` 模块，便于单测

## 数据库迁移

schema 的唯一事实源是 `internal/database/migrations/` 下的 goose 迁移。新增模型时
同时加进 `autoMigrate`：历史库的一次性收敛路径（`adoptLegacyDB`）依赖它。

除此之外还有一条硬约束：**用户会在版本之间来回跳**。装了新版本用着不顺手退回旧
版本是很常见的用法，而数据库只有一个文件、所有版本共用：

- 向前跨版本升级是安全的。goose 按序补跑所有未登记的迁移，0.0.1 直接跳到 0.0.9
  与逐个版本升上去完全等价。
- 向后降级时 goose **不会**执行 Down。旧二进制根本不认识库里更高的版本号，
  `goose.Up` 直接空转。也就是说降级等于「旧代码跑在新 schema 上」，能不能跑通
  完全取决于迁移是怎么写的。

所以每条迁移都要按「旧版本也得能读能写」来写：

| 想做的事 | 怎么做 |
| --- | --- |
| 加字段 | `ALTER TABLE ... ADD COLUMN`，**必须带默认值**。`NOT NULL` 且无默认值会让旧版本插入失败——它不会带上这一列 |
| 加表 | 直接建。旧版本看不见也用不到，忽略即可 |
| 删字段 / 改名 | 不要直接删。先加新列并双写，等旧版本淘汰（至少隔一个发版）再删。直接删会让旧版本的 `INSERT`/`UPDATE` 报 `no such column` |
| 改字段语义（二态改三态、放宽取值、原地换单位……） | 最危险的一类：不报错，静默改行为。能加新列就加新列；确实要改，就在 CHANGELOG 里写清楚降级回去会看到什么 |

`Down` 脚本照写不误（本地回滚和排错要用），但不要指望它在用户机器上跑过。

写完跑一遍：

```bash
go test ./internal/database/
```

`TestMigrationsAreAdditive` 会逐版本对比 schema，删表删列、或给已有表加了没默认值
的 `NOT NULL` 列都会当场失败。确实要破坏兼容时，改用例的同时必须在 CHANGELOG 里
交代降级后果。

兜底的是备份：确有待应用迁移时，`backupBeforeMigrate` 会先 `VACUUM INTO` 出一份
`postpigeon.db.bak-<时间>-<版本>`（保留最近 3 份），备份做不出来就不迁移。数据库
初始化失败会弹原生对话框，并告诉用户备份在哪、怎么用。

## 测试

- Go：与被测文件同目录的 `_test.go`；涉及 HTTP 的用例请用
  `newTestServer` / `newTestHTTPService` 辅助函数，它们负责按正确顺序释放
  共享连接池与关停服务
- 前端：`*.test.ts(x)`，由 vitest 运行；优先测纯函数与状态逻辑

## 变更日志

[CHANGELOG.md](CHANGELOG.md) 是面向使用者的变更日志的**唯一事实源**，格式遵循
[Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。它有三个消费方，
所以值得认真写：

1. 仓库里直接阅读；
2. 发版时 [scripts/extract_changelog.py](scripts/extract_changelog.py) 生成 GitHub
   Release 正文：预发布版只写本版本，正式版则汇总「上一个正式版 → 本版本」之间
   的全部小节（包括 beta / rc）；由 commit 生成的详细清单折叠在后面备查；
3. 应用内的更新提示——CHANGELOG.md 会作为 Release 资产上传，应用下载全文后按
   「当前版本 → 新版本」的区间截取，这样跨多个版本升级时中间版本的内容也不会丢。

写法：面向使用者而不是开发者，一条一行，不带 commit 哈希；破坏性变更放在最前面。
开发期间条目先记在 `## [未发布]` 下面。

## 发版

1. 准备发版提交：

```bash
wails3 task release:prepare -- 1.2.0
```

它会把 `build/config.yml` 的版本号设为 1.2.0、把 `CHANGELOG.md` 的
`## [未发布]` 定版成 `## [1.2.0] - <今天>` 并在上面新开一个空的「未发布」，
自检通过后提交 `chore(release): 1.2.0`。加 `--no-commit` 可以只改文件自己提交。

2. 打标签并推送：

```bash
git push origin master
git tag v1.2.0
git push origin v1.2.0
```

[release 工作流](.github/workflows/release.yaml) 会校验发版信息、跑完整 CI、
构建四个平台的产物、生成 `SHA256SUMS`，并连同 `CHANGELOG.md` 一起创建 Release。
正式版发布说明与提交清单都以上一个**正式版** tag 为比较基线，不会被中间的
beta / rc tag 截断；预发布版则与上一个语义化版本 tag 比较。

### 版本号必须三处一致

git tag、`build/config.yml` 的 `info.version`、以及构建产物里经 ldflags 注入的
`config.Version`（Taskfile 的 `APP_VERSION` 读的就是 config.yml）——三者对不上的
表现是「装了新版却一直提示有更新」，而且要等产物发出去之后才会被发现。所以有
两道校验，跑的是同一个 [scripts/check_release.py](scripts/check_release.py)：

| 位置 | 触发时机 | 能否绕过 |
| --- | --- | --- |
| `.githooks/pre-push` | 推送 `v*` tag 时 | `--no-verify` 可绕过 |
| release 工作流的第一个 job | tag 推上去之后 | 不能，不通过就不构建 |

校验四项：tag 格式（`v1.2.0` / `v1.2.0-beta.1`）、config.yml 的版本号与 tag
相等、CHANGELOG.md 里有该版本的非空小节、远端还没有同名 tag。

钩子需要先启用一次（`wails3 task setup:hooks`，即
`git config core.hooksPath .githooks`）。它存在 `.git/` 里、不随仓库分发，
网页界面打 tag、换台机器、`--no-verify` 都能绕过，所以 CI 那道才是硬的。

> git 没有 `pre-tag` 钩子——`git tag` 不触发任何钩子——所以拦截点只能放在推送时。
> 反正 tag 推上去才会触发发版工作流，本地留一个打错的 tag 无害，
> `git tag -d v1.2.0` 删掉重来即可。

### 更新产物的命名约束

应用的自动更新只认这个形状的资产（见
[internal/updates/manager.go](internal/updates/manager.go) 的 `assetMatcher`）：

```
PostPigeon-<GOOS>-<GOARCH>[.zip|.tar.gz|.exe]
```

两条硬约束，改打包脚本时别破坏：

- **压缩包里必须恰好一个顶层条目**。updater 替换的是磁盘上的单个目标，归档里
  有多个顶层条目时它无法判断该换哪个，会直接拒绝安装。
- **安装包必须用别的文件名**（`-installer.exe` / `.deb` / `.rpm` / `.AppImage`）。
  拿安装器替换正在运行的程序，等于把应用变成一个安装向导。

macOS 的 `.app` 用 `ditto -c -k --keepParent` 打包：普通 zip 会破坏代码签名，
替换后会被 Gatekeeper 拦下。updater 逐字节替换、**不会重新签名**，所以上传前
`.app` 就必须已经签名并公证。

### macOS 代码签名

**没有 Apple 开发者账号也能发版**：不配任何 secret 时，macOS 产物退回 ad-hoc
签名，其余平台完全不受影响，工作流正常跑完，只在 job 摘要里留一条 warning。
代价是用户下载后双击会看到「已损坏，应移到废纸篓」，得右键打开或
`xattr -dr com.apple.quarantine PostPigeon.app`。

配齐 secret 后自动切换成 Developer ID 签名 + Apple 公证，用户可以直接双击打开。
判据是这一条，三种状态泾渭分明：

```bash
spctl -a -vvv -t exec bin/PostPigeon.app
```

| 输出 | 含义 |
| --- | --- |
| `rejected`（无 source 行） | ad-hoc，未配签名 |
| `rejected` + `source=Unnotarized Developer ID` | 签了但没公证，**仍会被拦** |
| `accepted` + `source=Notarized Developer ID` | 发版可用状态 |

本地自查用 `wails3 task darwin:sign:verify`，它会把上面这条连同
`codesign -dv`、`stapler validate` 一起打出来。

#### 需要配置的 GitHub Secrets

前提是 Apple Developer Program 会员（$99/年，个人账号即可），
证书类型必须是 **Developer ID Application**——不是 Apple Development，
也不是 Mac App Distribution，后两者不能用于 App Store 之外的分发。

| Secret | 从哪来 |
| --- | --- |
| `MACOS_CERTIFICATE` | 钥匙串导出的 `.p12`，`base64 -i cert.p12 \| pbcopy` |
| `MACOS_CERTIFICATE_PASSWORD` | 导出 `.p12` 时设的密码 |
| `APPLE_API_KEY_P8` | App Store Connect API Key 的 `.p8`，同样 base64 |
| `APPLE_API_KEY_ID` | 该 Key 的 Key ID |
| `APPLE_API_ISSUER` | App Store Connect 里的 Issuer ID |

获取步骤：

1. **证书**：developer.apple.com → Certificates → `+` → Developer ID Application
   → 用钥匙串助理生成 CSR 上传 → 下载 `.cer` 双击导入钥匙串 → 在钥匙串里找到它，
   右键「导出」为 `.p12`（会连带私钥，必须设密码）。
2. **公证 Key**：App Store Connect → Users and Access → Integrations → Keys
   → `+` 新建，角色选 Developer → 下载 `.p8`（**只能下载一次**）。
   Key ID 在列表里，Issuer ID 在同一页顶部。

签名身份串不用配 secret：工作流从导入的证书里现取第一个
Developer ID Application 身份。

#### 哪些是秘密，哪些不是

**必须保密**：`.p12` 文件及其密码、`.p8` 文件。前者包含私钥，泄露等于别人能用
你的身份签任意软件；后者能操作你的 App Store Connect 账号。两者都不要提交进仓库。

**不是秘密**：Team ID、Key ID、Issuer ID、签名身份串
（`Developer ID Application: 你的名字 (TEAMID)`）、Bundle ID。这些本来就印在每个
已签名的分发包里，任何人 `codesign -dv` 你的应用都能看到。之所以把 Key ID 和
Issuer ID 也放进 Secrets，只是图省事——放进工作流明文同样没有安全问题。

#### 本地手动签名发版

```bash
export MACOS_SIGN_IDENTITY="Developer ID Application: 你的名字 (TEAMID)"
wails3 package
wails3 task darwin:notarize      # 需要下面的凭据二选一
wails3 task darwin:sign:verify
```

公证凭据本地推荐用钥匙串配置档，配一次就行：

```bash
xcrun notarytool store-credentials "postpigeon-notary" \
  --apple-id you@example.com --team-id TEAMID --password 应用专用密码
export APPLE_KEYCHAIN_PROFILE=postpigeon-notary
```

应用专用密码在 appleid.apple.com → 登录与安全 → App 专用密码 生成，
不是 Apple ID 的登录密码。

#### 改打包流程时的顺序约束

签名之后再动包内任何文件都会让签名失效，而失败信息很隐晦——用户端只报
「已损坏」。所以这个顺序不能乱：

```
拷贝资源 → 注入 Info.plist 本地化 → codesign → notarytool submit → stapler staple → ditto 打包
```

具体来说，[build/darwin/Taskfile.yml](build/darwin/Taskfile.yml) 里
`inject:localizations` 必须排在 `codesign:mac` 之前，
[release.yaml](.github/workflows/release.yaml) 里「公证并钉票据」必须排在
「归档发布产物」之前（staple 是往 `.app` 里写票据，先归档就等于发出没票据的包）。
