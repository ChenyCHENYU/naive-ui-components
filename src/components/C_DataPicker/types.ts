import type { TableColumn, TableRowKey } from '../C_Table/types'
import type { ComponentDensity } from '../../core/density'
import type { ComponentLocale } from '../../core/contracts'
import type { VNodeChild } from 'vue'
import type { OptionRequest, OptionPage } from '../../core/optionSource'

export type DataPickerValue = string | number

export type DataPickerRequest<
  TFilters extends object = Record<string, unknown>,
> = OptionRequest<TFilters> & { scope?: string | number }

/** 接口、鉴权与实体映射只在应用中注册一次，组件不探测后端返回结构。 */
export interface DataPickerSourceInput<
  T extends object,
  TFilters extends object = Record<string, unknown>,
> {
  rowKey: TableRowKey<T>
  /** 提交值不同于行键时才需要指定。 */
  value?(row: T): DataPickerValue
  label(row: T): string
  request(query: DataPickerRequest<TFilters>): Promise<OptionPage<T>>
  resolve?(
    values: readonly DataPickerValue[],
    signal: AbortSignal,
    context?: { scope?: string | number }
  ): Promise<readonly T[]>
  /** Quick search delay and minimum length, used by popover presentation. */
  debounce?: number
  minChars?: number
}

export interface DataPickerNavigationNode {
  key: DataPickerValue
  label: string
  children?: DataPickerNavigationNode[]
}

export interface DataPickerNavigation<TFilters extends object> {
  options: readonly DataPickerNavigationNode[]
  /** 查询表单省略该字段时保留当前导航；显式提交（含 undefined）可覆盖或清除。 */
  field: Extract<keyof TFilters, string>
  title?: string
  /** 自定义组织导航保留统一筛选会话；不接管候选或选择状态。 */
  render?: (context: DataPickerNavigationContext) => VNodeChild
}

export interface DataPickerNavigationContext {
  value: DataPickerValue | undefined
  select: (value: DataPickerValue | undefined) => void
  disabled: boolean
  density: ComponentDensity
}

export interface DataPickerSelectedItem<T extends object> {
  value: DataPickerValue
  label: string
  row: T | undefined
}

export interface DataPickerSelectionContext<T extends object> {
  items: readonly DataPickerSelectedItem<T>[]
  remove: (value: DataPickerValue) => void
  move: (value: DataPickerValue, offset: number) => void
  disabled: boolean
}

export interface DataPickerExpose {
  open: () => void
  close: () => void
  /** 丢弃当前范围的候选、回显和草稿。 */
  reset: () => void
  /** true 表示校验通过并已发布选中结果，false 保留当前会话。 */
  confirm: () => Promise<boolean>
}

export interface DataPickerHistoryOptions {
  /** Distinguishes this entity source from other pickers. */
  storageKey: string
  /** Explicit user and business context. Empty scopes disable persistence. */
  scope: string
  maxItems?: number
  favorites?: boolean
}

/** 显式映射的来源继续保证 value(row) 可直接调用。 */
export interface DataPickerSource<
  T extends object,
  TFilters extends object = Record<string, unknown>,
> extends DataPickerSourceInput<T, TFilters> {
  value: (row: T) => DataPickerValue
}

export interface DataPickerProps<
  T extends object,
  TFilters extends object = Record<string, unknown>,
> {
  source: DataPickerSourceInput<T, TFilters>
  columns: TableColumn<T>[]
  modelValue?: DataPickerValue | readonly DataPickerValue[] | null
  multiple?: boolean
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  title?: string
  placeholder?: string
  density?: ComponentDensity
  locale?: ComponentLocale
  pageSize?: number
  /** 业务身份变化会取消请求、回显和未确认选择，不与历史记录 scope 混淆。 */
  scope?: string | number
  showActions?: boolean
  showTrigger?: boolean
  revalidateOnConfirm?: boolean
  /** 可用性提示与 rowCheckable 共用确认校验。返回非空原因即不可选。 */
  disabledReason?: (row: T) => string | undefined
  /** Prevent confirming an empty selection when the action needs a row. */
  requireSelection?: boolean
  /** Inline selection keeps the current page or dialog as the sole overlay. */
  presentation?: 'modal' | 'inline' | 'popover'
  /** Each session starts with these filters. A changed baseline invalidates the old session. */
  initialValues?: TFilters
  /** Applied last to every request. A change invalidates pending work and drafts. */
  fixedFilters?: TFilters
  rowCheckable?: (row: T) => boolean
  maxSelection?: number
  navigation?: DataPickerNavigation<TFilters>
  /** Requires source.resolve. Only values and labels are persisted. */
  history?: DataPickerHistoryOptions
}

export interface DataPickerEmits<T extends object> {
  'update:modelValue': [value: DataPickerValue | DataPickerValue[] | null]
  /** 仅包含确认时已解析的行，尚未解析的选中值仍保留在 modelValue。 */
  select: [rows: T[]]
  cancel: []
}
