import * as vueuc from 'vueuc'

// Node 20 无法识别 vueuc 的 CJS 命名导出，浏览器构建则使用原生 ESM 导出。
export const VVirtualList =
  vueuc.VVirtualList ??
  (Reflect.get(vueuc, 'default') as typeof vueuc).VVirtualList
