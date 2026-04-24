// @thisbeyond/solid-dnd 类型声明补充
// 为 SolidJS 的 use: 指令声明 sortable 指令类型
import "solid-js"

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      sortable: (element: HTMLElement) => void
    }
  }
}
