// 纯副作用导入的模块声明。
//
// tsconfig 开启了 noUncheckedSideEffectImports（TS 5.6+），任何 `import "pkg"`
// 形式的副作用导入都要求该模块能被解析到类型声明。字体包只导出 CSS、不带
// .d.ts，故在此显式声明，避免 TS2882。
declare module "@fontsource-variable/outfit"
declare module "@fontsource/noto-color-emoji"

// CSS 副作用导入（含通过相对路径绕过 exports 引入的 node_modules 内 CSS）
declare module "*.css"
