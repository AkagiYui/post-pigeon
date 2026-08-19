# 贡献指南

## 开发环境

见 [README 的「从源码构建」](README.md#从源码构建)。装好后：

```bash
wails3 dev     # 开发模式，前端热重载
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

CI 在 [.github/workflows/ci.yaml](.github/workflows/ci.yaml)，打包与发版会先跑它。

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

## 发版

给提交打 `vX.Y.Z` 标签并推送即可：

```bash
git tag v1.2.0
git push origin v1.2.0
```

[release 工作流](.github/workflows/release.yaml) 会跑校验、把版本号写进
`build/config.yml`、构建四个平台的产物，并按 commit 生成变更日志创建 Release。
