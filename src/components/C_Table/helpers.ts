import type { TableConfig } from './composables/useTableConfig'
import type { DataTableRowKey } from 'naive-ui'
import type { StrictTableColumn, TableRowKeyIssue } from './types'

/** Type-safe identity helper that rejects misspelled business field keys. */
export function defineTableColumns<T extends object>(
  columns: StrictTableColumn<T>[]
): StrictTableColumn<T>[] {
  return columns
}

/** Preserve row types across edit, action, summary and batch callbacks. */
export function defineTableConfig<T extends object>(
  config: TableConfig<T>
): TableConfig<T> {
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
