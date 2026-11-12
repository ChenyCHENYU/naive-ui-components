import type { SelectProps as NaiveSelectProps } from 'naive-ui'
import type { OptionSource } from '../../core/optionSource'
import type { ComponentDensity } from '../../core/density'
import type { ComponentLocale } from '../../core/contracts'

export type SelectValue = string | number | boolean

export interface SelectOptionItem<V extends SelectValue = SelectValue> {
  label: string
  value: V
  disabled?: boolean
  [key: string]: unknown
}

export type SelectModelValue<
  V extends SelectValue,
  M extends boolean,
  T extends boolean = false,
> = M extends true
  ? Array<V | (T extends true ? string : never)>
  : V | (T extends true ? string : never) | null

export interface SelectProps<
  V extends SelectValue = SelectValue,
  M extends boolean = boolean,
  T extends boolean = boolean,
  R extends object = SelectOptionItem<V>,
  F extends object = Record<string, unknown>,
> {
  modelValue?: SelectModelValue<V, NoInfer<M>, NoInfer<T>> | null
  options?: readonly SelectOptionItem<V>[]
  source?: OptionSource<R, V, F>
  density?: ComponentDensity
  locale?: ComponentLocale
  show?: boolean
  multiple?: boolean & M
  filterable?: boolean
  /** Preserve native externally managed filtering when no source is supplied. */
  remote?: boolean
  /** 允许输入列表外的字符串，与 filterable 一起使用。 */
  tag?: boolean & T
  clearable?: boolean
  disabled?: boolean
  readonly?: boolean
  loading?: boolean
  placeholder?: string
  maxTagCount?: NaiveSelectProps['maxTagCount']
  size?: NaiveSelectProps['size']
  status?: NaiveSelectProps['status']
  virtualScroll?: NaiveSelectProps['virtualScroll']
  inputProps?: NaiveSelectProps['inputProps']
  fallbackOption?: NaiveSelectProps['fallbackOption']
}

export type SelectSelection<
  R extends object,
  M extends boolean,
> = M extends true ? R[] : R | null
