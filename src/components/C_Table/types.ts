import type { ColumnStatus } from './columnPresentation'
/*
 * @Description: 表格类型系统
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import type { MaybeRef, VNodeChild, Ref, ComputedRef } from 'vue'
import type {
  DataTableBaseColumn,
  DataTableRowKey,
  FormItemRule,
  PaginationProps,
} from 'naive-ui'
import type { TableConfig, CrudBinding } from './composables/useTableConfig'
import type { UseCrossPageSelectionReturn } from './composables/useCrossPageSelection'
import type { ColumnFormatter } from './composables/useTableGlobalConfig'
import type { ComponentFeedback, ComponentLocale } from '../../config'
import type { DictionaryBinding } from '../../core/dictionary'

/* 宽松的 Ref-like 类型，支持跨 Vue 实例的 Ref 传递 */
type RefLike<T> = { value: T } | T
type MaybeRefLike<T> = RefLike<T> | MaybeRef<T>

/* ================= 核心类型定义 ================= */
export type DataRecord = Record<string, unknown>
export type TableRowKey<T extends object = DataRecord> =
  Extract<keyof T, string> | ((row: T) => DataTableRowKey)
export interface TableRowKeyIssue<T extends object = DataRecord> {
  type: 'missing' | 'duplicate' | 'error'
  row: T
  index: number
  key?: DataTableRowKey
  firstIndex?: number
  cause?: unknown
}
export type EditMode = 'row' | 'cell' | 'both' | 'modal' | 'none'
export type EditType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'date'
  | 'number'
  | 'switch'
  | 'email'
  | 'mobile'
export type ButtonType =
  'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
export type ParentChildLinkMode = 'strict' | 'loose'

/* ================= 分页相关类型 ================= */
export interface PaginationConfig {
  enabled?: boolean
  page?: number
  pageSize?: number
  total?: number
  showSizePicker?: boolean
  showQuickJumper?: boolean
  pageSizes?: number[]
  simple?: boolean
  size?: 'small' | 'medium' | 'large'
  remote?: boolean
}

/* ================= Actions 配置类型 ================= */
/** API 函数类型 */
export type ApiFunction<T extends object = DataRecord> = (
  row: T,
  index: number
) => unknown | Promise<unknown>

/** 渲染函数类型 */
export type RenderFunction<T extends object = DataRecord> = (
  row: T,
  index: number
) => VNodeChild

/** 自定义操作按钮配置 */
export interface CustomAction<T extends object = DataRecord> {
  /** 按钮唯一键 */
  key: string
  /** 按钮显示文本 */
  label: string | ((row: T, index: number) => string)
  /** 按钮图标 */
  icon: string | ((row: T, index: number) => string)
  /** 按钮类型样式 */
  type?: ButtonType | ((row: T, index: number) => ButtonType)
  /** 点击事件处理器 */
  onClick: (row: T, index: number) => unknown
  /** 条件显示函数（可选） */
  show?: (row: T, index: number) => boolean
  /** 是否禁用（可选） */
  disabled?: (row: T, index: number) => boolean
  /** 按钮提示文本（可选） */
  tooltip?: string
}

/** 简化的操作配置 - 二元法则 */
export interface SimpleTableActions<T extends object = DataRecord> {
  /** 编辑操作 - 直接传入函数 */
  edit?: false | ApiFunction<T>
  /** 删除操作 - 直接传入函数 */
  delete?: false | ApiFunction<T>
  /** 详情操作 - 直接传入函数 */
  detail?: false | ApiFunction<T>
  /** 自定义操作按钮 */
  custom?: CustomAction<T>[]
  /** 完全自定义渲染 - 10%场景 */
  render?: RenderFunction<T>
}

/** Minimal edit-state contract consumed by the action renderer. */
export interface TableActionsManager<T extends object = DataRecord> {
  editStates: {
    modalEdit: {
      startEdit: (rowKey: DataTableRowKey, sourceData?: T) => boolean | void
    }
    rowEdit: {
      isEditingRow: (rowKey: DataTableRowKey) => boolean
      startEditRow: (rowKey: DataTableRowKey) => boolean | void
      cancelEditRow: () => void | Promise<void>
      saveEditRow: () => Promise<unknown>
    }
  }
}

