/*
 * @Description: 表格展开功能
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { h, ref, computed, unref, watchEffect, nextTick } from "vue";
import type { VNodeChild, Ref } from "vue";
import { type DataTableRowKey, NSpin, NDataTable } from "naive-ui/es";
import type {
  TableColumn,
  UseTableExpandOptions,
  UseTableExpandReturn,
  ChildSelectionState,
  DataRecord,
} from "../types";

/* ================= 核心状态管理 ================= */
const useExpandState = <T extends DataRecord, C>(
  options: UseTableExpandOptions<T, C>,
) => {
  const expandedKeys = ref<DataTableRowKey[]>([
    ...(options.defaultExpandedKeys || []),
  ]);
  const expandDataMap = ref(new Map<DataTableRowKey, any>()) as Ref<
    Map<DataTableRowKey, C[]>
  >;
  const loadingMap = ref(new Map<DataTableRowKey, boolean>());

  const checkedKeys = options.enableSelection
    ? ref<DataTableRowKey[]>([...(options.defaultCheckedKeys || [])])
    : ref<DataTableRowKey[]>([]);

  const childSelections = options.enableChildSelection
    ? ref(new Map<DataTableRowKey, DataTableRowKey[]>())
    : ref(new Map<DataTableRowKey, DataTableRowKey[]>());

  return {
    expandedKeys,
    expandDataMap,
    loadingMap,
    checkedKeys,
    childSelections,
  } as const;
};

/* ================= 数据工具函数 ================= */
const useDataUtils = <T extends DataRecord, C>(
  options: UseTableExpandOptions<T, C>,
) => {
  const data = computed(() => unref(options.data));

  const getRowKey = options.rowKey;
  const getChildRowKey =
    options.childRowKey || ((child: C): DataTableRowKey => (child as any).id);

  const findRow = (key: DataTableRowKey): T | undefined =>
    data.value.find((row) => getRowKey(row) === key);

  const isRowExpandable = options.rowExpandable || ((): boolean => true);
  const isRowCheckable = options.rowCheckable || ((): boolean => true);
  const isChildRowCheckable =
    options.childRowCheckable || ((): boolean => true);

  return {
    data,
    getRowKey,
    getChildRowKey,
    findRow,
    isRowExpandable,
    isRowCheckable,
    isChildRowCheckable,
  } as const;
};

/* ================= 展开逻辑 ================= */
const useExpandLogic = <T extends DataRecord, C>(
  state: ReturnType<typeof useExpandState<T, C>>,
  utils: ReturnType<typeof useDataUtils<T, C>>,
  options: UseTableExpandOptions<T, C>,
) => {
  const loadData = async (row: T): Promise<C[]> => {
    if (!options.onLoadData) return [];

    const key = utils.getRowKey(row);
    const existingData = state.expandDataMap.value.get(key);
    if (existingData) return existingData;

    state.loadingMap.value.set(key, true);

    try {
      const data = await options.onLoadData(row);
      const result = data || [];
      state.expandDataMap.value.set(key, result as any);

      if (
        options.enableChildSelection &&
        !state.childSelections.value.has(key)
      ) {
        state.childSelections.value.set(key, []);
      }

      return result;
    } catch (error) {
      console.error("加载展开数据失败:", error);
      return [];
    } finally {
      state.loadingMap.value.set(key, false);
    }
  };

  const handleRowExpand = async (row: T, expanded: boolean): Promise<void> => {
    const key = utils.getRowKey(row);

    if (expanded) {
      await loadData(row);
      if (!state.expandedKeys.value.includes(key)) {
        state.expandedKeys.value = [...state.expandedKeys.value, key];
      }
    } else {
      state.expandedKeys.value = state.expandedKeys.value.filter(
        (k) => k !== key,
      );
    }

    options.onExpandChange?.(state.expandedKeys.value);
  };

  const expandAll = async (): Promise<void> => {
    const expandableRows = utils.data.value.filter(utils.isRowExpandable);
    await Promise.allSettled(expandableRows.map(loadData));
    state.expandedKeys.value = expandableRows.map(utils.getRowKey);
    options.onExpandChange?.(state.expandedKeys.value);
  };

  const collapseAll = (): void => {
    state.expandedKeys.value = [];
    state.childSelections.value.clear();
    options.onExpandChange?.(state.expandedKeys.value);
  };

  const handleExpandChange = async (keys: DataTableRowKey[]): Promise<void> => {
    const newExpandedKeys = keys.filter(
      (key) => !state.expandedKeys.value.includes(key),
    );
    const collapsedKeys = state.expandedKeys.value.filter(
      (key) => !keys.includes(key),
    );

    await Promise.all(
      newExpandedKeys.map(async (key) => {
        const row = utils.findRow(key);
        if (row) {
          await loadData(row);
        }
      }),
    );

    for (const key of collapsedKeys) {
      state.childSelections.value.delete(key);
    }

    state.expandedKeys.value = keys;
    options.onExpandChange?.(keys);
  };

  return {
    loadData,
    handleRowExpand,
    expandAll,
    collapseAll,
    handleExpandChange,
  } as const;
};

