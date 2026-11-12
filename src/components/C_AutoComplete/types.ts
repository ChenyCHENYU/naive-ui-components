import type { VNodeChild } from 'vue'
import type { AutoCompleteProps as NaiveAutoCompleteProps } from 'naive-ui'
import type { OptionSource, OptionValue } from '../../core/optionSource'
import type { ComponentDensity } from '../../core/density'
import type { ComponentLocale } from '../../core/contracts'

export interface AutoCompleteOptionItem {
  value: string
  label?: string
  disabled?: boolean
  [key: string]: unknown
}

/** Text remains valid without selecting a suggestion. Remote selections insert their label; local suggestions insert their value. */
export interface AutoCompleteProps<
  R extends object = AutoCompleteOptionItem,
  F extends object = Record<string, unknown>,
> {
  modelValue?: string | null
  options?: readonly (string | (R & AutoCompleteOptionItem))[]
  source?: OptionSource<R, OptionValue, F>
  /** Render suggestion details without changing the inserted text. */
  renderLabel?: (row: NoInfer<R>) => VNodeChild
  /** Filter local suggestions by label. Disable for fixed templates. Remote filtering belongs to source. */
  filterable?: boolean
  disabled?: boolean
  readonly?: boolean
  clearable?: boolean
  loading?: boolean
  placeholder?: string
  size?: NaiveAutoCompleteProps['size']
  status?: NaiveAutoCompleteProps['status']
  inputProps?: NaiveAutoCompleteProps['inputProps']
  density?: ComponentDensity
  locale?: ComponentLocale
}