/** useTableActions Hook 选项类型 */
export interface UseTableActionsOptions<T extends object = DataRecord> {
  /** 操作配置 */
  actions: Ref<SimpleTableActions<T>> | ComputedRef<SimpleTableActions<T>>
  /** 表格配置 */
  config:
    | Ref<{
        editable: boolean
        editMode: string
        controlSize?: 'small' | 'medium' | 'large'
        feedback?: ComponentFeedback
        locale?: ComponentLocale
      }>
    | ComputedRef<{
        editable: boolean
        editMode: string
        controlSize?: 'small' | 'medium' | 'large'
        feedback?: ComponentFeedback
        locale?: ComponentLocale
      }>
  /** 表格管理器 */
  tableManager: TableActionsManager<T>
  /** 行键获取函数 */
  rowKey: (row: T) => DataTableRowKey
  /** 事件发射器 */
  /** Deletion action completion notification; kept separate from CRUD data mutation. */
  onRowDeleted?: (row: T, index: number) => void
  /** A bound CRUD action may already report success or failure to the user. */
  isDeleteFeedbackHandled?: (action: ApiFunction<T>) => boolean
  /** 查看详情回调 */
  onViewDetail?: (data: T) => void
}

/** useTableActions Hook 返回类型 */
export interface UseTableActionsReturn<T extends object = DataRecord> {
  /** 渲染操作列 */
  renderActions: (rowData: T, rowIndex: number) => VNodeChild
  /** 检查操作是否启用 */
  isActionEnabled: (actionKey: 'edit' | 'delete' | 'detail') => boolean
}

/* ================= 工具类型 ================= */
export type ValueOf<T> = T[keyof T]
export type OptionalKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]
export type RequiredKeys<T> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]
export type SafeRecord<K extends string | number | symbol, V> = { [P in K]: V }

/* 基础选项接口 */
export interface BaseOption {
  label: string
  value: string | number
  disabled?: boolean
}

/* 基础配置接口 */
export interface BaseConfig<T extends object = DataRecord> {
  enabled?: boolean
  rowCheckable?: (row: T) => boolean
}

/* ================= 数据映射类型 ================= */
export type SelectOption = BaseOption

/* ================= 编辑相关类型 ================= */
export interface EditProps {
  min?: number
  max?: number
  step?: number
  showButton?: boolean
  type?: string
  rows?: number
  placeholder?: string
  options?: SelectOption[]
  rules?: FormItemRule[]
  format?: string
  valueFormat?: string
  clearable?: boolean
  disabled?: boolean
  readonly?: boolean
}

/**
 * ================= 列类型系统 =================
 * 说明：
 * - BaseTableColumn：去除了 naive 的 key/title/render，提供扩展位
 * - NormalTableColumn：普通数据列，必须有 key + title
 * - BuiltInTableColumn：内置列（selection/expand），不需要 key/title
 * - TableColumn：以上二者联合
 */
interface BaseTableColumn<T extends object = DataRecord> extends Omit<
  DataTableBaseColumn<T>,
  'key' | 'title' | 'render' | 'type'
> {
  key?: DataTableRowKey
  title?: string
  visible?: boolean
  editable?: boolean
  required?: boolean
  editType?: EditType
  editProps?: EditProps
  editRender?: (
    value: unknown,
    rowData: T,
    rowIndex: number,
    context: { onUpdate: (value: unknown) => void }
  ) => VNodeChild
  render?: (rowData: T, rowIndex: number) => VNodeChild
  /** 声明式格式化器（优先级低于 render） */
  formatter?: ColumnFormatter
  /** true 使用默认状态色；映射值为颜色，或 { label, color }。render 优先。 */
  status?: ColumnStatus
  /** 未声明 width 时默认按内容测宽；false 使用 display.columnWidth。 */
  autoWidth?: boolean
  /** 字典显示低于 render/formatter；编辑时显式 editProps.options 优先。 */
  dictionary?: DictionaryBinding
  fixed?: 'left' | 'right'
  resizable?: boolean
  minWidth?: number
  maxWidth?: number
}

export interface NormalTableColumn<
  T extends object = DataRecord,
