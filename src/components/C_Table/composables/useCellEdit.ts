/*
 * @Description: 可编辑单元格组合函数
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref } from "vue";
import type { DataTableRowKey } from "naive-ui/es";
import type { DataRecord } from "../types";

/**
 * 单元格编辑配置选项
 */
export interface CellEditOptions {
  data: () => DataRecord[];
  rowKey: (row: DataRecord) => DataTableRowKey;
  onSave?: (
    rowData: DataRecord,
    rowIndex: number,
    columnKey: string,
  ) => void | Promise<void>;
}

/**
 * 可编辑单元格组合函数，提供表格单元格的编辑功能
 */
export function useCellEdit(options: CellEditOptions) {
  const editingCell = ref<{
    rowKey: DataTableRowKey | null;
    columnKey: string | null;
  }>({
    rowKey: null,
    columnKey: null,
  });
  const editingData = ref<Record<string, unknown>>({});

  /**
   * 检查指定单元格是否正在编辑状态
   */
  const isEditingCell = (rowKey: DataTableRowKey, columnKey: string) => {
    return (
      editingCell.value.rowKey === rowKey &&
      editingCell.value.columnKey === columnKey
    );
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
   * 开始编辑指定单元格，将原值存储到编辑缓存中
   */
  const startEditCell = (rowKey: DataTableRowKey, columnKey: string) => {
    const rowData = findRowData(rowKey);
    if (!rowData) return;

    editingCell.value = { rowKey, columnKey };
    editingData.value[`${rowKey}-${columnKey}`] = rowData[columnKey];
  };

  /**
   * 保存当前编辑的单元格，调用保存回调并清理编辑状态
   */
  const saveEditCell = async () => {
    const { rowKey, columnKey } = editingCell.value;
    if (!rowKey || !columnKey) return;

    const currentData = options.data();
    if (!currentData || !Array.isArray(currentData)) return;

    const rowIndex = currentData.findIndex(
      (row) => options.rowKey(row) === rowKey,
    );
    if (rowIndex === -1) return;

    const cellKey = `${rowKey}-${columnKey}`;
    const newValue = editingData.value[cellKey];

    const updatedData = {
      ...currentData[rowIndex],
      [columnKey]: newValue,
    };

    await options.onSave?.(updatedData, rowIndex, columnKey);

    editingCell.value = { rowKey: null, columnKey: null };
    delete editingData.value[cellKey];

    return { updatedData, rowIndex, columnKey };
  };

  /**
   * 取消当前单元格编辑，清理编辑状态和缓存数据
   */
  const cancelEditCell = () => {
    const { rowKey, columnKey } = editingCell.value;
    if (rowKey && columnKey) {
      delete editingData.value[`${rowKey}-${columnKey}`];
    }
    editingCell.value = { rowKey: null, columnKey: null };
  };

  /**
   * 获取指定单元格的编辑中数值
   */
  const getEditingCellValue = (rowKey: DataTableRowKey, columnKey: string) => {
    return editingData.value[`${rowKey}-${columnKey}`];
  };

  /**
   * 更新指定单元格的编辑中数值
   */
  const updateEditingCellValue = (
    rowKey: DataTableRowKey,
    columnKey: string,
    value: unknown,
  ) => {
    editingData.value[`${rowKey}-${columnKey}`] = value;
  };

  return {
    editingCell,
    isEditingCell,
    startEditCell,
    saveEditCell,
    cancelEditCell,
    getEditingCellValue,
    updateEditingCellValue,
    findRowData,
  };
}
