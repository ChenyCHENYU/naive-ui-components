import type { DataTableColumn, DataTableRowKey } from 'naive-ui'
import { flattenTableColumns, mapTableColumnLeaves } from '../helpers'

/** 原生百分比等宽度由 Naive 处理；纯数值和 px 才进入包内分配。 */
export function columnPixels(
  column: Pick<DataTableColumn, 'width'>
): number | undefined {
  const { width } = column
  const pixels =
    typeof width === 'number'
      ? width
      : typeof width === 'string' && /^\s*\d+(?:\.\d+)?(?:px)?\s*$/.test(width)
        ? Number.parseFloat(width)
        : NaN
  return Number.isFinite(pixels) && pixels >= 0 ? pixels : undefined
}

/** 原生拖宽缓存会覆盖后续列定义；只在最终宽度或约束变化时重建。 */
export function isColumnWidthStale(
  column: DataTableColumn | undefined,
  width: number
) {
  return (
    !column ||
    columnPixels(column) !== width ||
    width < Number(column.minWidth ?? 0) ||
    width > Number(column.maxWidth ?? Infinity)
  )
}

interface ColumnLayoutOptions {
  available: number
  automatic: ReadonlySet<DataTableRowKey>
  pending: ReadonlyMap<DataTableRowKey, number>
  frozen?: ReadonlyMap<DataTableRowKey, number>
}

function limitColumnWidth(column: DataTableColumn, width: number | undefined) {
  if (width === undefined) return undefined
  const minimum = typeof column.minWidth === 'number' ? column.minWidth : 0
  const maximum =
    typeof column.maxWidth === 'number'
      ? Math.max(minimum, column.maxWidth)
      : Infinity
  return Math.max(minimum, Math.min(maximum, width))
}

/** 只分配列宽，绝不读取行或 DOM；触顶的自动列退出后再分配余量。 */
export function allocateColumnWidths(
  columns: DataTableColumn[],
  options: ColumnLayoutOptions
): DataTableColumn[] {
  const leaves = flattenTableColumns(columns)
  const bases = leaves.map(columnPixels)
  const numeric = bases.every(width => width !== undefined)
  const widths = leaves.map((column, index) => {
    const key = 'key' in column ? column.key : undefined
    const automatic = key !== undefined && options.automatic.has(key)
    const frozen = automatic ? options.frozen?.get(key!) : undefined
    const preferred =
      key === undefined
        ? bases[index]
        : (options.pending.get(key) ?? frozen ?? bases[index])
    return limitColumnWidth(column, preferred)
  })
  if (
    numeric &&
    !options.frozen &&
    Number.isFinite(options.available) &&
    options.available > 0
  ) {
    let extra =
      options.available - widths.reduce<number>((sum, width) => sum + width!, 0)
    let active = leaves.flatMap((column, index) =>
      'key' in column &&
      options.automatic.has(column.key) &&
      !options.pending.has(column.key) &&
      bases[index]! > 0
        ? [index]
        : []
    )
    while (extra > 0.001 && active.length) {
      const weight = active.reduce((sum, index) => sum + bases[index]!, 0)
      let used = 0
      active = active.filter(index => {
        const before = widths[index]!
        const maximum =
          typeof leaves[index].maxWidth === 'number'
            ? leaves[index].maxWidth
            : Infinity
        widths[index] = Math.max(
          before,
          Math.min(maximum, before + (extra * bases[index]!) / weight)
        )
        used += widths[index]! - before
        return widths[index]! < maximum
      })
      if (used < 0.0001) break
      extra -= used
    }
  }
  const assigned = new Map(
    leaves.map((column, index) => [column, widths[index]])
  )
  return mapTableColumnLeaves(columns, column => {
    const width = assigned.get(column)
    return width === undefined || width === columnPixels(column)
      ? column
      : { ...column, width }
  })
}
