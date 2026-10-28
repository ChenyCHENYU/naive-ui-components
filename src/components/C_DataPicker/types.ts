import type { TableColumn, TableRowKey } from '../C_Table/types'
import type { ComponentDensity } from '../../core/density'
import type { ComponentLocale } from '../../core/contracts'

export type DataPickerValue = string | number

/** 接口、鉴权与实体映射只在应用中注册一次，组件不探测后端返回结构。 */
export interface DataPickerSource<T extends object> {
  rowKey: TableRowKey<T>
  value: (row: T) => DataPickerValue
  label: (row: T) => string
  request: (query: {
    page: number
    pageSize: number
    search: string
    signal: AbortSignal
  }) => Promise<{ rows: T[]; total: number }>
  resolve?: (
    values: readonly DataPickerValue[],
    signal: AbortSignal
  ) => Promise<readonly T[]>
}

export interface DataPickerProps<T extends object> {
  source: DataPickerSource<T>
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
}

export interface DataPickerEmits<T extends object> {
  'update:modelValue': [value: DataPickerValue | DataPickerValue[] | null]
  /** 无 resolve 的未知初值保留原编码，此事件只包含已解析的行。 */
  select: [rows: T[]]
}
