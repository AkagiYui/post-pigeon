// 把需要 Node 内建/深依赖的库用 esbuild 打包成自包含 CJS，输出到 ../ (libs/)。
// 每个产物内联自己的 buffer/stream 等垫片，彼此独立，便于在 goja 中 require。
// 运行：npm run bundle
import { build } from "esbuild"
import { polyfillNode } from "esbuild-plugin-polyfill-node"

const outDir = new URL("../", import.meta.url).pathname // internal/scripting/libs/

// 第三方库：直接 module.exports = require(pkg)
const libs = [
  { name: "xml2js", require: "xml2js" },
  { name: "iconv-lite", require: "iconv-lite" },
  { name: "cheerio", require: "cheerio" },
  { name: "postman-collection", require: "postman-collection" },
]
// Node 内建：jspm 垫片是 ESM，需把 default 解出并合并具名导出，供 CJS 风格 require 使用
// 注：url/buffer/process 交给 goja_nodejs（更完整）；crypto 用 crypto-js 替代，均不在此打包。
const builtins = ["events", "string_decoder", "path", "querystring", "punycode", "assert", "util"]

function builtinEntry(pkg) {
  return `
    const m = require(${JSON.stringify(pkg)});
    let d = (m && m.default !== undefined) ? m.default : m;
    if (m && m.default !== undefined && d && typeof d === "object") {
      for (const k in m) { if (k !== "default" && d[k] === undefined) { try { d[k] = m[k]; } catch (e) {} } }
    }
    if (${JSON.stringify(pkg)} === "events" && typeof d === "function" && !d.EventEmitter) { d.EventEmitter = d; }
    module.exports = d;
  `
}

const targets = [
  ...libs.map((l) => ({ name: l.name, entry: `module.exports = require(${JSON.stringify(l.require)})` })),
  ...builtins.map((b) => ({ name: b, entry: builtinEntry(b) })),
]

const results = []
for (const t of targets) {
  try {
    await build({
      stdin: {
        contents: t.entry,
        resolveDir: outDir + "build",
        loader: "js",
      },
      bundle: true,
      platform: "browser",
      format: "cjs",
      target: "es2017",
      outfile: `${outDir}${t.name}.js`,
      plugins: [polyfillNode({ globals: { buffer: true, process: true, global: true } })],
      define: { global: "globalThis" },
      logLevel: "silent",
      legalComments: "none",
    })
    results.push(`OK   ${t.name}`)
  } catch (e) {
    results.push(`FAIL ${t.name}: ${(e.message || String(e)).split("\n")[0]}`)
  }
}
console.log(results.join("\n"))
