/*
 * @Description: 可编辑行组合函数，提供表格整行的编辑功能
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref } from "vue";
import type { DataTableRowKey } from "naive-ui/es";
import type { DataRecord, TableColumn } from '../types'

/** 行级校验错误 */
export interface RowValidationError {
  field: string
  message: string
}

/**
 * 行编辑配置选项
 */
export interface RowEditOptions {
  data: () => DataRecord[]
  rowKey: (row: DataRecord) => DataTableRowKey
  onSave?: (rowData: DataRecord, rowIndex: number) => void | Promise<void>
  onCancel?: (rowData: DataRecord, rowIndex: number) => void
  /** 列配置（用于提取校验规则） */
  columns?: () => TableColumn[]
}

/**
 * 可编辑行组合函数，提供表格整行的编辑功能
 */
export function useRowEdit(options: RowEditOptions) {
  const editingRowKey = ref<DataTableRowKey | null>(null)
  const editingData = ref<Record<string, DataRecord>>({})
  /** 校验错误信息 */
  const validationErrors = ref<RowValidationError[]>([])

  /**
   * 检查指定行是否正在编辑状态
   */
  const isEditingRow = (rowKey: DataTableRowKey) => {
    return editingRowKey.value === rowKey
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
   * 开始编辑指定行，将原始数据复制到编辑缓存中
   */
  const startEditRow = (rowKey: DataTableRowKey) => {
    const rowData = findRowData(rowKey)
    if (!rowData) return

    editingRowKey.value = rowKey
    editingData.value[rowKey as string] = { ...rowData }
  }

  /**
   * 取消当前行编辑，调用取消回调并清理编辑状态
   */
  const cancelEditRow = async () => {
    if (!editingRowKey.value) return

    const currentData = options.data()
    if (!currentData || !Array.isArray(currentData)) return

    const rowIndex = currentData.findIndex(
      row => options.rowKey(row) === editingRowKey.value
    )

    if (rowIndex > -1) {
      await options.onCancel?.(currentData[rowIndex], rowIndex)
    }

    editingRowKey.value = null
    editingData.value = {}
  }

  /**
   * 校验当前编辑行数据
   */
  const validateRow = async (): Promise<boolean> => {
    validationErrors.value = []
    if (!editingRowKey.value) return true

    const columns = options.columns?.() || []
    const rowData = editingData.value[editingRowKey.value as string]
    if (!rowData) return true

    const errors: RowValidationError[] = []

    for (const col of columns) {
      if (col.editable === false || !col.editProps?.rules) continue
      const key = (col as any).key as string
      if (!key) continue

      const value = rowData[key]
      for (const rule of col.editProps.rules) {
        try {
          if (rule.required && (value == null || value === '')) {
            errors.push({
              field: key,
              message: rule.message || `${(col as any).title || key}不能为空`,
            })
            break
          }
          if (rule.validator) {
            await rule.validator(rule, value, () => {})
          }
        } catch (e: any) {
          errors.push({
            field: key,
            message: e?.message || `${(col as any).title || key}校验失败`,
          })
          break
        }
      }
    }

    validationErrors.value = errors
    return errors.length === 0
  }

  /**
   * 保存当前行编辑，调用保存回调并清理编辑状态
   */
  const saveEditRow = async () => {
    if (!editingRowKey.value) return

    // 执行校验
    const isValid = await validateRow()
    if (!isValid) return

    const rowKey = editingRowKey.value
    const currentData = options.data()
    if (!currentData || !Array.isArray(currentData)) return

    const rowIndex = currentData.findIndex(
      row => options.rowKey(row) === rowKey
    )

    if (rowIndex === -1) return

    const updatedData = editingData.value[rowKey as string]
    if (!updatedData) return

    await options.onSave?.(updatedData, rowIndex)

    editingRowKey.value = null
    editingData.value = {}

    return { updatedData, rowIndex }
  }

  /**
   * 获取指定行的编辑中数据
   */
  const getEditingRowData = (rowKey: DataTableRowKey) => {
    return editingData.value[rowKey as string]
  }

  /**
   * 更新指定行编辑中的字段值
   */
  const updateEditingRowData = (
    rowKey: DataTableRowKey,
    field: string,
    value: unknown
  ) => {
    if (!editingData.value[rowKey as string]) return
    editingData.value[rowKey as string][field] = value
  }

  return {
    editingRowKey,
    isEditingRow,
    startEditRow,
    cancelEditRow,
    saveEditRow,
    validateRow,
    validationErrors,
    getEditingRowData,
    updateEditingRowData,
    findRowData,
  }
}
