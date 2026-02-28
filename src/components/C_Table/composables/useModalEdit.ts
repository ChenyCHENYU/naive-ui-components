/*
 * @Description: 模态框编辑组合函数
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref, computed } from "vue";
import type { DataTableRowKey } from "naive-ui/es";

/**
 * 模态框编辑配置选项
 */
export interface ModalEditOptions<T = Record<string, any>> {
  data: () => T[];
  rowKey: (row: T) => DataTableRowKey;
  onSave?: (
    editingData: Record<string, any>,
    rowIndex: number,
  ) => void | Promise<void>;
  onCancel?: (originalData: T, rowIndex: number) => void | Promise<void>;
}

/**
 * 模态框编辑组合函数，提供弹窗形式的数据编辑功能
 */
export function useModalEdit<T = Record<string, any>>(
  options: ModalEditOptions<T>,
) {
  const isModalVisible = ref(false);
  const editingRowKey = ref<DataTableRowKey | null>(null);
  const editingData = ref<Record<string, any>>({});

  /**
   * 计算属性：获取当前编辑行的索引
   */
  const editingRowIndex = computed(() => {
    if (!editingRowKey.value) return -1;
    const currentData = options.data();
    if (!currentData || !Array.isArray(currentData)) return -1;

    return currentData.findIndex(
      (row) => options.rowKey(row) === editingRowKey.value,
    );
  });

  /**
   * 重置编辑状态
   */
  const resetEditingState = () => {
    editingRowKey.value = null;
    editingData.value = {};
  };

  /**
   * 开始编辑指定行
   */
  const startEdit = (rowKey: DataTableRowKey) => {
    console.log("🚀 开始编辑:", rowKey);

    const currentData = options.data();
    if (!currentData || !Array.isArray(currentData)) {
      console.warn("数据源为空或不是数组");
      return;
    }

    const rowIndex = currentData.findIndex(
      (row) => options.rowKey(row) === rowKey,
    );

    if (rowIndex === -1) {
      console.warn("未找到对应的行数据:", rowKey);
      return;
    }

    const rowData = currentData[rowIndex];
    console.log("找到行数据:", rowData);

    editingRowKey.value = rowKey;
    editingData.value = JSON.parse(JSON.stringify(rowData));

    console.log("编辑数据已准备:", editingData.value);

    isModalVisible.value = true;
  };

  /**
   * 保存编辑
   */
  const saveEdit = async (formData?: Record<string, any>) => {
    const dataToSave = formData || editingData.value;
    const currentIndex = editingRowIndex.value;

    console.log("💾 保存编辑:", {
      rowKey: editingRowKey.value,
      index: currentIndex,
      data: dataToSave,
    });

    if (currentIndex === -1) {
      console.warn("无法找到编辑行的索引");
      return;
    }

    try {
      await options.onSave?.(dataToSave, currentIndex);

      isModalVisible.value = false;
      resetEditingState();

      console.log("✅ 保存成功");
    } catch (error) {
      console.error("❌ 保存失败:", error);
      throw error;
    }
  };

  /**
   * 取消编辑
   */
  const cancelEdit = async () => {
    console.log("🚫 取消编辑");

    try {
      const currentIndex = editingRowIndex.value;
      if (editingRowKey.value && currentIndex > -1) {
        const currentData = options.data();
        if (currentData && currentData[currentIndex]) {
          await options.onCancel?.(currentData[currentIndex], currentIndex);
        }
      }
    } finally {
      isModalVisible.value = false;
      resetEditingState();
    }
  };

  /**
   * 更新编辑数据
   */
  const updateEditingData = (data: Record<string, any>) => {
    editingData.value = { ...data };
  };

  /**
   * 获取当前编辑的行数据
   */
  const getEditingRowData = (rowKey: DataTableRowKey) => {
    if (editingRowKey.value === rowKey) {
      return editingData.value;
    }
    return null;
  };

  /**
   * 检查是否正在编辑指定行
   */
  const isEditingRow = (rowKey: DataTableRowKey) => {
    return editingRowKey.value === rowKey && isModalVisible.value;
  };

  return {
    isModalVisible,
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
  };
}
