// Ark UI Solid 的 asChild 适配助手
//
// Ark UI Solid 的 asChild 运行时会传入一个「合并 props」函数：调用它并传入你自己的
// props，即可得到与 Ark 行为 props（事件、aria、data-* 等）合并后的结果，展开到自定义
// 元素上，从而用任意元素替换 Ark 默认渲染的元素（如把默认的 <button> 触发器换成 <div>，
// 避免 button 嵌套 button 等非法结构）。
//
// 但其类型声明把该参数标注为对象（PolymorphicProps 的 `asChild?: (props) => JSX.Element`），
// 与运行时的函数不符。此助手做一次受控的类型转换，集中处理这一上游类型缺陷。
export type ArkMergeProps = (userProps?: Record<string, unknown>) => Record<string, unknown>

/** 将 asChild 回调收到的参数视为「合并 props」函数 */
export const arkMerge = (received: unknown): ArkMergeProps => received as ArkMergeProps