> extends BaseTableColumn<T> {
  type?: never
  key: Extract<keyof T, DataTableRowKey> | DataTableRowKey
  title: string
}

export interface BuiltInTableColumn<
  T extends object = DataRecord,
> extends BaseTableColumn<T> {
  /** 内置列类型：无需 key / title */
  type: 'selection' | 'expand' | 'index'
  /** 原生选择列禁用判定；与 config.selection.rowCheckable 一起生效。 */
  disabled?: (row: T) => boolean
  /** 原生选择列是否多选；maxSelection=1 时仍使用单选。 */
  multiple?: boolean
  /** 原生展开列判定；与 config.expand.rowExpandable 一起生效。 */
  expandable?: (row: T) => boolean
  /** 展开行渲染函数（仅当 type = expand 时有效） */
  renderExpand?: (rowData: T, rowIndex: number) => VNodeChild
}

export type TableColumn<T extends object = DataRecord> =
  NormalTableColumn<T> | BuiltInTableColumn<T>

export type StrictTableColumn<T extends object> =
  | (Omit<NormalTableColumn<T>, 'key'> & {
      key: Extract<keyof T, string>
    })
  | BuiltInTableColumn<T>

/* ================= 选择和展开功能类型 ================= */
export interface ChildSelectionState {
  selectedKeys: DataTableRowKey[]
  isAllChecked: boolean
  selectAll: () => void
  clearAll: () => void
}

export interface ExpandConfig<T extends object = DataRecord, C = DataRecord> {
  onLoadData?: (row: T) => Promise<C[]> | C[]
  onError?: (error: unknown, row: T) => void
  renderContent?: (
    row: T,
    expandData: C[],
    loading: boolean,
    childSelection?: ChildSelectionState
  ) => VNodeChild
  rowExpandable?: (row: T) => boolean
}

export interface SelectionConfig<
  T extends object = DataRecord,
  C = DataRecord,
> extends BaseConfig<T> {
  enableSelection?: boolean
  defaultCheckedKeys?: DataTableRowKey[]
  maxSelection?: number
  enableChildSelection?: boolean
  childRowCheckable?: (childRow: C, parentRow: T) => boolean
  enableParentChildLink?: boolean
  parentChildLinkMode?: ParentChildLinkMode
}

/* ================= 表格组件核心类型 ================= */
export interface TableBaseProps<T extends object = DataRecord> {
  columns: TableColumn<T>[]
  data: MaybeRefLike<T[]>
  rowKey?: TableRowKey<T>
  loading?: MaybeRefLike<boolean>
}

export interface TableDisplayProps {
  maxHeight?: number | string
  minHeight?: number | string
  scrollX?: number | string
  striped?: boolean
  bordered?: boolean
  singleLine?: boolean
  size?: 'small' | 'medium' | 'large'
}

/** @deprecated 旧类型兼容；组件功能请使用 config.edit。 */
export interface TableEditProps<T extends object = DataRecord> {
  editable?: boolean
  editMode?: EditMode
  onSave?: (rowData: T, rowIndex: number, columnKey?: string) => unknown
  onCancel?: (rowData: T, rowIndex: number) => void
  showRowActions?: boolean
  modalTitle?: string
  modalWidth?: number
  columnWidth?: number
}

/** @deprecated 旧类型兼容；组件功能请使用 config.expand。 */
export interface TableExpandProps<
  T extends object = DataRecord,
  C = DataRecord,
> {
  expandable?: boolean
  onLoadExpandData?: (row: T) => Promise<C[]> | C[]
  renderExpandContent?: (
    row: T,
    expandData: C[],
    loading: boolean,
    childSelection?: ChildSelectionState
  ) => VNodeChild
  rowExpandable?: (row: T) => boolean
  defaultExpandedKeys?: DataTableRowKey[]
}

/** @deprecated 旧类型兼容；组件功能请使用 config.selection。 */
export interface TableSelectionProps<
  T extends object = DataRecord,
  C = DataRecord,
> extends BaseConfig<T> {
  enableSelection?: boolean
  defaultCheckedKeys?: DataTableRowKey[]
  maxSelection?: number
  enableChildSelection?: boolean
  childRowCheckable?: (childRow: C, parentRow: T) => boolean
  enableParentChildLink?: boolean
  parentChildLinkMode?: ParentChildLinkMode
}

