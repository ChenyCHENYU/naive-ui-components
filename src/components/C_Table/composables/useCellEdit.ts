/*
 * @Description: 可编辑单元格组合函数
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref } from 'vue'
import type { DataTableRowKey } from 'naive-ui/es'
import type { FormItemRule } from 'naive-ui/es/form'
import type { DataRecord, TableColumn } from '../types'

/**
 * 执行单条校验规则，返回错误消息或 null
 */
async function runRule(
  rule: FormItemRule,
  value: unknown,
  label: string
): Promise<string | null> {
  const ruleMsg =
    typeof rule.message === 'function' ? rule.message() : rule.message
  if (rule.required && (value == null || value === '')) {
    return ruleMsg || `${label}不能为空`
  }
  if (rule.validator) {
    try {
      await rule.validator(rule as any, value, () => {}, {}, {})
    } catch (e: any) {
      return e?.message || `${label}校验失败`
    }
  }
  return null
}

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
    if (!rowData) return

    editingCell.value = { rowKey, columnKey }
    editingData.value[`${rowKey}-${columnKey}`] = rowData[columnKey]
  }

  /**
   * 校验当前编辑单元格
   */
  const validateCell = async (): Promise<boolean> => {
    cellValidationError.value = null
    const { rowKey, columnKey } = editingCell.value
    if (!rowKey || !columnKey) return true

    const columns = options.columns?.() || []
    const col = columns.find(c => (c as any).key === columnKey)
    if (!col || !col.editProps?.rules) return true

    const cellKey = `${rowKey}-${columnKey}`
    const value = editingData.value[cellKey]
    const label = (col as any).title || columnKey

    const results = await Promise.all(
      col.editProps.rules.map(rule => runRule(rule, value, label))
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
    if (!rowKey || !columnKey) return

    // 执行校验
    const isValid = await validateCell()
    if (!isValid) return

    const currentData = options.data()
    if (!currentData || !Array.isArray(currentData)) return

    const rowIndex = currentData.findIndex(
      row => options.rowKey(row) === rowKey
    )
    if (rowIndex === -1) return

    const cellKey = `${rowKey}-${columnKey}`
    const newValue = editingData.value[cellKey]

    const updatedData = {
      ...currentData[rowIndex],
      [columnKey]: newValue,
    }

    await options.onSave?.(updatedData, rowIndex, columnKey)

    editingCell.value = { rowKey: null, columnKey: null }
    delete editingData.value[cellKey]

    return { updatedData, rowIndex, columnKey }
  }

  /**
   * 取消当前单元格编辑，清理编辑状态和缓存数据
   */
  const cancelEditCell = () => {
    const { rowKey, columnKey } = editingCell.value
    if (rowKey && columnKey) {
      delete editingData.value[`${rowKey}-${columnKey}`]
    }
    editingCell.value = { rowKey: null, columnKey: null }
  }

  /**
   * 获取指定单元格的编辑中数值
   */
  const getEditingCellValue = (rowKey: DataTableRowKey, columnKey: string) => {
    return editingData.value[`${rowKey}-${columnKey}`]
  }

  /**
   * 更新指定单元格的编辑中数值
   */
  const updateEditingCellValue = (
    rowKey: DataTableRowKey,
    columnKey: string,
    value: unknown
  ) => {
    editingData.value[`${rowKey}-${columnKey}`] = value
  }

  return {
    editingCell,
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
