// 临时调试用：捕获 Solid 的「computations/cleanups created outside a createRoot or render」
// 警告的调用栈，经 Vite HMR 通道回传给开发服务器，落盘到 frontend/owner-warn.log。
// 生产构建下 import.meta.env.DEV 为常量 false，整块被摇掉。
if (import.meta.env.DEV && import.meta.hot) {
  const hot = import.meta.hot
  const original = console.warn.bind(console)
  let seq = 0
  console.warn = (...args: unknown[]) => {
    original(...args)
    const msg = String(args[0] ?? "")
    if (msg.includes("createRoot") && (msg.includes("never be disposed") || msg.includes("never be run"))) {
      hot.send("owner-warn", { seq: seq++, msg, stack: new Error("owner-warn").stack ?? "(no stack)" })
    }
  }
}
