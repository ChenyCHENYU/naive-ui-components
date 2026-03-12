/*
 * @Description: 表格配置构建 — 从 config 单一入口合并为内部统一配置对象
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import type { VNodeChild, Ref, ComputedRef } from 'vue'
import type { DataTableRowKey } from 'naive-ui/es'
import type {
  DataRecord,
  PaginationConfig,
  ParentChildLinkMode,
  SimpleTableActions,
  TableColumn,
} from '../types'
import type { DynamicRowsOptions } from './useDynamicRow'
import type { RowDragConfig } from './useRowDrag'
import type { CrossPageSelectionConfig } from './useCrossPageSelection'
import type { ExportConfig } from './useTableExport'
import type { FormatterConfig } from './useTableGlobalConfig'

/* ================= CRUD 绑定类型 ================= */

/**
 * 可绑定到 C_Table 的 CRUD 对象接口（桥接类型）
 *
 * C_Table 内部已将 data/columns 规范化为 DataRecord/TableColumn，
 * 此接口对 columns/actions 使用 any[] 避免 TableColumn<any> 结构展开异常，
 * 同时允许 useTableCrud<T>() 任意子类型直接传入而无需类型断言。
 */
export interface CrudBinding {
  data: Ref<any[]>
  loading: Ref<boolean>

  columns: ComputedRef<any[]>

  actions?: ComputedRef<any>

  pagination?: ComputedRef<any>

  tableRef?: Ref<any>

  save?: (...args: any[]) => any
  handleCancel?: () => void
  handlePaginationChange?: (page: number, pageSize: number) => void

  handleRowDelete?: (...args: any[]) => any

  detail?: { show: (...args: any[]) => void }
}

/* ================= 使用侧配置类型（对外 API） ================= */

/** C_Table :config prop 的类型 — 所有功能配置收拢在此 */
export interface TableConfig<T extends DataRecord = DataRecord> {
  /** 编辑配置 */
  edit?: EditConfig | boolean
  /** 操作按钮 */
  actions?: SimpleTableActions<T>
  /** 分页配置 */
  pagination?: PaginationConfig | boolean
  /** 展开行配置 */
  expand?: ExpandConfig<T> | boolean
  /** 选择配置 */
  selection?: SelectionConfig<T> | boolean
  /** 动态行配置 */
  dynamicRows?: DynamicRowsOptions<T> | boolean
  /** 工具栏 */
  toolbar?: ToolbarConfig
  /** 表格显示属性 */
  display?: DisplayConfig
  /** 虚拟滚动配置（大数据量） */
  virtualScroll?: VirtualScrollConfig | boolean
  /** 合计行配置（财务场景） */
  summary?: SummaryConfig<T>
  /** 列拖拽排序 */
  columnDrag?: ColumnDragConfig | boolean
  /** 树形表格 */
  tree?: TreeConfig | boolean
  /** 行拖拽排序 */
  rowDrag?: RowDragConfig | boolean
  /** 跨页多选 */
  crossPageSelection?: CrossPageSelectionConfig | boolean
  /** 导出配置 */
  export?: ExportConfig
  /** 列配置持久化 key（传入即启用 localStorage） */
  persistKey?: string
  /** 全局格式化配置 */
  formatterConfig?: FormatterConfig
  /** 错误状态配置 */
  error?: ErrorConfig
  /** 批量操作配置 */
  batchActions?: BatchActionsConfig
}

export interface EditConfig {
  enabled?: boolean
  mode?: 'row' | 'cell' | 'modal' | 'both' | 'none'
  showRowActions?: boolean
  modalTitle?: string
  modalWidth?: number
}

export interface ExpandConfig<T extends DataRecord = DataRecord> {
  enabled?: boolean
  defaultExpandedKeys?: DataTableRowKey[]
  onLoadData?: (row: T) => Promise<unknown[]> | unknown[]
  renderContent?: (
    row: T,
    expandData: unknown[],
    loading: boolean,
    childSelection?: unknown
  ) => VNodeChild
  rowExpandable?: (row: T) => boolean
}

export interface SelectionConfig<T extends DataRecord = DataRecord> {
  enabled?: boolean
  defaultCheckedKeys?: import('naive-ui/es').DataTableRowKey[]
  rowCheckable?: (row: T) => boolean
  maxSelection?: number
  childSelection?: {
    enabled?: boolean
    childRowCheckable?: (childRow: unknown, parentRow: T) => boolean
  }
  parentChildLink?: {
    enabled?: boolean
    mode?: ParentChildLinkMode
  }
}

