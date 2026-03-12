/*
 * @Description: 表格类型系统
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import type { MaybeRef, VNodeChild, Ref, ComputedRef } from 'vue'
import type { DataTableColumns, DataTableRowKey } from 'naive-ui'
import type { FormItemRule } from 'naive-ui/es/form'
import type { ColumnFormatter } from './composables/useTableGlobalConfig'

/* 宽松的 Ref-like 类型，支持跨 Vue 实例的 Ref 传递 */
type RefLike<T> = { value: T } | T
type MaybeRefLike<T> = RefLike<T> | MaybeRef<T>

/* ================= 核心类型定义 ================= */
export type DataRecord = Record<string, unknown>
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
  | 'default'
  | 'primary'
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
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
export type ApiFunction<T extends DataRecord = DataRecord> = (
  row: T,
  index: number
) => Promise<any> | any

/** 渲染函数类型 */
export type RenderFunction<T extends DataRecord = DataRecord> = (
  row: T,
  index: number
) => VNodeChild

/** 自定义操作按钮配置 */
export interface CustomAction<T extends DataRecord = DataRecord> {
  /** 按钮唯一键 */
  key: string
  /** 按钮显示文本 */
  label: string | ((row: T, index: number) => string)
  /** 按钮图标 */
  icon: string | ((row: T, index: number) => string)
  /** 按钮类型样式 */
  type?: ButtonType | ((row: T, index: number) => ButtonType)
  /** 点击事件处理器 */
  onClick: (row: T, index: number) => void | Promise<void>
  /** 条件显示函数（可选） */
  show?: (row: T, index: number) => boolean
  /** 是否禁用（可选） */
  disabled?: (row: T, index: number) => boolean
  /** 按钮提示文本（可选） */
  tooltip?: string
}

