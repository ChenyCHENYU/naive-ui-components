import type { TableConfig } from './composables/useTableConfig'
import type { DataTableRowKey } from 'naive-ui'
import type { StrictTableColumn, TableRowKeyIssue } from './types'

/** DOM 标记保留键的原始类型，避免数字 1 与字符串 "1" 混为同一行。 */
export function getTableRowDragKey<T extends object>(
  row: T,
  rowKey: (row: T) => DataTableRowKey
): string | undefined {
  try {
    const key = rowKey(row)
    if (typeof key === 'string' && key !== '')
      return JSON.stringify(['string', key])
    if (typeof key === 'number' && Number.isFinite(key))
      return JSON.stringify(['number', key])
  } catch {
    // 行键错误由表格统一报告；拖拽遇到无效身份时只做安全降级。
  }
  return undefined
}

/** Flatten an explicitly configured tree without visiting cyclic/shared nodes twice. */
export function flattenTableRows<T extends object>(
  rows: readonly T[],
  childrenKey?: string
): readonly T[] {
  if (!childrenKey) return rows
  const result: T[] = []
  const visited = new WeakSet<object>()
  const stack: T[] = []
  for (let index = rows.length - 1; index >= 0; index--) {
    stack.push(rows[index])
  }
  while (stack.length) {
    const row = stack.pop()!
    if (visited.has(row)) continue
    visited.add(row)
    result.push(row)
    const children = (row as Record<string, unknown>)[childrenKey]
    if (Array.isArray(children)) {
      for (let index = children.length - 1; index >= 0; index--) {
        const child = children[index]
        if (child && typeof child === 'object') stack.push(child as T)
      }
    }
  }
  return result
}

/** Replace one known row while preserving the latest tree and unrelated row references. */
export function replaceTableRow<T extends object>(
  rows: readonly T[],
  original: T,
  replacement: T,
  childrenKey?: string
): T[] {
  const visited = new WeakSet<object>()
  const replace = (row: T): T => {
    if (row === original) return replacement
    if (!childrenKey || visited.has(row)) return row
    visited.add(row)
    const children = (row as Record<string, unknown>)[childrenKey]
    if (!Array.isArray(children)) return row
    const nextChildren = children.map(child =>
      child && typeof child === 'object' ? replace(child as T) : child
    )
    return nextChildren.some((child, index) => child !== children[index])
      ? { ...row, [childrenKey]: nextChildren }
      : row
  }
  return rows.map(replace)
}

/** Type-safe identity helper that rejects misspelled business field keys. */
export function defineTableColumns<T extends object>(
  columns: StrictTableColumn<T>[]
): StrictTableColumn<T>[] {
  return columns
}

/** Preserve row types across edit, action, summary and batch callbacks. */
export function defineTableConfig<T extends object, C = unknown>(
  config: TableConfig<T, C>
): TableConfig<T, C> {
  return config
}

/** Find missing and duplicate row keys before stateful table features consume them. */
export function validateTableRowKeys<T extends object>(
  data: readonly T[],
  rowKey: (row: T) => DataTableRowKey | null | undefined
): TableRowKeyIssue<T>[] {
  const seen = new Map<DataTableRowKey, number>()
  const issues: TableRowKeyIssue<T>[] = []
  data.forEach((row, index) => {
    let key: DataTableRowKey | null | undefined
    try {
      key = rowKey(row)
    } catch (cause) {
      issues.push({ type: 'error', row, index, cause })
      return
    }
    if (key === null || key === undefined || key === '') {
      issues.push({ type: 'missing', row, index })
      return
    }
    const firstIndex = seen.get(key)
    if (firstIndex !== undefined) {
      issues.push({ type: 'duplicate', row, index, key, firstIndex })
      return
    }
    seen.set(key, index)
  })
  return issues
}

/** Collect parent keys for a controlled tree table's default-expand-all mode. */
export function collectTreeBranchKeys<T extends object>(
  rows: readonly T[],
  childrenKey: string,
  rowKey: (row: T) => DataTableRowKey
): DataTableRowKey[] {
  const keys = new Set<DataTableRowKey>()
  const visited = new WeakSet<object>()
  const stack = [...rows]
  const safeRowKey = (row: T): DataTableRowKey | undefined => {
    try {
      return rowKey(row)
    } catch {
      // Invalid keys are reported separately by the table row-key contract.
      return undefined
    }
  }
  const hasValidKey = (
    key: DataTableRowKey | undefined
  ): key is DataTableRowKey => key !== null && key !== undefined && key !== ''

  while (stack.length) {
    const row = stack.pop()!
    if (visited.has(row)) continue
    visited.add(row)
    const children = (row as Record<string, unknown>)[childrenKey]
    if (!Array.isArray(children) || children.length === 0) continue
    const key = safeRowKey(row)
    if (hasValidKey(key)) keys.add(key)
    for (const child of children) {
      if (child && typeof child === 'object') stack.push(child as T)
    }
  }

  return [...keys]
}
