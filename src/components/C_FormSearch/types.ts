/** 搜索字段支持的控件类型 */
export type SearchFieldType = 'input' | 'select' | 'date-range' | 'spacer'

export type SearchOptionValue = string | number | boolean

export interface SearchOptionItem<
  V extends SearchOptionValue = SearchOptionValue,
> {
  labelDefault?: string
  label?: string
  value?: V
  disabled?: boolean
  [key: string]: unknown
}

/** 动态模型保留原有开放契约；明确业务模型使用下方的字段和值关联。 */
interface SearchFormItemBase {
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

type FieldOptions<V> = Array<
  Omit<SearchOptionItem, 'value'> & { value: Extract<V, SearchOptionValue> }
>
type FieldAttributes = Record<string, unknown>
type TypedSearchControl<V> =
  | { type: 'spacer'; list?: never }
  | (string extends V ? { type: 'input'; list?: never } : never)
  | (null extends V
      ? [number, number] extends V
        ? { type: 'date-range'; list?: never }
        : never
      : never)
  | (NonNullable<V> extends readonly (infer Item)[]
      ? [] extends NonNullable<V>
        ? {
            type: 'select'
            attrs: FieldAttributes & { multiple: true }
            list?: FieldOptions<Item>
          }
        : never
      : NonNullable<V> extends SearchOptionValue
        ? null extends V
          ? {
              type: 'select'
              attrs?: FieldAttributes & { multiple?: false }
              list?: FieldOptions<NonNullable<V>>
            }
          : {
              type: 'select'
              attrs: FieldAttributes & { multiple?: false; clearable: false }
              defaultValue: NonNullable<V>
              list?: FieldOptions<NonNullable<V>>
            }
        : never)

/**
 * 字段值与控件清空语义关联，业务模型无需自行修补 reset/clear 的类型。
 * 日期默认使用时间戳范围；格式化范围可使用 SearchDateRangeValue。
 */
export type SearchFormItem<T extends object = SearchFormParams> = {
  prop: Extract<keyof T, string>
} & (string extends keyof T
  ? SearchFormItemBase
  : {
      [P in Extract<keyof T, string>]: Omit<
        SearchFormItemBase,
        'type' | 'prop' | 'defaultValue' | 'list'
      > & { prop: P; defaultValue?: T[P] } & TypedSearchControl<T[P]>
    }[Extract<keyof T, string>])

export interface SearchFormParams {
  pageNum?: number
  pageSize?: number
  [key: string]: unknown
}

export interface SearchConfig<T extends object = SearchFormParams> {
  /** 与 C_Form、C_Table 统一的布局密度，显式 size 和字段 attrs.size 优先。 */
  density?: ComponentDensity
  foldThreshold?: number
  historyMaxItems?: number
  requireValue?: boolean
  feedback?: ComponentFeedback
  locale?: ComponentLocale
  onSearch?: (params: T) => void | Promise<unknown>
}

export interface FormSearchRuntimeProps<T extends object = SearchFormParams> {
  bordered?: boolean
  formItemList: SearchFormItem<NoInfer<T>>[]
  /** @deprecated Use modelValue with v-model. */
  formParams?: T
  modelValue?: T
  formSearchInputHistoryString?: string
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  config?: SearchConfig<NoInfer<T>>
}

/** 具体业务模型必须提供完整初始值；动态默认模型继续支持空配置接入。 */
export type FormSearchProps<T extends object = SearchFormParams> = Omit<
  FormSearchRuntimeProps<T>,
  'modelValue' | 'formParams'
> &
  (string extends keyof T
    ? { modelValue?: T; formParams?: T }
    : { modelValue: T; formParams?: T } | { modelValue?: T; formParams: T })

export interface FormSearchEmits<T extends object = SearchFormParams> {
  search: [params: T]
  reset: [params: T]
  'change-params': [params: T]
  'update:modelValue': [params: T]
}
/** 公开实例的顶层 Ref 已由 Vue 解包。 */
export interface FormSearchExpose<T extends object = SearchFormParams> {
  formRef: FormInst | null
  formParams: T
  searchFn: () => Promise<boolean>
  cleanFn: () => void
  changeFoldState: () => void
}
import type { FormInst, FormItemRule } from 'naive-ui'
import type { ComponentFeedback, ComponentLocale } from '../../config'
import type { ComponentDensity } from '../../core/density'
