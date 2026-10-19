import type { Graph } from '@antv/x6'

/** 阻止权限切换前已开始的拖拽继续修改模型；程序化加载数据仍可进行。 */
export function bindReadonlyGuard(
  graph: Graph,
  isReadonly: () => boolean
): void {
  graph.on('cell:change:*', ({ cell, key, previous, options }) => {
    if (isReadonly() && options.ui) {
      cell.prop(key, previous, { ui: false })
    }
  })
}