/** 组件声明的实际属性；与 UI 壳共用，避免旧配置重新混入主契约。 */
export interface TableRuntimeProps<T extends object = DataRecord, C = unknown> {
  /** CRUD 模式自动提供列和数据，可省略。 */
  columns?: TableColumn<T>[]
  data?: MaybeRefLike<T[]>
  loading?: MaybeRefLike<boolean>
  rowKey?: TableRowKey<T>
  /** 功能配置的统一入口。 */
  config?: TableConfig<T, C>
  /** CRUD 模式自动提供 columns / data / loading，可省略对应属性。 */
  crud?: CrudBinding<T>
  /** 原生分页入口；声明后优先于 config.pagination。 */
  pagination?: PaginationProps | false
  remote?: boolean
  virtualScrollX?: boolean
  /** 根容器 class，原生 class/style 仍转发到内部表格。 */
  wrapperClass?: import('vue').HTMLAttributes['class']
  /** 填满确定高度的容器，保留工具栏和分页空间。 */
  flexHeight?: boolean
}

/** 事件监听与组件共用同一份事件参数，避免将有效监听器误当作旧功能配置。 */
type TableListeners<T extends object, C> = {
  [E in keyof TableEmits<T, C> as `on${Capitalize<E>}`]?: (
    ...args: TableEmits<T, C>[E]
  ) => unknown
}

/** 业务功能统一使用 config；有效的原生显示属性继续由 $attrs 透传。 */
export type TableProps<
  T extends object = DataRecord,
  C = unknown,
> = TableRuntimeProps<T, C> &
  Omit<TableDisplayProps, 'maxHeight' | 'scrollX'> &
  TableListeners<T, C>

/* ================= 事件系统 ================= */
export interface TableExpandEvents<T extends object = DataRecord> {
  'expand-change': [
    expandedKeys: DataTableRowKey[],
    row?: T,
    expanded?: boolean,
  ]
}

export interface TableSelectionEvents<
  T extends object = DataRecord,
  C = DataRecord,
> {
  'selection-change': [
    checkedKeys: DataTableRowKey[],
    checkedRows: T[],
    childSelections?: Map<DataTableRowKey, DataTableRowKey[]>,
  ]
  'child-selection-change': [
    parentKey: DataTableRowKey,
    childKeys: DataTableRowKey[],
    childRows: C[],
  ]
  'parent-child-link-change': [
    parentKey: DataTableRowKey,
    shouldSelect: boolean,
  ]
}

export interface TableEditEvents<T extends object = DataRecord> {
  'update:data': [data: T[]]
  save: [rowData: T, rowIndex: number, columnKey?: string]
  cancel: [rowData: T, rowIndex: number]
  'edit-error': [error: unknown]
}

export interface TableEmits<T extends object = DataRecord, C = DataRecord>
  extends TableExpandEvents<T>, TableSelectionEvents<T, C>, TableEditEvents<T> {
  'pagination-change': [page: number, pageSize: number]
  'row-delete': [deletedRow: T, index: number]
  'batch-action-error': [error: unknown, actionKey: string]
  'row-key-error': [issues: TableRowKeyIssue<T>[]]
  'row-add': [newRow: T]
  'row-copy': [originalRow: T, newRow: T]
  'row-move': [row: T, fromIndex: number, toIndex: number]
  'row-selection-change': [
    selectedKey: DataTableRowKey | null,
    selectedRow: T | null,
  ]
  'view-detail': [data: T]
  'column-change': [columns: TableColumn<T>[]]
}

/* ================= 实例方法系统 ================= */
export interface TableEditMethods<T extends object = DataRecord> {
  startEdit: (rowKey: DataTableRowKey, columnKey?: string) => void
  cancelEdit: () => void
  saveEdit: () => Promise<void>
  isEditing: (rowKey: DataTableRowKey, columnKey?: string) => boolean
  getEditingData: () => T | null
}