/* ================= 选择逻辑 ================= */
const useSelectionLogic = <T extends DataRecord, C>(
  state: ReturnType<typeof useExpandState<T, C>>,
  utils: ReturnType<typeof useDataUtils<T, C>>,
  options: UseTableExpandOptions<T, C>,
) => {
  const selectableRows = computed(() =>
    utils.data.value.filter(utils.isRowCheckable),
  );

  const selectedRowsCount = computed(() => state.checkedKeys.value.length);

  const selectAll = (): void => {
    if (!options.enableSelection) return;

    const keys = selectableRows.value.map(utils.getRowKey);
    const finalKeys = options.maxSelection
      ? keys.slice(0, options.maxSelection)
      : keys;

    state.checkedKeys.value = finalKeys;

    const selectedRows = selectableRows.value.filter((row) =>
      finalKeys.includes(utils.getRowKey(row)),
    );

    options.onSelectionChange?.(
      finalKeys,
      selectedRows,
      state.childSelections.value,
    );
  };

  const clearSelection = (): void => {
    if (!options.enableSelection) return;

    state.checkedKeys.value = [];
    options.onSelectionChange?.([], [], state.childSelections.value);
  };

  const handleSelectionChange = (keys: DataTableRowKey[]): void => {
    if (!options.enableSelection) return;

    state.checkedKeys.value = keys;
    const selectedRows = utils.data.value.filter((row) =>
      keys.includes(utils.getRowKey(row)),
    );
    options.onSelectionChange?.(
      keys,
      selectedRows,
      state.childSelections.value,
    );
  };

  return {
    selectAll,
    clearSelection,
    handleSelectionChange,
    selectedRowsCount,
    selectableRows,
  } as const;
};

/* ================= 父子联动逻辑 ================= */
const useParentChildLink = <T extends DataRecord, C>(
  state: ReturnType<typeof useExpandState<T, C>>,
  options: UseTableExpandOptions<T, C>,
) => {
  const isLinkEnabled = Boolean(
    options.enableParentChildLink &&
    options.enableSelection &&
    options.enableChildSelection,
  );

  const handleParentChildLink = (
    parentKey: DataTableRowKey,
    selectedChildKeys: DataTableRowKey[],
    totalChildren: number,
  ): void => {
    if (!isLinkEnabled) return;

    const shouldSelectParent =
      options.parentChildLinkMode === "strict"
        ? selectedChildKeys.length === totalChildren && totalChildren > 0
        : selectedChildKeys.length > 0;

    const currentKeys = [...state.checkedKeys.value];
    const isParentSelected = currentKeys.includes(parentKey);

    if (shouldSelectParent && !isParentSelected) {
      state.checkedKeys.value = [...currentKeys, parentKey];
    } else if (!shouldSelectParent && isParentSelected) {
      state.checkedKeys.value = currentKeys.filter((k) => k !== parentKey);
    }
  };

  return {
    handleParentChildLink,
    isLinkEnabled,
  } as const;
};

/* ================= 子选择逻辑 ================= */
const useChildSelectionLogic = <T extends DataRecord, C>(
  state: ReturnType<typeof useExpandState<T, C>>,
  utils: ReturnType<typeof useDataUtils<T, C>>,
  parentChildLink: ReturnType<typeof useParentChildLink<T, C>>,
  options: UseTableExpandOptions<T, C>,
) => {
  const totalChildSelections = computed(() => {
    if (!options.enableChildSelection) return 0;
    return Array.from(state.childSelections.value.values()).reduce(
      (total, keys) => total + keys.length,
      0,
    );
  });

  const clearAllSelections = (): void => {
    state.checkedKeys.value = [];
    state.childSelections.value.clear();
    options.onSelectionChange?.([], [], state.childSelections.value);
  };

  const handleChildSelectionChange = (
    parentKey: DataTableRowKey,
    childKeys: DataTableRowKey[],
  ): void => {
    if (!options.enableChildSelection) return;

    state.childSelections.value.set(parentKey, childKeys);

    const expandData = state.expandDataMap.value.get(parentKey) || [];
    const selectedChildren = expandData.filter((child: DataRecord) =>
      childKeys.includes(utils.getChildRowKey(child as C)),
    ) as C[];

    options.onChildSelectionChange?.(parentKey, childKeys, selectedChildren);

    if (parentChildLink.isLinkEnabled) {
      parentChildLink.handleParentChildLink(
        parentKey,
        childKeys,
        expandData.length,
      );
    }
  };

  return {
    totalChildSelections,
    clearAllSelections,
    handleChildSelectionChange,
  } as const;
};