export interface ToolbarConfig {
  /** 是否显示工具栏 */
  show?: boolean
  /** 是否启用列设置 */
  columnSettings?: boolean
}

export interface DisplayConfig {
  striped?: boolean
  bordered?: boolean
  singleLine?: boolean
  size?: 'small' | 'medium' | 'large'
  maxHeight?: number | string
  scrollX?: number | string
  columnWidth?: number
}

/** 虚拟滚动配置 */
export interface VirtualScrollConfig {
  enabled?: boolean
  /** 每行高度（px） */
  itemHeight?: number
  /** 最大高度（px），用于滚动容器 */
  maxHeight?: number
}

/** 合计行配置 */
export interface SummaryConfig<T extends DataRecord = DataRecord> {
  /** 合计行位置 */
  position?: 'top' | 'bottom'
  /** 自定义合计函数，每列返回 { value, colSpan? } */
  render?: (
    data: T[]
  ) => Record<string, { value: string | number; colSpan?: number }>
}

/** 列拖拽排序配置 */
export interface ColumnDragConfig {
  enabled?: boolean
  /** 拖拽手柄类名（默认拖拽头部区域） */
  handleClass?: string
  /** 拖拽动画时长（ms） */
  animationDuration?: number
}

/** 树形表格配置 */
export interface TreeConfig {
  enabled?: boolean
  /** 子节点字段名 */
  childrenKey?: string
  /** 缩进宽度（px） */
  indent?: number
  /** 默认展开所有 */
  defaultExpandAll?: boolean
}

/** 错误状态配置 */
export interface ErrorConfig {
  /** 是否显示错误状态 */
  show?: boolean
  /** 错误描述文案 */
  message?: string
  /** 重试回调 */
  onRetry?: () => void | Promise<void>
}

/** 批量操作配置 */
export interface BatchActionsConfig {
  enabled?: boolean
  /** 自定义批量操作按钮 */
  actions?: Array<{
    key: string
    label: string
    icon?: string
    type?: string
    onClick: (
      selectedKeys: DataTableRowKey[],
      selectedRows: DataRecord[]
    ) => void | Promise<void>
  }>
}

/* ================= 内部解析后的扁平配置 ================= */

export interface ResolvedConfig {
  editable: boolean
  editMode: string
  showRowActions: boolean
  modalTitle: string
  modalWidth: number
  expandable: boolean
  defaultExpandedKeys: DataTableRowKey[] | undefined
  onLoadExpandData:
    | ((row: DataRecord) => Promise<unknown[]> | unknown[])
    | undefined
  renderExpandContent:
    | ((
        row: DataRecord,
        expandData: unknown[],
        loading: boolean,
        childSelection?: unknown
      ) => VNodeChild)
    | undefined
  rowExpandable: ((row: DataRecord) => boolean) | undefined
  enableSelection: boolean
  defaultCheckedKeys: DataTableRowKey[] | undefined
  rowCheckable: ((row: DataRecord) => boolean) | undefined
  maxSelection: number | undefined
  enableChildSelection: boolean
  childRowCheckable:
    | ((childRow: unknown, parentRow: DataRecord) => boolean)
    | undefined
  enableParentChildLink: boolean
  parentChildLinkMode: ParentChildLinkMode
  pagination: PaginationConfig | null
  dynamicRows: DynamicRowsOptions<DataRecord> | undefined
  striped: boolean
  bordered: boolean
  singleLine: boolean
  size: 'small' | 'medium' | 'large'
  maxHeight: number | string | undefined
  scrollX: number | string | undefined
  columnWidth: number
  showToolbar: boolean
  enableColumnSettings: boolean
  /** 虚拟滚动 */
  virtualScroll: boolean
  virtualItemHeight: number
  virtualMaxHeight: number
  /** 合计行 */
  summaryPosition: 'top' | 'bottom' | undefined
  summaryRender:
    | ((
        data: DataRecord[]
      ) => Record<string, { value: string | number; colSpan?: number }>)
    | undefined
  /** 列拖拽 */
  enableColumnDrag: boolean
  columnDragHandleClass: string
  columnDragAnimationDuration: number
  /** 树形表格 */
  treeEnabled: boolean
  treeChildrenKey: string
  treeIndent: number
  treeDefaultExpandAll: boolean
  /** 行拖拽 */
  rowDrag: RowDragConfig | undefined
  /** 跨页多选 */
  crossPageSelection: CrossPageSelectionConfig | undefined
  /** 导出配置 */
  exportConfig: ExportConfig | undefined
  /** 列持久化 key */
  persistKey: string | undefined
  /** 全局格式化配置 */
  formatterConfig: FormatterConfig | undefined
  /** 错误状态 */
  error: ErrorConfig | undefined
  /** 批量操作 */
  batchActions: BatchActionsConfig | undefined
}

