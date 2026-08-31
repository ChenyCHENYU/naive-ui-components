/*
 * @Description: 可编辑单元格组合函数
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref } from 'vue'
import type { DataTableRowKey } from 'naive-ui/es'
import type { DataRecord, TableColumn } from '../types'
import { cloneData } from '../../../utils/data'
import { validateTableRule } from './tableValidation'

/**
 * 单元格编辑配置选项
 */
export interface CellEditOptions {
  data: () => DataRecord[]
  rowKey: (row: DataRecord) => DataTableRowKey
  onSave?: (
    rowData: DataRecord,
    rowIndex: number,
    columnKey: string
  ) => void | Promise<void>
  /** 列配置（用于提取校验规则） */
  columns?: () => TableColumn[]
}

function createCellKey(rowKey: DataTableRowKey, columnKey: string): string {
  const rowKeyText = String(rowKey)
  return `${typeof rowKey}:${rowKeyText.length}:${rowKeyText}|${columnKey.length}:${columnKey}`
}

/**
 * 可编辑单元格组合函数，提供表格单元格的编辑功能
 */
export function useCellEdit(options: CellEditOptions) {
  const editingCell = ref<{
    rowKey: DataTableRowKey | null
    columnKey: string | null
  }>({
    rowKey: null,
    columnKey: null,
  })
  const editingData = ref<Record<string, unknown>>({})
  const isSaving = ref(false)
  /** 当前单元格校验错误 */
  const cellValidationError = ref<string | null>(null)

  /**
   * 检查指定单元格是否正在编辑状态
   */
  const isEditingCell = (rowKey: DataTableRowKey, columnKey: string) => {
    return (
      editingCell.value.rowKey === rowKey &&
      editingCell.value.columnKey === columnKey
    )
  }

  /**
   * 根据rowKey实时查找最新的行数据
   */
  const findRowData = (rowKey: DataTableRowKey) => {
    const currentData = options.data()
    if (!currentData || !Array.isArray(currentData)) {
      return null
    }
    return currentData.find(row => options.rowKey(row) === rowKey)
  }

  /**
   * 开始编辑指定单元格，将原值存储到编辑缓存中
   */
  const startEditCell = (rowKey: DataTableRowKey, columnKey: string) => {
    const rowData = findRowData(rowKey)
    if (!rowData || !columnKey || isSaving.value) return false

    editingCell.value = { rowKey, columnKey }
    editingData.value = {
      [createCellKey(rowKey, columnKey)]: cloneData(rowData[columnKey]),
    }
    cellValidationError.value = null
    return true
  }

  /**
   * 校验当前编辑单元格
   */
  const validateCell = async (): Promise<boolean> => {
    cellValidationError.value = null
    const { rowKey, columnKey } = editingCell.value
    if (rowKey === null || columnKey === null) return true

    const columns = options.columns?.() || []
    const col = columns.find(c => c.key === columnKey)
    if (!col || !col.editProps?.rules) return true

    const cellKey = createCellKey(rowKey, columnKey)
    const value = editingData.value[cellKey]
    const label = col.title || columnKey
    const source = { ...findRowData(rowKey), [columnKey]: value }

    const results = await Promise.all(
      col.editProps.rules.map(rule =>
        validateTableRule(rule, value, label, source)
      )
    )
    const firstError = results.find(Boolean)
    if (firstError) {
      cellValidationError.value = firstError
      return false
    }
    return true
  }

  /**
   * 保存当前编辑的单元格，调用保存回调并清理编辑状态
   */
  const saveEditCell = async () => {
    const { rowKey, columnKey } = editingCell.value
    if (rowKey === null || columnKey === null || isSaving.value) return

    // 执行校验
    const isValid = await validateCell()
    if (!isValid) return

    const currentData = options.data()
    if (!currentData || !Array.isArray(currentData)) return

    const rowIndex = currentData.findIndex(
      row => options.rowKey(row) === rowKey
    )
    if (rowIndex === -1) return

    const cellKey = createCellKey(rowKey, columnKey)
    const newValue = editingData.value[cellKey]

    const updatedData = {
      ...currentData[rowIndex],
      [columnKey]: newValue,
    }

    isSaving.value = true
    try {
      await options.onSave?.(cloneData(updatedData), rowIndex, columnKey)
      editingCell.value = { rowKey: null, columnKey: null }
      editingData.value = {}
    } finally {
      isSaving.value = false
    }

    return { updatedData, rowIndex, columnKey }
  }

  /**
   * 取消当前单元格编辑，清理编辑状态和缓存数据
   */
  const cancelEditCell = () => {
    const { rowKey, columnKey } = editingCell.value
    if (isSaving.value) return
    if (rowKey !== null && columnKey !== null)
      delete editingData.value[createCellKey(rowKey, columnKey)]
    editingCell.value = { rowKey: null, columnKey: null }
    cellValidationError.value = null
  }

  /**
   * 获取指定单元格的编辑中数值
   */
  const getEditingCellValue = (rowKey: DataTableRowKey, columnKey: string) => {
    return editingData.value[createCellKey(rowKey, columnKey)]
  }

  /**
   * 更新指定单元格的编辑中数值
   */
  const updateEditingCellValue = (
    rowKey: DataTableRowKey,
    columnKey: string,
    value: unknown
  ) => {
    if (!isEditingCell(rowKey, columnKey)) return
    editingData.value[createCellKey(rowKey, columnKey)] = cloneData(value)
  }

  return {
    editingCell,
    editingData,
    isSaving,
    isEditingCell,
    startEditCell,
    saveEditCell,
    cancelEditCell,
    validateCell,
    cellValidationError,
    getEditingCellValue,
    updateEditingCellValue,
    findRowData,
  }
}
