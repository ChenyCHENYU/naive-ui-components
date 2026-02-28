/*
 * @Description: 可编辑行组合函数，提供表格整行的编辑功能
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref } from "vue";
import type { DataTableRowKey } from "naive-ui/es";
import type { DataRecord } from "../types";

/**
 * 行编辑配置选项
 */
export interface RowEditOptions {
  data: () => DataRecord[];
  rowKey: (row: DataRecord) => DataTableRowKey;
  onSave?: (rowData: DataRecord, rowIndex: number) => void | Promise<void>;
  onCancel?: (rowData: DataRecord, rowIndex: number) => void;
}

/**
 * 可编辑行组合函数，提供表格整行的编辑功能
 */
export function useRowEdit(options: RowEditOptions) {
  const editingRowKey = ref<DataTableRowKey | null>(null);
  const editingData = ref<Record<string, DataRecord>>({});

  /**
   * 检查指定行是否正在编辑状态
   */
  const isEditingRow = (rowKey: DataTableRowKey) => {
    return editingRowKey.value === rowKey;
  };

  /**
   * 根据rowKey实时查找最新的行数据
   */
  const findRowData = (rowKey: DataTableRowKey) => {
    const currentData = options.data();
    if (!currentData || !Array.isArray(currentData)) {
      return null;
    }
    return currentData.find((row) => options.rowKey(row) === rowKey);
  };

  /**
   * 开始编辑指定行，将原始数据复制到编辑缓存中
   */
  const startEditRow = (rowKey: DataTableRowKey) => {
    const rowData = findRowData(rowKey);
    if (!rowData) return;

    editingRowKey.value = rowKey;
    editingData.value[rowKey as string] = { ...rowData };
  };

  /**
   * 取消当前行编辑，调用取消回调并清理编辑状态
   */
  const cancelEditRow = async () => {
    if (!editingRowKey.value) return;

    const currentData = options.data();
    if (!currentData || !Array.isArray(currentData)) return;

    const rowIndex = currentData.findIndex(
      (row) => options.rowKey(row) === editingRowKey.value,
    );

    if (rowIndex > -1) {
      await options.onCancel?.(currentData[rowIndex], rowIndex);
    }

    editingRowKey.value = null;
    editingData.value = {};
  };

  /**
   * 保存当前行编辑，调用保存回调并清理编辑状态
   */
  const saveEditRow = async () => {
    if (!editingRowKey.value) return;

    const rowKey = editingRowKey.value;
    const currentData = options.data();
    if (!currentData || !Array.isArray(currentData)) return;

    const rowIndex = currentData.findIndex(
      (row) => options.rowKey(row) === rowKey,
    );

    if (rowIndex === -1) return;

    const updatedData = editingData.value[rowKey as string];
    if (!updatedData) return;

    await options.onSave?.(updatedData, rowIndex);

    editingRowKey.value = null;
    editingData.value = {};

    return { updatedData, rowIndex };
  };

  /**
   * 获取指定行的编辑中数据
   */
  const getEditingRowData = (rowKey: DataTableRowKey) => {
    return editingData.value[rowKey as string];
  };

  /**
   * 更新指定行编辑中的字段值
   */
  const updateEditingRowData = (
    rowKey: DataTableRowKey,
    field: string,
    value: unknown,
  ) => {
    if (!editingData.value[rowKey as string]) return;
    editingData.value[rowKey as string][field] = value;
  };

  return {
    editingRowKey,
    isEditingRow,
    startEditRow,
    cancelEditRow,
    saveEditRow,
    getEditingRowData,
    updateEditingRowData,
    findRowData,
  };
}
