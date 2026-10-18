/*
 * @Description: 可编辑行组合函数，提供表格整行的编辑功能
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref } from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import type { DataRecord, TableColumn } from '../types'
import { cloneData } from '../../../utils/data'
import { validateTableRule } from './tableValidation'

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
  onSave?: (
    rowData: DataRecord,
    rowIndex: number,
    originalKey?: DataTableRowKey
  ) => void | Promise<void>
  onCancel?: (rowData: DataRecord, rowIndex: number) => void | Promise<void>
  /** 列配置（用于提取校验规则） */
  columns?: () => TableColumn[]
}

/**
 * 可编辑行组合函数，提供表格整行的编辑功能
 */
export function useRowEdit(options: RowEditOptions) {
  let revision = 0
  const editingRowKey = ref<DataTableRowKey | null>(null)
  const editingData = ref<Record<string, DataRecord>>({})
  const isSaving = ref(false)
  /** 校验错误信息 */
  const validationErrors = ref<RowValidationError[]>([])

  /** 配置切换时丢弃草稿；已经发出的业务请求仍由调用方负责取消。 */
  const invalidate = () => {
    revision++
    editingRowKey.value = null
    editingData.value = {}
    validationErrors.value = []
  }

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
    if (!rowData || isSaving.value) return false

    editingRowKey.value = rowKey
    editingData.value = { [String(rowKey)]: cloneData(rowData) }
    validationErrors.value = []
    return true
  }

  /**
   * 取消当前行编辑，调用取消回调并清理编辑状态
   */
  const cancelEditRow = async () => {
    if (editingRowKey.value === null || isSaving.value) return

    const currentData = options.data()
    if (!currentData || !Array.isArray(currentData)) return

    const rowIndex = currentData.findIndex(
      row => options.rowKey(row) === editingRowKey.value
    )

    isSaving.value = true
    try {
      if (rowIndex > -1)
        await options.onCancel?.(currentData[rowIndex], rowIndex)
      editingRowKey.value = null
      editingData.value = {}
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 校验当前编辑行数据
   */
  const validateSnapshot = async (
    rowData: DataRecord,
    expectedKey: DataTableRowKey
  ): Promise<boolean> => {
    const expectedRevision = revision
    const tasks = (options.columns?.() || [])
      .filter(col => col.editable !== false && col.editProps?.rules?.length)
      .map(async col => {
        const key = typeof col.key === 'string' ? col.key : ''
        if (!key) return null
        const results = await Promise.all(
          col.editProps!.rules!.map(rule =>
            validateTableRule(rule, rowData[key], col.title || key, rowData)
          )
        )
        const firstError = results.find(Boolean)
        return firstError ? { field: key, message: firstError } : null
      })
    const errors = (await Promise.all(tasks)).filter(
      Boolean
    ) as RowValidationError[]
    if (revision !== expectedRevision) return false
    if (editingRowKey.value === expectedKey) validationErrors.value = errors
    return errors.length === 0
  }

  const validateRow = async (): Promise<boolean> => {
    const key = editingRowKey.value
    if (key === null) return true
    const snapshot = editingData.value[String(key)]
    return snapshot ? validateSnapshot(cloneData(snapshot), key) : true
  }

  /** Lock identity and payload before the first async validation step. */
  const saveEditRow = async () => {
    const key = editingRowKey.value
    if (key === null || isSaving.value) return
    const snapshot = editingData.value[String(key)]
    if (!snapshot) return
    const updatedData = cloneData(snapshot)
    const expectedRevision = revision
    const original = findRowData(key)
    isSaving.value = true
    try {
      if (!(await validateSnapshot(updatedData, key))) return
      if (revision !== expectedRevision) return
      const currentData = options.data()
      const rowIndex = currentData.findIndex(row => options.rowKey(row) === key)
      if (rowIndex === -1 || currentData[rowIndex] !== original) return
      await options.onSave?.(updatedData, rowIndex, key)
      if (revision !== expectedRevision) return
      editingRowKey.value = null
      editingData.value = {}
      return { updatedData, rowIndex }
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 获取指定行的编辑中数据
   */
  const getEditingRowData = (rowKey: DataTableRowKey) => {
    if (editingRowKey.value !== rowKey) return undefined
    return editingData.value[String(rowKey)]
  }

  /**
   * 更新指定行编辑中的字段值
   */
  const updateEditingRowData = (
    rowKey: DataTableRowKey,
    field: string,
    value: unknown
  ) => {
    const rowData = getEditingRowData(rowKey)
    if (!rowData || isSaving.value) return
    rowData[field] = cloneData(value)
  }

  return {
    editingRowKey,
    editingData,
    isSaving,
    isEditingRow,
    startEditRow,
    cancelEditRow,
    saveEditRow,
    validateRow,
    validationErrors,
    getEditingRowData,
    updateEditingRowData,
    findRowData,
    invalidate,
  }
}
