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
- 数据库 schema 只通过 `internal/database/migrations/` 下的 goose 迁移变更；
  同时把新模型加进 `autoMigrate`，历史库的一次性收敛路径依赖它

**前端**

- 不使用 `any`（ESLint 已设为警告，PR 中不应新增）
- 失败路径要给用户反馈：用 `toastError(e, "error.op.xxxFailed")`，
  不要只 `console.error`
- 界面文案一律走 i18n；两种语言的键集合与占位符必须一致（有单测把关）
- 组件文件只放渲染，纯逻辑抽到同目录的 `.ts` 模块，便于单测

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
2. 发版时 [scripts/extract_changelog.py](scripts/extract_changelog.py) 抽出对应
   版本的小节作为 GitHub Release 正文（由 commit 生成的详细清单折叠在后面备查）；
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
