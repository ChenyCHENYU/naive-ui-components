/*
 * @Description: 模态框编辑组合函数
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { computed, ref } from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import { flattenTableColumns } from '../helpers'
import { constrainTableEdit, isTableColumnEditable } from './tableValidation'
import type { TableColumn, DataRecord } from '../types'
import { cloneData } from '../../../utils/data'

export interface ModalEditOptions<T extends object = DataRecord> {
  data: () => T[]
  rowKey: (row: T) => DataTableRowKey
  columns?: () => TableColumn<T>[]
  onSave?: (
    editingData: T,
    rowIndex: number,
    originalKey?: DataTableRowKey
  ) => unknown
  onCancel?: (originalData: T, rowIndex: number) => unknown
}

/** Modal edit state with lossless snapshots and retry-safe async saves. */
export function useModalEdit<T extends object = DataRecord>(
  options: ModalEditOptions<T>
) {
  let revision = 0
  const isModalVisible = ref(false)
  const isSaving = ref(false)
  const editingRowKey = ref<DataTableRowKey | null>(null)
  const editingData = ref<T>({} as T)
  const invalidate = () => {
    revision++
    isModalVisible.value = false
    editingRowKey.value = null
    editingData.value = {} as T
  }

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

  const canEditRow = (key: DataTableRowKey) => {
    const rows = options.data()
    const index = rows.findIndex(row => options.rowKey(row) === key)
    if (index < 0) return false
    const columns = flattenTableColumns(options.columns?.() ?? [])
    return (
      !columns.length ||
      columns.some(column => isTableColumnEditable(column, rows[index], index))
    )
  }

  const startEdit = (rowKey: DataTableRowKey, sourceData?: T) => {
    if (isSaving.value) return false
    const currentData = options.data()
    if (!Array.isArray(currentData)) return false

    const rowIndex = currentData.findIndex(
      row => options.rowKey(row) === rowKey
    )
    if (rowIndex === -1) return false
    if (!canEditRow(rowKey)) return false

    revision++
    editingRowKey.value = rowKey
    editingData.value = cloneData(sourceData ?? currentData[rowIndex])
    isModalVisible.value = true
    return true
  }

  const saveEdit = async (formData?: T) => {
    if (isSaving.value || editingRowKey.value === null) return
    const currentIndex = editingRowIndex.value
    if (currentIndex === -1) return

    const originalKey = editingRowKey.value
    const expectedRevision = revision
    const dataToSave = constrainTableEdit(
      options.columns?.() ?? [],
      options.data()[currentIndex],
      cloneData(formData ?? editingData.value),
      currentIndex
    )
    isSaving.value = true
    try {
      await options.onSave?.(dataToSave, currentIndex, originalKey)
      if (revision !== expectedRevision) return
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
    const expectedRevision = revision
    const currentIndex = editingRowIndex.value
    try {
      if (editingRowKey.value !== null && currentIndex > -1) {
        const currentData = options.data()
        if (currentData[currentIndex]) {
          await options.onCancel?.(currentData[currentIndex], currentIndex)
        }
      }
    } finally {
      if (revision === expectedRevision) {
        isModalVisible.value = false
        editingRowKey.value = null
        editingData.value = {} as T
      }
    }
    return true
  }

  const updateEditingData = (data: T) => {
    if (isSaving.value) return false
    const index = editingRowIndex.value
    if (index < 0) return false
    editingData.value = constrainTableEdit(
      options.columns?.() ?? [],
      options.data()[index],
      cloneData(data),
      index
    )
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
    originalData: computed(() => options.data()[editingRowIndex.value]),
    startEdit,
    canEditRow,
    saveEdit,
    cancelEdit,
    updateEditingData,
    resetEditingState,
    isEditingRow,
    getEditingRowData,
    invalidate,
  }
}
