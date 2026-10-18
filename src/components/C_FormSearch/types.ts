/** 搜索字段支持的控件类型 */
export type SearchFieldType = 'input' | 'select' | 'date-range' | 'spacer'

export interface SearchOptionItem {
  labelDefault?: string
  label?: string
  value?: string | number | boolean
  disabled?: boolean
  [key: string]: unknown
}

export interface SearchFormItem {
  type: SearchFieldType
  prop: string
  placeholder?: string
  list?: SearchOptionItem[]
  hisList?: string[]
  isFocus?: boolean
  show?: boolean
  defaultValue?: unknown
  attrs?: Record<string, unknown>
  rules?: FormItemRule[]
}

export interface SearchFormParams {
  pageNum?: number
  pageSize?: number
  [key: string]: unknown
}

export interface SearchConfig {
  /** 与 C_Form、C_Table 统一的布局密度，显式 size 和字段 attrs.size 优先。 */
  density?: ComponentDensity
  foldThreshold?: number
  historyMaxItems?: number
  requireValue?: boolean
  feedback?: ComponentFeedback
  locale?: ComponentLocale
  onSearch?: (params: SearchFormParams) => void | Promise<void>
}

export interface FormSearchProps {
  bordered?: boolean
  formItemList: SearchFormItem[]
  /** @deprecated Use modelValue with v-model. */
  formParams?: SearchFormParams
  modelValue?: SearchFormParams
  formSearchInputHistoryString?: string
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  config?: SearchConfig
}

export interface FormSearchEmits {
  search: [params: SearchFormParams]
  reset: [params: SearchFormParams]
  'change-params': [params: SearchFormParams]
  'update:modelValue': [params: SearchFormParams]
}
import type { FormItemRule } from 'naive-ui'
import type { ComponentFeedback, ComponentLocale } from '../../config'
import type { ComponentDensity } from '../../core/density'
