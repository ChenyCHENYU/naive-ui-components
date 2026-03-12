/*
 * @Description: 跨页多选 — 分页切换时保留选中状态
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'
import type { DataTableRowKey } from 'naive-ui/es'
import type { DataRecord } from '../types'

/* ================= 类型定义 ================= */

export interface CrossPageSelectionConfig {
  enabled?: boolean
  /** 最大选择数 */
  maxSelection?: number
}

export interface UseCrossPageSelectionOptions<
  T extends DataRecord = DataRecord,
> {
  /** 全量数据（非分页后的） */
  allData: Ref<T[]> | ComputedRef<T[]>
  /** 行键函数 */
  rowKey: (row: T) => DataTableRowKey
  /** 配置 */
  config: CrossPageSelectionConfig
}

export interface UseCrossPageSelectionReturn<
  T extends DataRecord = DataRecord,
> {
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
  /** 清除所有页选中 */
  clearAll: () => void
  /** 获取所有选中行数据 */
  getSelectedRows: () => T[]
  /** 判断 key 是否选中 */
  isSelected: (key: DataTableRowKey) => boolean
}

/* ================= 实现 ================= */

/** 跨页多选组合式函数 */
export function useCrossPageSelection<T extends DataRecord = DataRecord>(
  options: UseCrossPageSelectionOptions<T>
): UseCrossPageSelectionReturn<T> {
  const { allData, rowKey, config } = options
  const selectedKeys = ref<Set<DataTableRowKey>>(new Set())

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
    const newSet = new Set(selectedKeys.value)
    // 先清除当前页的所有 key
    for (const row of pageData) {
      newSet.delete(rowKey(row))
    }
    // 再添加当前页新选中的
    for (const key of keys) {
      if (config.maxSelection && newSet.size >= config.maxSelection) break
      newSet.add(key)
    }
    selectedKeys.value = newSet
  }

  const selectAll = () => {
    const all = allData.value.map(row => rowKey(row))
    selectedKeys.value = new Set(
      config.maxSelection ? all.slice(0, config.maxSelection) : all
    )
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

  return {
    selectedKeys,
    selectedCount,
    getPageCheckedKeys,
    handlePageSelectionChange,
    selectAll,
    clearAll,
    getSelectedRows,
    isSelected,
  }
}
