/*
 * @Description: 跨页多选 — 分页切换时保留选中状态
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  ref,
  computed,
  watch,
  toValue,
  type Ref,
  type ComputedRef,
  type MaybeRefOrGetter,
} from 'vue'
import type { DataTableRowKey } from 'naive-ui/es'
import type { DataRecord } from '../types'

/* ================= 类型定义 ================= */

export interface CrossPageSelectionConfig {
  enabled?: boolean
  /** 最大选择数 */
  maxSelection?: number
}

export interface UseCrossPageSelectionOptions<T extends object = DataRecord> {
  /** 全量数据（非分页后的） */
  allData: Ref<T[]> | ComputedRef<T[]>
  /** 行键函数 */
  rowKey: (row: T) => DataTableRowKey
  /** 配置 */
  config: MaybeRefOrGetter<CrossPageSelectionConfig | undefined>
}

export interface UseCrossPageSelectionReturn<T extends object = DataRecord> {
  /** 所有选中的 key（跨页） */
  selectedKeys: Ref<Set<DataTableRowKey>>
  /** 选中行数量 */
  selectedCount: ComputedRef<number>
  /** 当前页数据的 checkedKeys（给 NDataTable 绑定） */
  getPageCheckedKeys: (pageData: T[]) => DataTableRowKey[]
  /** NDataTable @update:checked-row-keys 处理器 */
  handlePageSelectionChange: (keys: DataTableRowKey[], pageData: T[]) => void
  /** 全选所有页 */
  selectAll: () => void
  /** 选择指定 key */
  select: (key: DataTableRowKey) => boolean
  /** 取消选择指定 key */
  unselect: (key: DataTableRowKey) => void
  /** 清除所有页选中 */
  clearAll: () => void
  /** 获取所有选中行数据 */
  getSelectedRows: () => T[]
  /** 判断 key 是否选中 */
  isSelected: (key: DataTableRowKey) => boolean
}

/* ================= 实现 ================= */

/** 跨页多选组合式函数 */
export function useCrossPageSelection<T extends object = DataRecord>(
  options: UseCrossPageSelectionOptions<T>
): UseCrossPageSelectionReturn<T> {
  const { allData, rowKey } = options
  const selectedKeys = ref<Set<DataTableRowKey>>(new Set())

  const getMaxSelection = () => {
    const max = toValue(options.config)?.maxSelection
    return Number.isFinite(max) && (max ?? 0) > 0 ? Math.trunc(max!) : undefined
  }

  const selectedCount = computed(() => selectedKeys.value.size)

  const getPageCheckedKeys = (pageData: T[]): DataTableRowKey[] => {
    return pageData
      .map(row => rowKey(row))
      .filter(key => selectedKeys.value.has(key))
  }

  const handlePageSelectionChange = (
    keys: DataTableRowKey[],
    pageData: T[]
  ) => {
    if (!toValue(options.config)?.enabled) return
    const newSet = new Set(selectedKeys.value)
    // 先清除当前页的所有 key
    for (const row of pageData) {
      newSet.delete(rowKey(row))
    }
    // 再添加当前页新选中的
    for (const key of keys) {
      const maxSelection = getMaxSelection()
      if (maxSelection && newSet.size >= maxSelection) break
      newSet.add(key)
    }
    selectedKeys.value = newSet
  }

  const selectAll = () => {
    if (!toValue(options.config)?.enabled) return
    const all = [...new Set(allData.value.map(row => rowKey(row)))]
    const maxSelection = getMaxSelection()
    selectedKeys.value = new Set(
      maxSelection ? all.slice(0, maxSelection) : all
    )
  }

  const select = (key: DataTableRowKey): boolean => {
    if (!toValue(options.config)?.enabled) return false
    if (!allData.value.some(row => rowKey(row) === key)) return false
    if (selectedKeys.value.has(key)) return true
    const maxSelection = getMaxSelection()
    if (maxSelection && selectedKeys.value.size >= maxSelection) return false
    selectedKeys.value = new Set([...selectedKeys.value, key])
    return true
  }

  const unselect = (key: DataTableRowKey) => {
    if (!selectedKeys.value.has(key)) return
    const nextKeys = new Set(selectedKeys.value)
    nextKeys.delete(key)
    selectedKeys.value = nextKeys
  }

  const clearAll = () => {
    selectedKeys.value = new Set()
  }

  const getSelectedRows = (): T[] => {
    return allData.value.filter(row => selectedKeys.value.has(rowKey(row)))
  }

  const isSelected = (key: DataTableRowKey): boolean => {
    return selectedKeys.value.has(key)
  }

  // 数据源变化时清除不存在的 key
  watch(allData, newData => {
    const validKeys = new Set(newData.map(row => rowKey(row)))
    const cleaned = new Set(
      [...selectedKeys.value].filter(k => validKeys.has(k))
    )
    if (cleaned.size !== selectedKeys.value.size) {
      selectedKeys.value = cleaned
    }
  })

  watch(
    () => [toValue(options.config)?.enabled, getMaxSelection()] as const,
    ([enabled, maxSelection]) => {
      if (!enabled) {
        clearAll()
        return
      }
      if (maxSelection && selectedKeys.value.size > maxSelection) {
        selectedKeys.value = new Set(
          [...selectedKeys.value].slice(0, maxSelection)
        )
      }
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
    isSelected,
  }
}
