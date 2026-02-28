/*
 * @Description: 表格配置构建 — 从 config 单一入口合并为内部统一配置对象
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import type { VNodeChild, Ref, ComputedRef } from "vue";
import type { DataTableRowKey } from "naive-ui/es";
import type {
  DataRecord,
  PaginationConfig,
  ParentChildLinkMode,
  SimpleTableActions,
  TableColumn,
} from "../types";
import type { DynamicRowsOptions } from "./useDynamicRow";

/* ================= CRUD 绑定类型 ================= */

/** 可绑定到 C_Table 的 CRUD 对象接口 */
export interface CrudBinding {
  data: Ref<DataRecord[]>;
  loading: Ref<boolean>;
  columns: ComputedRef<TableColumn[]>;
  actions?: ComputedRef<SimpleTableActions>;
  pagination?: ComputedRef<PaginationConfig | null>;
  tableRef?: Ref<unknown>;
  save?: (...args: unknown[]) => unknown;
  handleCancel?: () => void;
  handlePaginationChange?: (page: number, pageSize: number) => void;
  handleRowDelete?: (...args: unknown[]) => void;
  detail?: { show: (...args: unknown[]) => void };
}

/* ================= 使用侧配置类型（对外 API） ================= */

/** C_Table :config prop 的类型 — 所有功能配置收拢在此 */
export interface TableConfig<T extends DataRecord = DataRecord> {
  /** 编辑配置 */
  edit?: EditConfig | boolean;
  /** 操作按钮 */
  actions?: SimpleTableActions<T>;
  /** 分页配置 */
  pagination?: PaginationConfig | boolean;
  /** 展开行配置 */
  expand?: ExpandConfig<T> | boolean;
  /** 选择配置 */
  selection?: SelectionConfig<T> | boolean;
  /** 动态行配置 */
  dynamicRows?: DynamicRowsOptions<T> | boolean;
  /** 工具栏 */
  toolbar?: ToolbarConfig;
  /** 表格显示属性 */
  display?: DisplayConfig;
}

export interface EditConfig {
  enabled?: boolean;
  mode?: "row" | "cell" | "modal" | "both" | "none";
  showRowActions?: boolean;
  modalTitle?: string;
  modalWidth?: number;
}

export interface ExpandConfig<T extends DataRecord = DataRecord> {
  enabled?: boolean;
  defaultExpandedKeys?: DataTableRowKey[];
  onLoadData?: (row: T) => Promise<unknown[]> | unknown[];
  renderContent?: (
    row: T,
    expandData: unknown[],
    loading: boolean,
    childSelection?: unknown,
  ) => VNodeChild;
  rowExpandable?: (row: T) => boolean;
}

export interface SelectionConfig<T extends DataRecord = DataRecord> {
  enabled?: boolean;
  defaultCheckedKeys?: import("naive-ui/es").DataTableRowKey[];
  rowCheckable?: (row: T) => boolean;
  maxSelection?: number;
  childSelection?: {
    enabled?: boolean;
    childRowCheckable?: (childRow: unknown, parentRow: T) => boolean;
  };
  parentChildLink?: {
    enabled?: boolean;
    mode?: ParentChildLinkMode;
  };
}

export interface ToolbarConfig {
  /** 是否显示工具栏 */
  show?: boolean;
  /** 是否启用列设置 */
  columnSettings?: boolean;
}

export interface DisplayConfig {
  striped?: boolean;
  bordered?: boolean;
  singleLine?: boolean;
  size?: "small" | "medium" | "large";
  maxHeight?: number | string;
  scrollX?: number | string;
  columnWidth?: number;
}

/* ================= 内部解析后的扁平配置 ================= */

export interface ResolvedConfig {
  editable: boolean;
  editMode: string;
  showRowActions: boolean;
  modalTitle: string;
  modalWidth: number;
  expandable: boolean;
  defaultExpandedKeys: DataTableRowKey[] | undefined;
  onLoadExpandData:
    | ((row: DataRecord) => Promise<unknown[]> | unknown[])
    | undefined;
  renderExpandContent:
    | ((
        row: DataRecord,
        expandData: unknown[],
        loading: boolean,
        childSelection?: unknown,
      ) => VNodeChild)
    | undefined;
  rowExpandable: ((row: DataRecord) => boolean) | undefined;
  enableSelection: boolean;
  defaultCheckedKeys: DataTableRowKey[] | undefined;
  rowCheckable: ((row: DataRecord) => boolean) | undefined;
  maxSelection: number | undefined;
  enableChildSelection: boolean;
  childRowCheckable:
    | ((childRow: unknown, parentRow: DataRecord) => boolean)
    | undefined;
  enableParentChildLink: boolean;
  parentChildLinkMode: ParentChildLinkMode;
  pagination: PaginationConfig | null;
  dynamicRows: DynamicRowsOptions<DataRecord> | undefined;
  striped: boolean;
  bordered: boolean;
  singleLine: boolean;
  size: string;
  maxHeight: number | string | undefined;
  scrollX: number | string | undefined;
  columnWidth: number;
  showToolbar: boolean;
  enableColumnSettings: boolean;
}

/* ================= 解析逻辑 ================= */

const EDIT_DISABLED: Pick<
  ResolvedConfig,
  "editable" | "editMode" | "showRowActions" | "modalTitle" | "modalWidth"
> = {
  editable: false,
  editMode: "none",
  showRowActions: false,
  modalTitle: "编辑数据",
  modalWidth: 600,
};

const resolveEdit = (
  edit: EditConfig | boolean | undefined,
): Pick<
  ResolvedConfig,
  "editable" | "editMode" | "showRowActions" | "modalTitle" | "modalWidth"