/* ================= 解析逻辑 ================= */

const EDIT_DISABLED: Pick<
  ResolvedConfig,
  'editable' | 'editMode' | 'showRowActions' | 'modalTitle' | 'modalWidth'
> = {
  editable: false,
  editMode: 'none',
  showRowActions: false,
  modalTitle: '编辑数据',
  modalWidth: 600,
}

const resolveEdit = (
  edit: EditConfig | boolean | undefined
): Pick<
  ResolvedConfig,
  'editable' | 'editMode' | 'showRowActions' | 'modalTitle' | 'modalWidth'
> => {
  if (edit === false || edit === undefined) return EDIT_DISABLED
  if (edit === true)
    return {
      editable: true,
      editMode: 'modal',
      showRowActions: true,
      modalTitle: '编辑数据',
      modalWidth: 600,
    }
  return {
    editable: edit.enabled !== false && edit.mode !== 'none',
    editMode: edit.mode || 'modal',
    showRowActions: edit.showRowActions !== false && edit.mode !== 'none',
    modalTitle: edit.modalTitle || '编辑数据',
    modalWidth: edit.modalWidth || 600,
  }
}

const resolveExpand = (expand: ExpandConfig | boolean | undefined) => {
  if (!expand)
    return {
      expandable: false,
      defaultExpandedKeys: undefined,
      onLoadExpandData: undefined,
      renderExpandContent: undefined,
      rowExpandable: undefined,
    }
  if (expand === true)
    return {
      expandable: true,
      defaultExpandedKeys: undefined,
      onLoadExpandData: undefined,
      renderExpandContent: undefined,
      rowExpandable: undefined,
    }
  return {
    expandable: expand.enabled !== false,
    defaultExpandedKeys: expand.defaultExpandedKeys,
    onLoadExpandData: expand.onLoadData,
    renderExpandContent: expand.renderContent,
    rowExpandable: expand.rowExpandable,
  }
}

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
      parentChildLinkMode: 'loose' as ParentChildLinkMode,
    }
  if (selection === true)
    return {
      enableSelection: true,
      defaultCheckedKeys: undefined,
      rowCheckable: undefined,
      maxSelection: undefined,
      enableChildSelection: false,
      childRowCheckable: undefined,
      enableParentChildLink: false,
      parentChildLinkMode: 'loose' as ParentChildLinkMode,
    }
  const child = selection.childSelection || {}
  const link = selection.parentChildLink || {}
  return {
    enableSelection: selection.enabled !== false,
    defaultCheckedKeys: selection.defaultCheckedKeys,
    rowCheckable: selection.rowCheckable,
    maxSelection: selection.maxSelection,
    enableChildSelection: child.enabled || false,
    childRowCheckable: child.childRowCheckable,
    enableParentChildLink: link.enabled || false,
    parentChildLinkMode: (link.mode || 'loose') as ParentChildLinkMode,
  }
}

const resolvePagination = (
  pagination: PaginationConfig | boolean | undefined
): { pagination: PaginationConfig | null } => {
  const defaults: PaginationConfig = {
    enabled: true,
    page: 1,
    pageSize: 10,
    showSizePicker: true,
    showQuickJumper: true,
    pageSizes: [10, 20, 50, 100],
    simple: false,
    size: 'medium',
  }

  if (pagination === false) return { pagination: null }
  if (pagination === true || pagination === undefined)
    return { pagination: defaults }
  return { pagination: { ...defaults, ...pagination } }
}

const resolveDynamicRows = (
  dynamicRows: DynamicRowsOptions | boolean | undefined
) => {
  if (!dynamicRows) return { dynamicRows: undefined }
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
    }
  }
  return { dynamicRows }
}

const DISPLAY_DEFAULTS: Pick<
  ResolvedConfig,
  | 'striped'
  | 'bordered'
  | 'singleLine'
  | 'size'
  | 'maxHeight'
  | 'scrollX'
  | 'columnWidth'
> = {
  striped: true,
  bordered: true,
  singleLine: true,
  size: 'medium',
  maxHeight: undefined,
  scrollX: undefined,
  columnWidth: 180,
}