/* ================= 渲染辅助函数 ================= */
const createChildSelectionState = <T extends DataRecord, C>(
  parentKey: DataTableRowKey,
  state: ReturnType<typeof useExpandState<T, C>>,
  utils: ReturnType<typeof useDataUtils<T, C>>,
  childLogic: ReturnType<typeof useChildSelectionLogic<T, C>>,
  options: UseTableExpandOptions<T, C>,
): ChildSelectionState | undefined => {
  if (!options.enableChildSelection) return undefined;

  const selectedKeys = state.childSelections.value.get(parentKey) || [];
  const expandData = state.expandDataMap.value.get(parentKey) || [];
  const parent = utils.findRow(parentKey);

  if (!parent) return undefined;

  const checkableChildren = expandData.filter((child: DataRecord) =>
    utils.isChildRowCheckable(child as C, parent),
  );

  const isAllChecked =
    checkableChildren.length > 0 &&
    checkableChildren.every((child: DataRecord) =>
      selectedKeys.includes(utils.getChildRowKey(child as C)),
    );

  return {
    selectedKeys,
    isAllChecked,
    selectAll: () => {
      const allKeys = checkableChildren.map((child: DataRecord) =>
        utils.getChildRowKey(child as C),
      );
      childLogic.handleChildSelectionChange(parentKey, allKeys);
    },
    clearAll: () => {
      childLogic.handleChildSelectionChange(parentKey, []);
    },
  };
};

const createLoadingView = (): VNodeChild => {
  return h("div", { class: "flex justify-center items-center py-8" }, [
    h(NSpin, { size: "small" }),
    h("span", { class: "ml-2 text-gray-500" }, "加载中..."),
  ]);
};

const createEmptyView = (): VNodeChild => {
  return h("div", { class: "text-center py-8 text-gray-400" }, "暂无数据");
};

const createDefaultColumns = (expandData: DataRecord[]): DataRecord[] => {
  if (!expandData.length) return [];

  const firstItem = expandData[0];
  if (!firstItem || typeof firstItem !== "object") return [];

  const dataKeys = Object.keys(firstItem).filter(
    (key) => !["id", "key"].includes(key),
  );

  return [
    {
      title: "序号",
      key: "_index",
      width: 60,
      render: (_: unknown, index: number) => index + 1,
    },
    ...dataKeys.map((key) => ({
      key,
      title: key.charAt(0).toUpperCase() + key.slice(1),
      width: 120,
      ellipsis: { tooltip: true },
    })),
  ];
};

const createDefaultTable = <T extends DataRecord, C>(
  key: DataTableRowKey,
  expandData: DataRecord[],
  childSelection: ChildSelectionState | undefined,
  utils: ReturnType<typeof useDataUtils<T, C>>,
  childLogic: ReturnType<typeof useChildSelectionLogic<T, C>>,
  options: UseTableExpandOptions<T, C>,
): VNodeChild => {
  const columns: Array<Record<string, unknown>> = [];

  if (options.enableChildSelection) {
    columns.push({ type: "selection", multiple: true });
  }

  columns.push(...createDefaultColumns(expandData));

  return h("div", { class: "p-4 bg-gray-50" }, [
    h(
      "div",
      { class: "mb-2 text-sm text-gray-600" },
      `详细信息 (${expandData.length} 条)`,
    ),
    h(NDataTable, {
      data: expandData,
      columns,
      size: "small",
      striped: true,
      checkedRowKeys: childSelection?.selectedKeys || [],
      rowKey: (row: DataRecord) => utils.getChildRowKey(row as C),
      onUpdateCheckedRowKeys: options.enableChildSelection
        ? (keys: DataTableRowKey[]) => {
            childLogic.handleChildSelectionChange(key, keys);
          }
        : undefined,
    }),
  ]);
};

