// 子编辑器把「保存 / 是否有未保存改动」暴露给父级的契约。
//
// 环境设置页有多个并列的编辑器（模块前置 URL、环境变量），父级需要在一次
// 「保存」里把它们一并落盘，也需要知道是否还有人有未保存的改动。
export interface EditorSaveRef {
  save: () => Promise<void>
  hasUnsavedChanges: () => boolean
}
