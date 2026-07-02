# 脚本内置库（vendored JS libraries）

本目录存放前置/后置脚本运行时(goja + 事件循环)内置的 JavaScript 库,以及唯一事实来源 `manifest.json`。

脚本跑在**沙箱**里,运行时**没有网络、没有 npm/node_modules**,因此库代码必须在编译期通过 `//go:embed` 进入二进制。这与 Postman/Apifox/k6 的做法一致——预置一批固定、精选的库。目标是对齐 Apifox 的 [js-libraries](https://docs.apifox.com/js-libraries) 清单。

## 目录结构

- `*.js` —— 各库产物,通过 `require('<name>')` 加载。分两类:
  - **单文件 UMD**(直接下载):lodash、crypto-js、chai、moment、ajv、tv4、mockjs、jsrsasign。
  - **esbuild 打包**(带 Node 内建垫片):xml2js、iconv-lite、cheerio、postman-collection,以及 Node 内建 `events`/`string_decoder`/`path`/`querystring`/`punycode`/`assert`/`util`。
- `manifest.json` —— **唯一事实来源**:名称、版本、`require` 名、类型、来源、许可证、`sha256`、用法。
  - 后端 `scripting.Libraries()` / `HTTPService.ListScriptLibraries` 解析它,前端「脚本」编辑器据此展示。
  - 测试 `TestLibrariesIntegrity` 重算 embed 文件 sha256 与清单比对;`TestLibrariesSmoke` 逐个 `require` 并调用核心 API 验证在 goja 中可用。
- `build/` —— esbuild 打包工作区(`package.json` 锁定版本、`build.mjs` 打包脚本)。`node_modules/` 不提交。
- 由 Go 原生/goja_nodejs 提供、无对应文件的模块:`uuid`、`atob`、`btoa`(Go)、`url`、`buffer`、`process`(goja_nodejs)。

`manifest.json` 里 `kind`:`embed`(有 file+sha256)/`native`(Go 或 goja_nodejs 实现)。

## 更新已有库版本

- **单文件 UMD 库**(如 lodash):
  ```bash
  cd internal/scripting/libs
  curl -sSL -o lodash.js https://cdn.jsdelivr.net/npm/lodash@<新版本>/lodash.min.js
  # 去掉 sourceMappingURL 注释（goja require 会尝试加载 .map 而失败）
  perl -0pi -e 's{//[#@]\s*sourceMappingURL=\S+\s*$}{}mg' lodash.js
  shasum -a 256 lodash.js   # 更新 manifest.json 的 version/source/sha256
  ```
- **esbuild 打包库/Node 内建**(如 cheerio):在 `build/package.json` 改版本 → `cd build && npm install && npm run bundle` → 回到 libs/ 执行上面的 perl 去 sourcemap → 更新 manifest sha256。

然后:
```bash
go test ./internal/scripting -run 'TestLibrariesIntegrity|TestLibrariesSmoke'
go test ./internal/scripting
```

## 新增一个库

1. 判断类型:有干净单文件 UMD 就直接下载;否则(依赖 Node 内建/多文件)加进 `build/package.json` 并在 `build/build.mjs` 的 `libs`(第三方)或 `builtins`(Node 内建)数组里加一项,`npm run bundle`。
2. 去掉 sourceMappingURL 注释,`shasum -a 256` 计算校验值。
3. 在 `manifest.json` `libraries` 加一条(embed 需 file+sha256;native 无)。带子路径的名字(如 `csv-parse/lib/sync`)在 `scripting.go` 的 `moduleAliases` 里加别名映射。
4. 在 `libs_smoke_test.go` 加一个用例(require + 调核心 API),运行 `go test ./internal/scripting`。若在 goja 下加载失败,则**不要**纳入清单——记为已知限制。
5. 前端库列表由清单驱动,自动更新,无需改前端。

## 已知不支持(goja 运行时限制)

以下 Apifox 清单中的库经验证在 goja 下**无法可靠运行**,暂未纳入:
- **csv-parse**(`csv-parse/lib/sync`)—— 旧版依赖的 jspm 垫片在 goja 下抛 `Cannot convert undefined or null to object`。
- **Node `stream`(独立 require)**—— 同上 jspm 垫片问题;但依赖它的库(xml2js/cheerio 等)已各自内联可用副本,功能不受影响。
- **Node `crypto`** —— jspm 浏览器垫片不含 `createHash` 等;请改用 `crypto-js`。

## 许可证

内置库均为宽松许可(MIT / BSD-3-Clause / Apache-2.0 / Public Domain),可随应用分发。新增库请在 `manifest.json` 的 `license` 如实记录。