export interface TableExpandMethods {
  expandRow: (rowKey: DataTableRowKey) => Promise<void>
  collapseRow: (rowKey: DataTableRowKey) => void
  toggleExpand: (rowKey: DataTableRowKey) => Promise<void>
  expandAll: () => Promise<void>
  collapseAll: () => void
  isExpanded: (rowKey: DataTableRowKey) => boolean
  retryExpand: (rowKey: DataTableRowKey) => Promise<void>
  invalidateExpand: (rowKey?: DataTableRowKey) => void
}

export interface TableSelectionMethods<
  T extends object = DataRecord,
  C = DataRecord,
> {
  selectRow: (rowKey: DataTableRowKey) => boolean | void
  unselectRow: (rowKey: DataTableRowKey) => void
  selectAll: () => void
  clearSelection: () => void
  isRowSelected: (rowKey: DataTableRowKey) => boolean
  getSelectedRows: () => T[]
  selectChildRow: (
    parentKey: DataTableRowKey,
    childKey: DataTableRowKey
  ) => void
  unselectChildRow: (
    parentKey: DataTableRowKey,
    childKey: DataTableRowKey
  ) => void
  selectAllChildren: (parentKey: DataTableRowKey) => void
  clearChildrenSelection: (parentKey: DataTableRowKey) => void
  getChildSelectedRows: (parentKey: DataTableRowKey) => C[]
  clearAllSelections: () => void
}

export interface TableDynamicRowsMethods<T extends object = DataRecord> {
  addRow: () => void
  insertRow: () => void
  deleteRow: () => void
  copyRow: () => void
  moveRowUp: () => void
  moveRowDown: () => void
  clearRowSelection: () => void
  getSelectedRowData: () => T | null
  printTable: (elementRef?: HTMLElement) => Promise<void>
  downloadTableScreenshot: (
    elementRef?: HTMLElement,
    filename?: string
  ) => Promise<void>
}

export interface TablePaginationMethods {
  resetToFirstPage: () => void
  getTotalPages: () => number
}

/** 高级兼容入口的稳定契约；业务行类型与顶层实例保持一致。 */
export interface TableManagerApi<
  T extends object = DataRecord,
  C = DataRecord,
> {
  edit: {
    start: TableEditMethods<T>['startEdit']
    cancel: TableEditMethods<T>['cancelEdit']
    save: TableEditMethods<T>['saveEdit']
    isEditing: TableEditMethods<T>['isEditing']
    getEditingData: () => T | null | undefined
  }
  expand: {
    row: TableExpandMethods['expandRow']
    collapse: TableExpandMethods['collapseRow']
    toggle: TableExpandMethods['toggleExpand']
    all: TableExpandMethods['expandAll']
    collapseAll: TableExpandMethods['collapseAll']
    isExpanded: TableExpandMethods['isExpanded']
  }
  selection: {
    select: TableSelectionMethods<T, C>['selectRow']
    unselect: TableSelectionMethods<T, C>['unselectRow']
    all: TableSelectionMethods<T, C>['selectAll']
    clear: TableSelectionMethods<T, C>['clearSelection']
    isSelected: TableSelectionMethods<T, C>['isRowSelected']
    getSelected: TableSelectionMethods<T, C>['getSelectedRows']
  }
  childSelection: {
    select: TableSelectionMethods<T, C>['selectChildRow']
    unselect: TableSelectionMethods<T, C>['unselectChildRow']
    selectAll: TableSelectionMethods<T, C>['selectAllChildren']
    clear: TableSelectionMethods<T, C>['clearChildrenSelection']
    getSelected: TableSelectionMethods<T, C>['getChildSelectedRows']
  }
  dynamicRows: {
    add: TableDynamicRowsMethods<T>['addRow']
    insert: TableDynamicRowsMethods<T>['insertRow']
    delete: TableDynamicRowsMethods<T>['deleteRow']
    copy: TableDynamicRowsMethods<T>['copyRow']
    moveUp: TableDynamicRowsMethods<T>['moveRowUp']
    moveDown: TableDynamicRowsMethods<T>['moveRowDown']
    clearSelection: TableDynamicRowsMethods<T>['clearRowSelection']
    getSelected: TableDynamicRowsMethods<T>['getSelectedRowData']
    print: TableDynamicRowsMethods<T>['printTable']
    download: TableDynamicRowsMethods<T>['downloadTableScreenshot']
  }
  clearAllSelections: TableSelectionMethods<T, C>['clearAllSelections']
}