/** 简化的操作配置 - 二元法则 */
export interface SimpleTableActions<T extends DataRecord = DataRecord> {
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

/** useTableActions Hook 选项类型 */
export interface UseTableActionsOptions<T extends DataRecord = DataRecord> {
  /** 操作配置 */
  actions: Ref<SimpleTableActions<T>> | ComputedRef<SimpleTableActions<T>>
  /** 表格配置 */
  config: Ref<any> | ComputedRef<any>
  /** 表格管理器 */
  tableManager: any
  /** 行键获取函数 */
  rowKey: (row: T) => DataTableRowKey
  /** 事件发射器 */
  emit: any
  /** 查看详情回调 */
  onViewDetail?: (data: T) => void
}

/** useTableActions Hook 返回类型 */
export interface UseTableActionsReturn<T extends DataRecord = DataRecord> {
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
export interface BaseConfig<T extends DataRecord = DataRecord> {
  enabled?: boolean
  rowCheckable?: (row: T) => boolean
}

/* ================= 数据映射类型 ================= */
export type SelectOption = BaseOption

export type DataMapping = SafeRecord<string, string>

export type CommonMappings = SafeRecord<
  'gender' | 'department' | 'status',
  DataMapping
>

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
interface BaseTableColumn<T extends DataRecord = DataRecord> extends Omit<
  DataTableColumns<T>[number],
  'key' | 'title' | 'render' | 'type'
> {
  key?: any
  title?: string
  visible?: boolean
  editable?: boolean
  required?: boolean
  editType?: EditType
  editProps?: EditProps
  editRender?: (value: any, rowData: T, rowIndex: number) => VNodeChild
  render?: (rowData: T, rowIndex: number) => VNodeChild
  /** 声明式格式化器（优先级低于 render） */
  formatter?: ColumnFormatter
  fixed?: 'left' | 'right'
  resizable?: boolean
  minWidth?: number
  maxWidth?: number
}

interface NormalTableColumn<
  T extends DataRecord = DataRecord,
> extends BaseTableColumn<T> {
  key: keyof T | string
  title: string
}

interface BuiltInTableColumn<
  T extends DataRecord = DataRecord,
> extends BaseTableColumn<T> {
  /** 内置列类型：无需 key / title */
  type: 'selection' | 'expand' | 'index'
  /** 展开行渲染函数（仅当 type = expand 时有效） */
  renderExpand?: (rowData: T, rowIndex: number) => VNodeChild
}

export type TableColumn<T extends DataRecord = DataRecord> =
  | NormalTableColumn<T>
  | BuiltInTableColumn<T>

/* ================= 选择和展开功能类型 ================= */
export interface ChildSelectionState {
  selectedKeys: DataTableRowKey[]
  isAllChecked: boolean
  selectAll: () => void
  clearAll: () => void
}

export interface ExpandConfig<T extends DataRecord = DataRecord, C = any> {
  onLoadData?: (row: T) => Promise<C[]> | C[]
  renderContent?: (
    row: T,
    expandData: C[],
    loading: boolean,
    childSelection?: ChildSelectionState
  ) => VNodeChild
  rowExpandable?: (row: T) => boolean
}

export interface SelectionConfig<
  T extends DataRecord = DataRecord,
> extends BaseConfig<T> {
  enableSelection?: boolean
  defaultCheckedKeys?: DataTableRowKey[]
  maxSelection?: number
  enableChildSelection?: boolean
  childRowCheckable?: (childRow: any, parentRow: T) => boolean
  enableParentChildLink?: boolean
  parentChildLinkMode?: ParentChildLinkMode
}

/* ================= 表格组件核心类型 ================= */
export interface TableBaseProps<T extends DataRecord = DataRecord> {
  columns: TableColumn<T>[]
  data: MaybeRefLike<T[]>
  rowKey?: (row: T) => DataTableRowKey
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

export interface TableEditProps<T extends DataRecord = DataRecord> {
  editable?: boolean
  editMode?: EditMode
  onSave?: (
    rowData: T,
    rowIndex: number,
    columnKey?: string
  ) => void | Promise<void>
  onCancel?: (rowData: T, rowIndex: number) => void
  showRowActions?: boolean
  modalTitle?: string
  modalWidth?: number
  columnWidth?: number
}

export interface TableExpandProps<T extends DataRecord = DataRecord> {
  expandable?: boolean
  onLoadExpandData?: (row: T) => Promise<any[]> | any[]
  renderExpandContent?: (
    row: T,
    expandData: any[],
    loading: boolean,
    childSelection?: ChildSelectionState
  ) => VNodeChild
  rowExpandable?: (row: T) => boolean
  defaultExpandedKeys?: DataTableRowKey[]
}

export interface TableSelectionProps<
  T extends DataRecord = DataRecord,
> extends BaseConfig<T> {
  enableSelection?: boolean
  defaultCheckedKeys?: DataTableRowKey[]
  maxSelection?: number
  enableChildSelection?: boolean
  childRowCheckable?: (childRow: any, parentRow: T) => boolean
  enableParentChildLink?: boolean
  parentChildLinkMode?: ParentChildLinkMode
}

/* 组合所有属性的完整表格属性接口 */
export interface TableProps<T extends DataRecord = DataRecord>
  extends
    TableBaseProps<T>,
    TableDisplayProps,
    TableEditProps<T>,
    TableExpandProps<T>,
    TableSelectionProps<T> {
  pagination?: PaginationConfig | boolean
  actions?: SimpleTableActions<T>
}

/* ================= 事件系统 ================= */
export interface TableExpandEvents<T extends DataRecord = DataRecord> {
  'expand-change': [
    expandedKeys: DataTableRowKey[],
    row?: T,
    expanded?: boolean,
  ]
}

export interface TableSelectionEvents<T extends DataRecord = DataRecord> {
  'selection-change': [
    checkedKeys: DataTableRowKey[],
    checkedRows: T[],
    childSelections?: Map<DataTableRowKey, DataTableRowKey[]>,
  ]
  'child-selection-change': [
    parentKey: DataTableRowKey,
    childKeys: DataTableRowKey[],
    childRows: any[],
  ]
  'parent-child-link-change': [
    parentKey: DataTableRowKey,
    shouldSelect: boolean,
  ]
}

export interface TableEditEvents<T extends DataRecord = DataRecord> {
  'update:data': [data: T[]]
  save: [rowData: T, rowIndex: number, columnKey?: string]
  cancel: [rowData: T, rowIndex: number]
}

export interface TableEmits<T extends DataRecord = DataRecord>
  extends TableExpandEvents<T>, TableSelectionEvents<T>, TableEditEvents<T> {
  'pagination-change': [page: number, pageSize: number]
  'row-delete': [deletedRow: T, index: number]
}

/* ================= 实例方法系统 ================= */
export interface TableEditMethods {
  startEdit: (rowKey: DataTableRowKey, columnKey?: string) => void
  cancelEdit: () => void
  saveEdit: () => Promise<void>
  isEditing: (rowKey: DataTableRowKey, columnKey?: string) => boolean
  getEditingData: () => any
}

export interface TableExpandMethods {
  expandRow: (rowKey: DataTableRowKey) => Promise<void>
  collapseRow: (rowKey: DataTableRowKey) => void
  toggleExpand: (rowKey: DataTableRowKey) => Promise<void>
  expandAll: () => Promise<void>
  collapseAll: () => void
  isExpanded: (rowKey: DataTableRowKey) => boolean
}

export interface TableSelectionMethods<T extends DataRecord = DataRecord> {
  selectRow: (rowKey: DataTableRowKey) => void
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
  getChildSelectedRows: (parentKey: DataTableRowKey) => any[]
  clearAllSelections: () => void
}

export interface TableDynamicRowsMethods<T extends DataRecord = DataRecord> {
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

export interface TableInstance<T extends DataRecord = DataRecord>
  extends
    TableEditMethods,
    TableExpandMethods,
    TableSelectionMethods<T>,
    TableDynamicRowsMethods<T>,
    TablePaginationMethods {}

/* ================= useTableExpand Hook类型 ================= */
export interface UseTableExpandOptions<
  T extends DataRecord = DataRecord,
  C = any,
>
  extends ExpandConfig<T, C>, SelectionConfig<T> {
  data: Ref<T[]> | ComputedRef<T[]>
  rowKey: (row: T) => DataTableRowKey
  childRowKey?: (child: C) => DataTableRowKey
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
  T extends DataRecord = DataRecord,
  C = any,
> {
  expandedKeys: Ref<DataTableRowKey[]>
  checkedKeys: Ref<DataTableRowKey[]>
  childSelections: Ref<Map<DataTableRowKey, DataTableRowKey[]>>
  expandDataMap: Ref<Map<DataTableRowKey, C[]>>
  loadingMap: Ref<Map<DataTableRowKey, boolean>>
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
  getTableColumns: (originalColumns: TableColumn<T>[]) => any[]
}

/* ================= 演示和测试类型 ================= */
export interface TestRecord extends DataRecord {
  id: number
  name: string
  department: string
  role: string
  status: string
  hasChildren: boolean
}

export interface SelectedChildGroup {
  parentKey: number
  parentName: string
  children: any[]
}

export interface DemoConfig {
  enableSelection: boolean
  enableChildSelection: boolean
  parentChildLinkMode: ParentChildLinkMode
}

/** 行操作按钮配置 */
export interface RowAction<T extends DataRecord = DataRecord> {
  label: string
  icon?: string
  type?: ButtonType
  disabled?: boolean | ((row: T, index: number) => boolean)
  show?: boolean | ((row: T, index: number) => boolean)
  onClick?: (row: T, index: number) => void | Promise<void>
  tooltip?: string
}

export type { MaybeRefLike }
