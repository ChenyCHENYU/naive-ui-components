import type { DataTableColumn, DataTableCreateSummary } from 'naive-ui'

export interface NativeGap {
  index: number
  keys: Array<string | number | undefined>
}

export interface NativeColumnLayout {
  columns: DataTableColumn[]
  width?: number
  gap?: NativeGap
}

type SummaryRow = Exclude<ReturnType<DataTableCreateSummary>, unknown[]>

/** 逻辑跨度仅在跨过装饰空隙时增加一个物理列，不改写使用侧定义。 */
function nativeSpan(span: number, index: number, gap: number) {
  return index < gap && index + span > gap ? span + 1 : span
}

function translateSummary(row: SummaryRow, gap: NativeGap): SummaryRow {
  let result = row
  gap.keys.forEach((key, index) => {
    if (key === undefined || index >= gap.index) return
    const cell = row[key]
    if (!cell?.colSpan) return
    const colSpan = nativeSpan(cell.colSpan, index, gap.index)
    if (colSpan !== cell.colSpan)
      result = { ...result, [key]: { ...cell, colSpan } }
  })
  return result
}

/** Naive summary 按原业务 key 求值，只有跨空隙的跨度需要投影。 */
export function nativeSummary(
  summary: DataTableCreateSummary | undefined,
  gap: NativeGap | undefined
): DataTableCreateSummary | undefined {
  if (!summary || !gap) return summary
  return data => {
    const rows = summary(data)
    return Array.isArray(rows)
      ? rows.map(row => translateSummary(row, gap))
      : translateSummary(rows, gap)
  }
}

function projectLeaf(
  column: DataTableColumn,
  start: number,
  gap: number
): DataTableColumn {
  if (column.type || 'children' in column || start >= gap) return column
  const titleColSpan =
    column.titleColSpan === undefined
      ? undefined
      : nativeSpan(column.titleColSpan, start, gap)
  if (!column.colSpan && titleColSpan === column.titleColSpan) return column
  const projected = { ...column }
  if (column.colSpan) {
    const { colSpan } = column
    projected.colSpan = (row, rowIndex) =>
      nativeSpan(colSpan(row, rowIndex), start, gap)
  }
  if (titleColSpan !== undefined) projected.titleColSpan = titleColSpan
  return projected
}

/** 单次遍历记录逻辑叶序号及所有已占用 key，固定分组从其首叶前留空。 */
function columnGeometry(columns: DataTableColumn[]) {
  let index: number | undefined
  const keys: Array<string | number | undefined> = []
  const used = new Set<string | number>()
  const visit = (columns: DataTableColumn[]) => {
    for (const column of columns) {
      const key = 'key' in column ? column.key : undefined
      if (key !== undefined) used.add(key)
      if (index === undefined && column.fixed === 'right') index = keys.length
      if ('children' in column) visit(column.children)
      else keys.push(key)
    }
  }
  visit(columns)
  return { index, keys, used }
}

function defaultTreeColumn(columns: DataTableColumn[], gapIndex: number) {
  if (gapIndex !== 0 || columns.some(column => 'tree' in column && column.tree))
    return undefined
  return columns.find(column => !column.type) ?? columns[0]
}

/** 仅为原生呈现补齐画布，业务列、偏好、设置和导出始终不包含装饰列。 */
export function nativeColumnLayout(
  layout: NativeColumnLayout,
  available: number,
  previous?: NativeGap
): NativeColumnLayout {
  if (layout.width === undefined || !Number.isFinite(available)) return layout
  const width = available - layout.width
  if (width < 0.000001) return layout
  const { index, keys, used } = columnGeometry(layout.columns)
  if (index === undefined) return layout
  const treeColumn = defaultTreeColumn(layout.columns, index)
  let key = '__c_table_layout_gap__'
  while (used.has(key)) key += '_'
  const spacer: DataTableColumn = {
    key,
    title: '',
    width,
    minWidth: width,
    maxWidth: width,
    resizable: false,
    allowExport: false,
    className: 'c-table-layout-gap',
    render: () => null,
    cellProps: () => ({ 'aria-hidden': true, role: 'presentation' }),
  }
  let logicalIndex = 0
  let inserted = false
  const project = (columns: DataTableColumn[]): DataTableColumn[] => {
    const projectedColumns = columns.flatMap(column => {
      const before = !inserted && logicalIndex === index
      if (before) inserted = true
      let projected = column
      if ('children' in column) {
        const children = project(column.children) as typeof column.children
        if (children !== column.children) projected = { ...column, children }
      } else projected = projectLeaf(column, logicalIndex++, index)
      // 装饰列不可抢占 Naive 默认的首内容列树入口。
      if (column === treeColumn) {
        const treeProjected = { ...projected, tree: true }
        projected = treeProjected
      }
      return before ? [spacer, projected] : [projected]
    })
    return projectedColumns.length === columns.length &&
      projectedColumns.every((column, index) => column === columns[index])
      ? columns
      : projectedColumns
  }
  return {
    columns: project(layout.columns),
    width: available,
    // 宽度改变时复用跨度元数据，避免每帧重新执行宿主的合计计算。
    gap:
      previous?.index === index &&
      previous.keys.length === keys.length &&
      previous.keys.every((key, i) => key === keys[i])
        ? previous
        : { index, keys },
  }
}
