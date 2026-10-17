/*
 * @Description: Local/remote cross-page selection with one key and row-cache owner.
 */
import {
  ref,
  shallowReactive,
  computed,
  watch,
  toValue,
  type Ref,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import type { DataRecord } from '../types'
import { flattenTableRows } from '../helpers'

export interface CrossPageSelectionConfig {
  enabled?: boolean
  /** Maximum selected rows, including previously visited remote pages. */
  maxSelection?: number
}

export interface UseCrossPageSelectionOptions<T extends object = DataRecord> {
  /** All local rows, or the loaded page when remote is enabled. */
  allData: Ref<T[]> | ComputedRef<T[]>
  rowKey: (row: T) => DataTableRowKey
  config: MaybeRefOrGetter<CrossPageSelectionConfig | undefined>
  remote?: MaybeRefOrGetter<boolean>
  childrenKey?: MaybeRefOrGetter<string | undefined>
  rowCheckable?: (row: T) => boolean
  onSelectionChange?: (keys: DataTableRowKey[], rows: T[]) => void
}

export interface UseCrossPageSelectionReturn<T extends object = DataRecord> {
  selectedKeys: Ref<Set<DataTableRowKey>>
  selectedCount: ComputedRef<number>
  getPageCheckedKeys: (pageData: T[]) => DataTableRowKey[]
  handlePageSelectionChange: (keys: DataTableRowKey[], pageData: T[]) => void
  /** In remote mode, adds the currently loaded page; never claims to select unseen server rows. */
  selectAll: () => void
  select: (key: DataTableRowKey) => boolean
  unselect: (key: DataTableRowKey) => void
  clearAll: () => void
  getSelectedRows: () => T[]
  isSelected: (key: DataTableRowKey) => boolean
}

/** Preserve selected identities and loaded row snapshots across local or remote pages. */
export function useCrossPageSelection<T extends object = DataRecord>(
  options: UseCrossPageSelectionOptions<T>
): UseCrossPageSelectionReturn<T> {
  const selectedKeys = ref<Set<DataTableRowKey>>(new Set())
  const selectedRows = shallowReactive(new Map<DataTableRowKey, T>())
  const enabled = () => toValue(options.config)?.enabled === true
  const rows = (data = options.allData.value) =>
    flattenTableRows(data, toValue(options.childrenKey))
  const selectable = (row: T) => options.rowCheckable?.(row) !== false
  const getMaxSelection = () => {
    const max = toValue(options.config)?.maxSelection
    return Number.isFinite(max) && (max ?? 0) > 0 ? Math.trunc(max!) : undefined
  }
  const selectedCount = computed(() => selectedKeys.value.size)
  const getSelectedRows = () =>
    [...selectedKeys.value].flatMap(key => {
      const row = selectedRows.get(key)
      return row ? [row] : []
    })

  const limitKeys = (keys: Iterable<DataTableRowKey>) => {
    const max = getMaxSelection()
    const next = new Set<DataTableRowKey>()
    for (const key of keys) {
      if (max && next.size >= max) break
      next.add(key)
    }
    return next
  }
  const commit = (
    keys: Iterable<DataTableRowKey>,
    availableRows: readonly T[] = []
  ) => {
    const next = limitKeys(keys)
    for (const row of availableRows) {
      const key = options.rowKey(row)
      if (next.has(key)) selectedRows.set(key, row)
    }
    for (const key of selectedRows.keys()) {
      if (!next.has(key)) selectedRows.delete(key)
    }
    const previous = selectedKeys.value
    if (
      previous.size === next.size &&
      [...previous].every(key => next.has(key))
    )
      return
    selectedKeys.value = next
    options.onSelectionChange?.([...next], getSelectedRows())
  }

  const getPageCheckedKeys = (pageData: T[]) =>
    rows(pageData)
      .map(options.rowKey)
      .filter(key => selectedKeys.value.has(key))

  const handlePageSelectionChange = (
    keys: DataTableRowKey[],
    pageData: T[]
  ) => {
    if (!enabled()) return
    const currentRows = rows(pageData)
    const available = new Set(
      currentRows.filter(selectable).map(options.rowKey)
    )
    const next = new Set(selectedKeys.value)
    currentRows.forEach(row => next.delete(options.rowKey(row)))
    keys.forEach(key => {
      if (available.has(key)) next.add(key)
    })
    commit(next, currentRows)
  }

  const selectAll = () => {
    if (!enabled()) return
    const available = rows().filter(selectable)
    const keys = available.map(options.rowKey)
    commit(
      toValue(options.remote) ? [...selectedKeys.value, ...keys] : keys,
      available
    )
  }
  const select = (key: DataTableRowKey) => {
    if (!enabled()) return false
    if (selectedKeys.value.has(key)) return true
    const row = rows().find(
      candidate => options.rowKey(candidate) === key && selectable(candidate)
    )
    if (!row) return false
    const max = getMaxSelection()
    if (max && selectedKeys.value.size >= max) return false
    commit([...selectedKeys.value, key], [row])
    return true
  }
  const unselect = (key: DataTableRowKey) => {
    if (!selectedKeys.value.has(key)) return
    const next = new Set(selectedKeys.value)
    next.delete(key)
    commit(next)
  }
  const clearAll = () => commit([])

  watch(options.allData, data => {
    if (!enabled() || selectedKeys.value.size === 0) return
    const available = rows(data)
    if (toValue(options.remote)) {
      for (const row of available) {
        const key = options.rowKey(row)
        if (selectedKeys.value.has(key)) selectedRows.set(key, row)
      }
      return
    }
    const valid = new Set(available.map(options.rowKey))
    commit(
      [...selectedKeys.value].filter(key => valid.has(key)),
      available
    )
  })
  watch(
    () => [enabled(), getMaxSelection()] as const,
    ([active]) => {
      if (!active) clearAll()
      else commit(selectedKeys.value)
    }
  )

  return {
    selectedKeys,
    selectedCount,
    getPageCheckedKeys,
    handlePageSelectionChange,
    selectAll,
    select,
    unselect,
    clearAll,
    getSelectedRows,
    isSelected: key => selectedKeys.value.has(key),
  }
}
