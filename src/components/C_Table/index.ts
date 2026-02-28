/*
 * @Description: C_Table 组件库入口
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

export { default as C_Table } from "./index.vue";

/* ================= 类型导出 ================= */
export type {
  TableColumn,
  TableEmits,
  DataRecord,
  MaybeRefLike,
  EditMode,
  ParentChildLinkMode,
  UseTableExpandOptions,
  UseTableExpandReturn,
  ChildSelectionState,
  PaginationConfig,
} from "./types";

/* ================= 组合式函数导出 ================= */
export { useTableColumns } from "./composables/useTableColumns";
export { useTableManager } from "./composables/useTableManager";
export { useTableExpand } from "./composables/useTableExpand";
export { useDynamicRows } from "./composables/useDynamicRow";
export type {
  DynamicRowsOptions,
  DynamicRowsReturn,
} from "./composables/useDynamicRow";
export { useTableActions } from "./composables/useTableActions";
export { usePagination } from "./composables/usePagination";
export { useRowEdit } from "./composables/useRowEdit";
export { useCellEdit } from "./composables/useCellEdit";
export { useModalEdit } from "./composables/useModalEdit";
export {
  resolveConfig,
  createEditModeChecker,
} from "./composables/useTableConfig";
export type { CrudBinding, TableConfig } from "./composables/useTableConfig";
export {
  usePrintWatermark,
  printPresets,
} from "./composables/usePrintWatermark";
export type { PrintWatermarkOptions } from "./composables/usePrintWatermark";