> => {
  if (edit === false || edit === undefined) return EDIT_DISABLED;
  if (edit === true)
    return {
      editable: true,
      editMode: "modal",
      showRowActions: true,
      modalTitle: "编辑数据",
      modalWidth: 600,
    };
  return {
    editable: edit.enabled !== false && edit.mode !== "none",
    editMode: edit.mode || "modal",
    showRowActions: edit.showRowActions !== false && edit.mode !== "none",
    modalTitle: edit.modalTitle || "编辑数据",
    modalWidth: edit.modalWidth || 600,
  };
};

const resolveExpand = (expand: ExpandConfig | boolean | undefined) => {
  if (!expand)
    return {
      expandable: false,
      defaultExpandedKeys: undefined,
      onLoadExpandData: undefined,
      renderExpandContent: undefined,
      rowExpandable: undefined,
    };
  if (expand === true)
    return {
      expandable: true,
      defaultExpandedKeys: undefined,
      onLoadExpandData: undefined,
      renderExpandContent: undefined,
      rowExpandable: undefined,
    };
  return {
    expandable: expand.enabled !== false,
    defaultExpandedKeys: expand.defaultExpandedKeys,
    onLoadExpandData: expand.onLoadData,
    renderExpandContent: expand.renderContent,
    rowExpandable: expand.rowExpandable,
  };
};

const resolveSelection = (selection: SelectionConfig | boolean | undefined) => {
  if (!selection)
    return {
      enableSelection: false,
      defaultCheckedKeys: undefined,
      rowCheckable: undefined,
      maxSelection: undefined,
      enableChildSelection: false,
      childRowCheckable: undefined,
      enableParentChildLink: false,
      parentChildLinkMode: "loose" as ParentChildLinkMode,
    };
  if (selection === true)
    return {
      enableSelection: true,
      defaultCheckedKeys: undefined,
      rowCheckable: undefined,
      maxSelection: undefined,
      enableChildSelection: false,
      childRowCheckable: undefined,
      enableParentChildLink: false,
      parentChildLinkMode: "loose" as ParentChildLinkMode,
    };
  const child = selection.childSelection || {};
  const link = selection.parentChildLink || {};
  return {
    enableSelection: selection.enabled !== false,
    defaultCheckedKeys: selection.defaultCheckedKeys,
    rowCheckable: selection.rowCheckable,
    maxSelection: selection.maxSelection,
    enableChildSelection: child.enabled || false,
    childRowCheckable: child.childRowCheckable,
    enableParentChildLink: link.enabled || false,
    parentChildLinkMode: (link.mode || "loose") as ParentChildLinkMode,
  };
};

const resolvePagination = (
  pagination: PaginationConfig | boolean | undefined,
): { pagination: PaginationConfig | null } => {
  const defaults: PaginationConfig = {
    enabled: true,
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    showQuickJumper: true,
    pageSizes: [10, 20, 50, 100],
    simple: false,
    size: "medium",
  };

  if (pagination === false) return { pagination: null };
  if (pagination === true || pagination === undefined)
    return { pagination: defaults };
  return { pagination: { ...defaults, ...pagination } };
};

const resolveDynamicRows = (
  dynamicRows: DynamicRowsOptions | boolean | undefined,
) => {
  if (!dynamicRows) return { dynamicRows: undefined };
  if (dynamicRows === true) {
    return {
      dynamicRows: {
        enableRadioSelection: true,
        enableAdd: true,
        enableInsert: true,
        enableDelete: true,
        enableCopy: true,
        enableMove: true,
        enablePrint: true,
      },
    };
  }
  return { dynamicRows };
};

const DISPLAY_DEFAULTS: Pick<
  ResolvedConfig,
  | "striped"
  | "bordered"
  | "singleLine"
  | "size"
  | "maxHeight"
  | "scrollX"
  | "columnWidth"
> = {
  striped: true,
  bordered: true,
  singleLine: true,
  size: "medium",
  maxHeight: undefined,
  scrollX: undefined,
  columnWidth: 180,
};

/** 解析 display 配置，合并默认值 */
function resolveDisplay(display: DisplayConfig | undefined) {
  if (!display) return { ...DISPLAY_DEFAULTS };
  return {
    striped: display.striped ?? DISPLAY_DEFAULTS.striped,
    bordered: display.bordered ?? DISPLAY_DEFAULTS.bordered,
    singleLine: display.singleLine ?? DISPLAY_DEFAULTS.singleLine,
    size: display.size ?? DISPLAY_DEFAULTS.size,
    maxHeight: display.maxHeight,
    scrollX: display.scrollX,
    columnWidth: display.columnWidth ?? DISPLAY_DEFAULTS.columnWidth,
  };
}

const resolveToolbar = (toolbar: ToolbarConfig | undefined) => ({
  showToolbar: toolbar?.show !== false,
  enableColumnSettings: toolbar?.columnSettings !== false,
});

/* ================= 主配置函数 ================= */

/**
 * 将 config 单一对象解析为内部扁平化配置
 */
export function resolveConfig(config: TableConfig = {}): ResolvedConfig {
  return {
    ...resolveEdit(config.edit),
    ...resolveExpand(config.expand),
    ...resolveSelection(config.selection),
    ...resolvePagination(config.pagination),
    ...resolveDynamicRows(config.dynamicRows),
    ...resolveDisplay(config.display),
    ...resolveToolbar(config.toolbar),
  };
}

/* ================= 编辑模式检查器 ================= */

export const createEditModeChecker = (config: ResolvedConfig) => ({
  isNonEditable: (column: TableColumn) =>
    !config.editable || column.editable === false || config.editMode === "none",
  isRowEditMode: () => ["row", "both"].includes(config.editMode),
  isCellEditMode: () => ["cell", "both"].includes(config.editMode),
});
