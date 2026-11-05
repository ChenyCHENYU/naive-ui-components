import type { TableColumn, TableRowKey } from '../C_Table/types'
import type { ComponentDensity } from '../../core/density'
import type { ComponentLocale } from '../../core/contracts'

export type DataPickerValue = string | number

export interface DataPickerRequest<
  TFilters extends object = Record<string, unknown>,
> {
  page: number
  pageSize: number
  search: string
  signal: AbortSignal
  /** Only present when a structured query is configured or submitted. */
  filters?: Readonly<TFilters>
}

/** 接口、鉴权与实体映射只在应用中注册一次，组件不探测后端返回结构。 */
export interface DataPickerSourceInput<
  T extends object,
  TFilters extends object = Record<string, unknown>,
> {
  rowKey: TableRowKey<T>
  /** 提交值不同于行键时才需要指定。 */
  value?: (row: T) => DataPickerValue
  label: (row: T) => string
  request: (
    query: DataPickerRequest<TFilters>
  ) => Promise<{ rows: T[]; total: number }>
  resolve?: (
    values: readonly DataPickerValue[],
    signal: AbortSignal
  ) => Promise<readonly T[]>
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
  /** Prevent confirming an empty selection when the action needs a row. */
  requireSelection?: boolean
  /** Inline selection keeps the current page or dialog as the sole overlay. */
  presentation?: 'modal' | 'inline'
  /** Each session starts with these filters. A changed baseline invalidates the old session. */
  initialValues?: TFilters
}

export interface DataPickerEmits<T extends object> {
  'update:modelValue': [value: DataPickerValue | DataPickerValue[] | null]
  /** 无 resolve 的未知初值保留原编码，此事件只包含已解析的行。 */
  select: [rows: T[]]
}