/* ================= 渲染逻辑 ================= */
const useRenderer = <T extends DataRecord, C>(
  state: ReturnType<typeof useExpandState<T, C>>,
  utils: ReturnType<typeof useDataUtils<T, C>>,
  childLogic: ReturnType<typeof useChildSelectionLogic<T, C>>,
  expandLogic: ReturnType<typeof useExpandLogic<T, C>>,
  options: UseTableExpandOptions<T, C>,
) => {
  const renderExpandContent = (row: T): VNodeChild => {
    const key = utils.getRowKey(row);
    const expandData = state.expandDataMap.value.get(key) || [];
    const loading = state.loadingMap.value.get(key) || false;

    if (
      !expandData.length &&
      !loading &&
      state.expandedKeys.value.includes(key)
    ) {
      nextTick(() => {
        expandLogic.loadData(row);
      });
    }

    const childSelection = createChildSelectionState(
      key,
      state,
      utils,
      childLogic,
      options,
    );

    if (options.renderContent) {
      return options.renderContent(
        row,
        expandData as C[],
        loading,
        childSelection,
      );
    }

    if (loading) return createLoadingView();
    if (!expandData.length) return createEmptyView();

    return createDefaultTable(
      key,
      expandData,
      childSelection,
      utils,
      childLogic,
      options,
    );
  };

  const getTableColumns = (originalColumns: TableColumn<T>[]): unknown[] => {
    return originalColumns.map((column) => {
      if ((column as any).type === "selection" && options.enableSelection) {
        return {
          type: "selection",
          disabled: (row: T) => !utils.isRowCheckable(row),
          multiple: !options.maxSelection || options.maxSelection > 1,
        };
      }

      if (
        (column as any).type === "expand" &&
        (options.onLoadData || options.renderContent)
      ) {
        return {
          type: "expand",
          expandable: utils.isRowExpandable,
          renderExpand: renderExpandContent,
        };
      }

      return column;
    });
  };

  return {
    getTableColumns,
  } as const;
};

/* ================= 主函数 ================= */
export function useTableExpand<
  T extends DataRecord = Record<string, any>,
  C = any,
>(options: UseTableExpandOptions<T, C>): UseTableExpandReturn<T, C> {
  const state = useExpandState(options);
  const utils = useDataUtils(options);
  const expandLogic = useExpandLogic(state, utils, options);
  const selectionLogic = useSelectionLogic(state, utils, options);
  const parentChildLink = useParentChildLink(state, options);
  const childLogic = useChildSelectionLogic(
    state,
    utils,
    parentChildLink,
    options,
  );
  const renderer = useRenderer(state, utils, childLogic, expandLogic, options);

  if (options.onSelectionChange && options.enableSelection) {
    watchEffect(() => {
      if (!options.onSelectionChange) return;

      const selectedRows = utils.data.value.filter((row) =>
        state.checkedKeys.value.includes(utils.getRowKey(row)),
      );

      const hasSelection = state.checkedKeys.value.length > 0;
      const hasData = utils.data.value.length > 0;

      if (hasSelection || !hasData) {
        options.onSelectionChange(
          state.checkedKeys.value,
          selectedRows,
          state.childSelections.value,
        );
      }
    });
  }

  const expandRow = async (key: DataTableRowKey): Promise<void> => {
    if (state.expandedKeys.value.includes(key)) return;

    const row = utils.findRow(key);
    if (!row) return;

    await expandLogic.loadData(row);
    state.expandedKeys.value = [...state.expandedKeys.value, key];
    options.onExpandChange?.(state.expandedKeys.value, row, true);
  };

  const initializeData = async (): Promise<void> => {
    const keysToLoad = options.defaultExpandedKeys || [];
    if (keysToLoad.length === 0) return;

    const loadPromises = keysToLoad.map(async (key) => {
      const row = utils.findRow(key);
      if (row && !state.expandDataMap.value.has(key)) {
        await expandLogic.loadData(row);
      }
    });

    await Promise.allSettled(loadPromises);
  };

  if (options.defaultExpandedKeys?.length) {
    nextTick(initializeData);
  }

  return {
    expandedKeys: state.expandedKeys,
    checkedKeys: state.checkedKeys,
    childSelections: state.childSelections,

    selectedRowsCount: selectionLogic.selectedRowsCount,
    totalChildSelections: childLogic.totalChildSelections,

    expandAll: expandLogic.expandAll,
    collapseAll: expandLogic.collapseAll,
    expandRow,
    handleExpandChange: expandLogic.handleExpandChange,

    selectAll: selectionLogic.selectAll,
    clearSelection: selectionLogic.clearSelection,
    clearAllSelections: childLogic.clearAllSelections,
    handleSelectionChange: selectionLogic.handleSelectionChange,

    getTableColumns: renderer.getTableColumns,

    expandDataMap: state.expandDataMap,
    loadingMap: state.loadingMap,
  };
}
