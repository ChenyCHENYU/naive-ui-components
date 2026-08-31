import type { TableConfig } from './composables/useTableConfig'
import type { DataTableRowKey } from 'naive-ui/es'
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
