/*
 * @Description: 模态框编辑组合函数
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { computed, ref } from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import type { DataRecord } from '../types'
import { cloneData } from '../../../utils/data'

export interface ModalEditOptions<T extends object = DataRecord> {
  data: () => T[]
  rowKey: (row: T) => DataTableRowKey
  onSave?: (editingData: T, rowIndex: number) => void | Promise<void>
  onCancel?: (originalData: T, rowIndex: number) => void | Promise<void>
}

/** Modal edit state with lossless snapshots and retry-safe async saves. */
export function useModalEdit<T extends object = DataRecord>(
  options: ModalEditOptions<T>
) {
  const isModalVisible = ref(false)
  const isSaving = ref(false)
  const editingRowKey = ref<DataTableRowKey | null>(null)
  const editingData = ref<T>({} as T)

  const editingRowIndex = computed(() => {
    if (editingRowKey.value === null) return -1
    const currentData = options.data()
    if (!Array.isArray(currentData)) return -1
    return currentData.findIndex(
      row => options.rowKey(row) === editingRowKey.value
    )
  })

  const resetEditingState = () => {
    if (isSaving.value) return false
    editingRowKey.value = null
    editingData.value = {} as T
    return true
  }

  const startEdit = (rowKey: DataTableRowKey, sourceData?: T) => {
    if (isSaving.value) return false
    const currentData = options.data()
    if (!Array.isArray(currentData)) return false

    const rowIndex = currentData.findIndex(
      row => options.rowKey(row) === rowKey
    )
    if (rowIndex === -1) return false

    editingRowKey.value = rowKey
    editingData.value = cloneData(sourceData ?? currentData[rowIndex])
    isModalVisible.value = true
    return true
  }

  const saveEdit = async (formData?: T) => {
    if (isSaving.value || editingRowKey.value === null) return
    const currentIndex = editingRowIndex.value
    if (currentIndex === -1) return

    const dataToSave = cloneData(formData ?? editingData.value)
    isSaving.value = true
    try {
      await options.onSave?.(dataToSave, currentIndex)
      isModalVisible.value = false
      editingRowKey.value = null
      editingData.value = {} as T
      return { updatedData: dataToSave, rowIndex: currentIndex }
    } finally {
      isSaving.value = false
    }
  }

  const cancelEdit = async () => {
    if (isSaving.value) return false
    const currentIndex = editingRowIndex.value
    try {
      if (editingRowKey.value !== null && currentIndex > -1) {
        const currentData = options.data()
        if (currentData[currentIndex]) {
          await options.onCancel?.(currentData[currentIndex], currentIndex)
        }
      }
    } finally {
      isModalVisible.value = false
      editingRowKey.value = null
      editingData.value = {} as T
    }
    return true
  }

  const updateEditingData = (data: T) => {
    if (isSaving.value) return false
    editingData.value = cloneData(data)
    return true
  }

  const getEditingRowData = (rowKey: DataTableRowKey) =>
    editingRowKey.value === rowKey ? editingData.value : null

  const isEditingRow = (rowKey: DataTableRowKey) =>
    editingRowKey.value === rowKey && isModalVisible.value

  return {
    isModalVisible,
    isSaving,
    editingData,
    editingRowKey,
    editingRowIndex,
    startEdit,
    saveEdit,
    cancelEdit,
    updateEditingData,
    resetEditingState,
    isEditingRow,
    getEditingRowData,
  }
}