export interface TableInstance<T extends object = DataRecord, C = DataRecord>
  extends
    TableEditMethods<T>,
    TableExpandMethods,
    TableSelectionMethods<T, C>,
    TableDynamicRowsMethods<T>,
    TablePaginationMethods {
  exportData: () => Promise<void>
  /** 高级兼容入口；常规操作优先使用实例上的选择、展开和编辑方法。 */
  getManager: () => TableManagerApi<T, C>
  /** 此嵌套对象中的 Ref 保持响应式，读取时使用 .value。 */
  crossPageSelection: Pick<
    UseCrossPageSelectionReturn<T>,
    | 'selectedKeys'
    | 'selectedCount'
    | 'select'
    | 'unselect'
    | 'selectAll'
    | 'clearAll'
    | 'getSelectedRows'
  > & { enabled: ComputedRef<boolean> }
}

/* ================= useTableExpand Hook类型 ================= */
export interface UseTableExpandOptions<
  T extends object = DataRecord,
  C = DataRecord,
>
  extends ExpandConfig<T, C>, SelectionConfig<T, C> {
  data: Ref<T[]> | ComputedRef<T[]>
  rowKey: (row: T) => DataTableRowKey
  childRowKey?: (child: C) => DataTableRowKey
  /** Native tree children field; omitted for flat/detail-expansion tables. */
  childrenKey?: string
  locale?: ComponentLocale
  /** 展开数据等待时的加载内容，C_Table 内置统一 SVG；独立引擎可按需提供。 */
  renderLoading?: () => VNodeChild
  defaultExpandedKeys?: DataTableRowKey[]
  onExpandChange?: (
    expandedKeys: DataTableRowKey[],
    row?: T,
    expanded?: boolean
  ) => void
  onSelectionChange?: (
    checkedKeys: DataTableRowKey[],
    checkedRows: T[],
    childSelections?: Map<DataTableRowKey, DataTableRowKey[]>
  ) => void
  onChildSelectionChange?: (
    parentKey: DataTableRowKey,
    childKeys: DataTableRowKey[],
    childRows: C[]
  ) => void
}

export interface UseTableExpandReturn<
  T extends object = DataRecord,
  C = DataRecord,
> {
  expandedKeys: Ref<DataTableRowKey[]>
  checkedKeys: Ref<DataTableRowKey[]>
  childSelections: Ref<Map<DataTableRowKey, DataTableRowKey[]>>
  expandDataMap: Ref<Map<DataTableRowKey, C[]>>
  loadingMap: Ref<Map<DataTableRowKey, boolean>>
  errorMap: Ref<Map<DataTableRowKey, unknown>>
  retryExpand: (key: DataTableRowKey) => Promise<void>
  invalidateExpand: (key?: DataTableRowKey) => void
  selectedRowsCount: ComputedRef<number>
  totalChildSelections: ComputedRef<number>
  expandAll: () => Promise<void>
  collapseAll: () => void
  expandRow: (key: DataTableRowKey) => Promise<void>
  handleExpandChange: (keys: DataTableRowKey[]) => void
  selectAll: () => void
  clearSelection: () => void
  clearAllSelections: () => void
  handleSelectionChange: (keys: DataTableRowKey[]) => void
  getTableColumns: (originalColumns: TableColumn<T>[]) => unknown[]
}

/** 行操作按钮配置 */
export interface RowAction<T extends object = DataRecord> {
  label: string
  icon?: string
  type?: ButtonType
  disabled?: boolean | ((row: T, index: number) => boolean)
  show?: boolean | ((row: T, index: number) => boolean)
  onClick?: (row: T, index: number) => unknown
  tooltip?: string
}

/* ================= 内部辅助类型 ================= */
/**
 * 展平 TableColumn 联合类型以便直接访问 key/title/visible 等属性。
 * 各 composable 共用此类型，避免重复定义。
 */
export type ColumnWithKey = TableColumn & {
  key?: string
  title?: string
  visible?: boolean
  width?: number | string
  align?: string
  titleAlign?: string
  formatter?: ColumnFormatter
}

export type { MaybeRefLike }
