// 预热 Vite 开发服务器，等它"变热"后再放行 Wails 应用启动。
//
// 背景：慢机器上 `wails3 dev` 的真正问题不是"端口没起来"，而是"冷启动的 Vite 太慢"。
// 首屏加载时 WebView 会并发请求整张模块图，而冷启动的 Vite 正在做依赖预打包
// (dependency optimization) + 首次转换，单个请求可能耗时数秒。Wails 的资源代理
// (assetserver/build_dev.go) 拨号超时被硬编码为 5s，且其 retryTransport 只对
// "connection refused / reset" 重试，**不对 "i/o timeout" 重试**——于是冷启动高并发
// 下超时的请求直接失败，首屏空白，只能手动 location.reload()（那时 Vite 已经热了）。
//
// 仅检查 TCP 端口是不够的：端口一 bind 就能连上，但此时 Vite 还是冷的。
// 本脚本在端口可连后，**主动爬取整张模块图**（跟随转换后代码里的绝对路径 import），
// 把依赖预打包和各模块转换结果都灌进 Vite 缓存。爬完即"热"，应用再打开时全是缓存命中，
// 不会再触发 5s 拨号超时。
//
// 作为 build/config.yml 的 once 步骤运行：仅首次 `wails3 dev` 时执行，热重载时跳过。
// 端口来源：命令行参数 > WAILS_VITE_PORT 环境变量（wails3 dev 注入）> 默认 9245。
import http from "node:http"
import net from "node:net"

const HOST = "127.0.0.1" // 与 Wails 资源代理一致：localhost 强制走 IPv4
const PORT = Number(process.argv[2] || process.env.WAILS_VITE_PORT || 9245)

const OVERALL_BUDGET_MS = 180_000 // 端口等待 + 预热的总时间上限；超了也放行，绝不阻断开发会话
const PORT_RETRY_MS = 250
const CONNECT_TIMEOUT_MS = 1_000
const REQUEST_TIMEOUT_MS = 60_000 // 单个模块的等待上限（冷启动某个重模块转换可能很久）
// Vite 的模块转换是单线程 CPU 密集型，并发过高反而更慢（实测并发 6 比顺序还慢）。
// 用低并发：略微重叠磁盘 I/O，又不制造调度争抢。
const CONCURRENCY = 3
const MAX_MODULES = 1_200 // 爬取模块数上限，兜底防止异常情况下无限膨胀

// 是否递归解析该模块的 import。只深入"应用自身代码 + 虚拟模块"，不钻进 node_modules
// 的原始源码树——那会爆炸成几千个文件、拖慢预热甚至撑爆时间预算。node_modules 的模块
// 仍会被 fetch 预热，只是不跟随它的内部 import；而依赖预打包(optimizer)只要被任一
// /.vite/deps/ 请求触发就会整体完成，所有优化后的依赖随即一起变热。
function shouldRecurse(path) {
  if (path.startsWith("/node_modules/")) return false
  return path.startsWith("/src") || path.startsWith("/bindings") || path.startsWith("/@")
}

const start = Date.now()
const elapsed = () => Date.now() - start
const remaining = () => OVERALL_BUDGET_MS - elapsed()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (msg) => process.stdout.write(`[wait-for-vite] ${msg}\n`)

// 尝试建立一次 TCP 连接，成功即代表 Vite 已监听端口。
function canConnect() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: HOST, port: PORT })
    const finish = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(CONNECT_TIMEOUT_MS)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false)) // ECONNREFUSED 等：端口还没起来
  })
}

// 发一个 GET 请求，返回 { status, body }。走 IPv4，镜像 Wails 的拨号路径。
function get(path) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: HOST, port: PORT, path, family: 4, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        const type = res.headers["content-type"] || ""
        // 只解析文本类响应里的 import；二进制（图片/字体等）取到即算预热，不解析。
        const parseable = /javascript|typescript|css|html|json|plain/i.test(type)
        let body = ""
        res.on("data", (d) => {
          if (parseable && body.length < 2_000_000) body += d
        })
        res.on("end", () => resolve({ status: res.statusCode, body }))
      },
    )
    req.on("timeout", () => {
      req.destroy()
      resolve({ status: "TIMEOUT", body: "" })
    })
    req.on("error", (e) => resolve({ status: e.code || "ERROR", body: "" }))
    req.end()
  })
}

// 从转换后的模块源码里抽出同源绝对路径 import（'/xxx' 但不含 '//'）。
// 覆盖 `import x from "…"`、副作用 `import "…"`、动态 `import("…")`、`export … from "…"`。
function extractLinks(body) {
  const links = new Set()
  const re = /(?:\bfrom|\bimport)\s*\(?\s*["'`]([^"'`]+)["'`]/g
  for (const m of body.matchAll(re)) {
    const spec = m[1]
    if (spec.startsWith("/") && !spec.startsWith("//")) links.add(spec)
  }
  return links
}

async function warm() {
  const seen = new Set()
  const queue = []
  const enqueue = (p) => {
    if (!seen.has(p) && seen.size < MAX_MODULES) {
      seen.add(p)
      queue.push(p)
    }
  }

  // 种子：index.html + 其入口脚本 + Vite 客户端运行时。
  const index = await get("/")
  for (const m of index.body.matchAll(/src=["']([^"']+)["']/g)) {
    if (m[1].startsWith("/")) enqueue(m[1])
  }
  enqueue("/@vite/client")
  enqueue("/src/main.tsx") // 与 index.html 入口一致，兜底
  if (queue.length === 0) return 0 // 拿不到 index.html，放弃预热（仍放行）

  let warmed = 0
  const worker = async () => {
    while (queue.length > 0 && remaining() > 0) {
      const path = queue.shift()
      const res = await get(path)
      warmed++
      if (typeof res.status === "number" && res.body && shouldRecurse(path)) {
        for (const link of extractLinks(res.body)) enqueue(link)
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return warmed
}

// 1) 等端口可连接。
log(`等待 Vite 端口 http://${HOST}:${PORT} ...`)
let connected = false
while (remaining() > 0) {
  if (await canConnect()) {
    connected = true
    break
  }
  await sleep(PORT_RETRY_MS)
}
if (!connected) {
  log(`端口等待超时（${(elapsed() / 1000).toFixed(1)}s），仍继续启动。`)
  process.exit(0)
}

// 2) 预热模块图，直到爬完或用完时间预算。
log(`Vite 端口已就绪（${(elapsed() / 1000).toFixed(1)}s），开始预热模块图 ...`)
const warmed = await warm()
const secs = (elapsed() / 1000).toFixed(1)
if (remaining() > 0) {
  log(`预热完成：${warmed} 个模块，共 ${secs}s，启动应用。`)
} else {
  log(`预热达到时间上限（${secs}s，已热 ${warmed} 个模块），仍继续启动；若首屏空白请在 DevTools 执行 location.reload()。`)
}
process.exit(0)