/** 解析 display 配置，合并默认值 */
function resolveDisplay(display: DisplayConfig | undefined) {
  if (!display) return { ...DISPLAY_DEFAULTS }
  return {
    striped: display.striped ?? DISPLAY_DEFAULTS.striped,
    bordered: display.bordered ?? DISPLAY_DEFAULTS.bordered,
    singleLine: display.singleLine ?? DISPLAY_DEFAULTS.singleLine,
    size: display.size ?? DISPLAY_DEFAULTS.size,
    maxHeight: display.maxHeight,
    scrollX: display.scrollX,
    columnWidth: display.columnWidth ?? DISPLAY_DEFAULTS.columnWidth,
  }
}

const resolveToolbar = (toolbar: ToolbarConfig | undefined) => ({
  showToolbar: toolbar?.show !== false,
  enableColumnSettings: toolbar?.columnSettings !== false,
})

const resolveVirtualScroll = (
  vs: VirtualScrollConfig | boolean | undefined
) => {
  if (!vs)
    return {
      virtualScroll: false,
      virtualItemHeight: 34,
      virtualMaxHeight: 600,
    }
  if (vs === true)
    return { virtualScroll: true, virtualItemHeight: 34, virtualMaxHeight: 600 }
  return {
    virtualScroll: vs.enabled !== false,
    virtualItemHeight: vs.itemHeight ?? 34,
    virtualMaxHeight: vs.maxHeight ?? 600,
  }
}

const resolveSummary = (summary: SummaryConfig | undefined) => {
  if (!summary) return { summaryPosition: undefined, summaryRender: undefined }
  return {
    summaryPosition: summary.position ?? 'bottom',
    summaryRender: summary.render,
  }
}

const resolveColumnDrag = (cd: ColumnDragConfig | boolean | undefined) => {
  if (!cd)
    return {
      enableColumnDrag: false,
      columnDragHandleClass: 'drag-handle',
      columnDragAnimationDuration: 150,
    }
  if (cd === true)
    return {
      enableColumnDrag: true,
      columnDragHandleClass: 'drag-handle',
      columnDragAnimationDuration: 150,
    }
  return {
    enableColumnDrag: cd.enabled !== false,
    columnDragHandleClass: cd.handleClass ?? 'drag-handle',
    columnDragAnimationDuration: cd.animationDuration ?? 150,
  }
}

const resolveTree = (tree: TreeConfig | boolean | undefined) => {
  if (!tree)
    return {
      treeEnabled: false,
      treeChildrenKey: 'children',
      treeIndent: 16,
      treeDefaultExpandAll: false,
    }
  if (tree === true)
    return {
      treeEnabled: true,
      treeChildrenKey: 'children',
      treeIndent: 16,
      treeDefaultExpandAll: false,
    }
  return {
    treeEnabled: tree.enabled !== false,
    treeChildrenKey: tree.childrenKey ?? 'children',
    treeIndent: tree.indent ?? 16,
    treeDefaultExpandAll: tree.defaultExpandAll ?? false,
  }
}

const resolveRowDrag = (
  rd: RowDragConfig | boolean | undefined
): { rowDrag: RowDragConfig | undefined } => {
  if (!rd) return { rowDrag: undefined }
  if (rd === true) return { rowDrag: { enabled: true } }
  return { rowDrag: rd.enabled !== false ? rd : undefined }
}

const resolveCrossPageSelection = (
  cps: CrossPageSelectionConfig | boolean | undefined
): { crossPageSelection: CrossPageSelectionConfig | undefined } => {
  if (!cps) return { crossPageSelection: undefined }
  if (cps === true) return { crossPageSelection: { enabled: true } }
  return { crossPageSelection: cps.enabled !== false ? cps : undefined }
}

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
    ...resolveVirtualScroll(config.virtualScroll),
    ...resolveSummary(config.summary),
    ...resolveColumnDrag(config.columnDrag),
    ...resolveTree(config.tree),
    ...resolveRowDrag(config.rowDrag),
    ...resolveCrossPageSelection(config.crossPageSelection),
    exportConfig: config.export,
    persistKey: config.persistKey,
    formatterConfig: config.formatterConfig,
    error: config.error,
    batchActions: config.batchActions,
  }
}

/* ================= 编辑模式检查器 ================= */

export const createEditModeChecker = (config: ResolvedConfig) => ({
  isNonEditable: (column: TableColumn) =>
    !config.editable || column.editable === false || config.editMode === 'none',
  isRowEditMode: () => ['row', 'both'].includes(config.editMode),
  isCellEditMode: () => ['cell', 'both'].includes(config.editMode),
})
