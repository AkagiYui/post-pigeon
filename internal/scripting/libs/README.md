# 脚本内置库（vendored JS libraries）

本目录存放前置/后置脚本运行时(goja)内置的 JavaScript 库,以及唯一事实来源 `manifest.json`。

脚本跑在**沙箱**里,运行时**没有网络、没有 npm/node_modules**,因此库代码必须在编译期通过 `//go:embed` 进入二进制。这与 Postman/Apifox/k6 的做法一致——预置一批固定、精选的库。

## 文件说明

- `*.js` —— 各库的 UMD/浏览器构建产物,通过 `require('<name>')` 加载。
- `manifest.json` —— **唯一事实来源**:记录每个库的名称、版本、`require` 名、类型(embed/native/global)、来源 URL、许可证、`sha256`、说明。
  - 后端 `HTTPService.ListScriptLibraries` 解析它并返回给前端「脚本」编辑器展示。
  - 测试 `TestLibrariesIntegrity` 会重算每个 embed 文件的 sha256 并与清单比对,不一致即失败。
- `README.md` —— 本文件。

> `manifest.json` 里 `kind` 的含义:
> - `embed` —— 纯 JS 库,`go:embed` 到二进制,经 `require()` 加载。
> - `native` —— 由 Go 原生实现的模块(如 `uuid`),经 `require()` 加载。
> - `global` —— 直接注入的全局函数(如 `atob`/`btoa`),无需 `require`。

## 如何更新已有库的版本

以把 lodash 升到 `4.17.22` 为例:

1. 下载对应版本的 UMD/min 构建,覆盖同名文件:
   ```bash
   cd internal/scripting/libs
   curl -sSL -o lodash.js https://cdn.jsdelivr.net/npm/lodash@4.17.22/lodash.min.js
   ```
2. 重新计算 sha256:
   ```bash
   shasum -a 256 lodash.js
   ```
3. 在 `manifest.json` 中更新该库的 `version`、`source`、`sha256`。
4. 校验一致性并跑测试:
   ```bash
   go test ./internal/scripting -run TestLibrariesIntegrity
   go test ./internal/scripting
   ```
5. 若该库的 API 有破坏性变化,补充/调整 `scripting_test.go` 与 `apifox_corpus_test.go` 中的用例。

## 如何新增一个库

以新增 `<name>`(纯 JS 库)为例:

1. 下载其 UMD/浏览器单文件构建到本目录:
   ```bash
   curl -sSL -o <name>.js https://cdn.jsdelivr.net/npm/<name>@<version>/dist/<name>.min.js
   ```
   要点:
   - 必须是**自包含的 UMD/浏览器构建**(能在无 Node 环境运行,不 `require` 其它 npm 包)。
   - 优先选官方压缩版;确认 `module.exports`/UMD 能正常导出。
2. 计算 sha256(`shasum -a 256 <name>.js`),在 `manifest.json` 的 `libraries` 数组里新增一条 `kind: "embed"` 记录(name/version/require/usage/license/source/file/sha256/description)。
3. `loadModule` 会按文件名自动解析,无需改 Go 代码即可 `require('<name>')`。
4. 新增一个测试(在 `scripting_test.go`)确认可加载并调用其核心 API,然后:
   ```bash
   go test ./internal/scripting
   ```
5. 前端「脚本」编辑器的可用库列表由清单驱动,会自动出现,无需改前端。

### 若改为 Go 原生模块(kind: native)

适合 API 小、安全敏感的能力(哈希、编码、UUID 等)。在 `scripting.go` 的 `registerNativeModules` 里注册,并在 `manifest.json` 加一条 `kind: "native"` 记录(无 `file`/`sha256`)。

## 许可证

当前内置库均为 MIT(uuid 为 BSD-3-Clause),可放心分发。新增库时请在 `manifest.json` 的 `license` 字段如实记录,并确认许可证允许随应用分发。

## 备注:更稳妥的供应链方案(可选)

当前为「手动下载 + 提交 vendored 文件 + sha256 校验」,构建完全离线可复现。若内置库增多,可考虑改为:把这些库声明为锁定版本的 npm `devDependencies`,由 `pnpm-lock.yaml` 提供版本锁定与完整性哈希,再用构建步骤把 `node_modules` 中的 UMD 复制到本目录。**切勿**改成「构建时去 CDN 现拉」——会引入网络依赖、供应链风险并破坏可复现性。
