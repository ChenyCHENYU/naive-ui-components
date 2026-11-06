import type { OptionsState } from '../../core/options'
export type { OptionsState } from '../../core/options'
/** 搜索字段支持的控件类型 */
export type SearchFieldType =
  | 'input'
  | 'select'
  | 'number'
  | 'number-range'
  | 'date'
  | 'month'
  | 'time'
  | 'date-range'
  | 'custom'
  | 'spacer'

/** 允许只输入一端；空控件仍发布 null。 */
export type SearchNumberRangeValue = [number | null, number | null] | null

/** 显式调用 serializeSearch 时才应用，组件不会悄悄改变 onSearch 的业务模型。 */
export interface SearchQueryEncoding {
  name?: string
  keys?: readonly [string, string]
  serialize?: (value: unknown) => unknown
}

/** 自定义字段与具名插槽共用同一受控边界；updateValue 尊重 fixed/readonly/disabled。 */
export interface SearchFieldContext<T extends object = SearchFormParams> {
  value: unknown
  model: Readonly<T>
  prop: Extract<keyof T, string>
  disabled: boolean
  readonly: boolean
  size: 'small' | 'medium' | 'large'
  // 方法签名保留显式使用宽上下文的回调兼容性。
  updateValue(value: unknown): void
}

interface SearchRenderContext<
  T extends object,
  P extends Extract<keyof T, string>,
> extends SearchFieldContext<T> {
  value: T[P]
  prop: P
  updateValue: (value: T[P]) => void
}

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
  label?: string
  span?: number
  minWidth?: number
  /** 固定条件继续参与查询，但不允许控件修改或 reset 清除。 */
  fixed?: boolean
  disabled?: boolean
  readonly?: boolean
  /** 日期初值为 null 时显式声明格式化模型，避免清空后切换模型类型。 */
  valueMode?: 'timestamp' | 'formatted'
  query?: SearchQueryEncoding
  slot?: string
  render?: (context: SearchFieldContext) => VNodeChild
  placeholder?: string
  list?: SearchOptionItem[]
  hisList?: string[]
  isFocus?: boolean
  show?: boolean
  defaultValue?: unknown
  attrs?: Record<string, unknown>
  /** 外部受控选项状态；仅呈现，不触发或订阅外部数据源。 */
  optionsState?: OptionsState
  rules?: FormItemRule[]
}

type FieldOptions<V> = Array<
  Omit<SearchOptionItem, 'value'> & { value: Extract<V, SearchOptionValue> }
>
type FieldAttributes = Record<string, unknown>
type SingleTemporalField = 'date' | 'month' | 'time'
type TypedSingleDate<V> = null extends V
  ? number extends V
    ? string extends V
      ? { type: SingleTemporalField; valueMode?: 'timestamp' | 'formatted' }
      : { type: SingleTemporalField; valueMode?: 'timestamp' }
    : string extends V
      ? { type: SingleTemporalField; valueMode: 'formatted' }
      : never
  : never
type TypedDateRange<V> = null extends V
  ? [number, number] extends V
    ? [string, string] extends V
      ? { type: 'date-range'; valueMode?: 'timestamp' | 'formatted' }
      : { type: 'date-range'; valueMode?: 'timestamp' }
    : [string, string] extends V
      ? { type: 'date-range'; valueMode: 'formatted' }
      : never
  : never
type TypedSearchControl<V> =
  | { type: 'spacer'; list?: never }
  | (string extends V ? { type: 'input'; list?: never } : never)
  | (number extends V
      ? null extends V
        ? { type: 'number'; list?: never }
        : {
            type: 'number'
            attrs: FieldAttributes & { clearable: false }
            defaultValue: V
            list?: never
          }
      : never)
  | (null extends V
      ? SearchNumberRangeValue extends V
        ? { type: 'number-range'; list?: never }
        : never
      : never)
  | (TypedSingleDate<V> & { list?: never })
  | (TypedDateRange<V> & { list?: never })
  | { type: 'custom'; defaultValue: V; list?: never }
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
        'type' | 'prop' | 'defaultValue' | 'list' | 'render'
      > & {
        prop: P
        defaultValue?: T[P]
        render?: (context: SearchRenderContext<T, P>) => VNodeChild
      } & TypedSearchControl<T[P]>
    }[Extract<keyof T, string>])

export interface SearchFormParams {
  pageNum?: number
  pageSize?: number
  [key: string]: unknown
}

export interface SearchConfig<T extends object = SearchFormParams> {
  /** 与 C_Form、C_Table 统一的布局密度，显式 size 和字段 attrs.size 优先。 */
  density?: ComponentDensity
  /** inline 保持原有接入；grid 按实际容器宽度重排，columns 为最大列数。 */
  layout?: 'inline' | 'grid'
  columns?: number
  fieldMinWidth?: number
  labelPlacement?: 'left' | 'top'
  labelWidth?: number | string | 'auto'
  foldThreshold?: number
  historyMaxItems?: number
  requireValue?: boolean
  /** 重置草稿后执行查询。允许空条件，仍执行字段校验。默认只重置草稿。 */
  searchOnReset?: boolean
  /** 切换业务查询范围时重置已执行快照，并忽略旧范围的迟到结果。 */
  queryScope?: string | number
  feedback?: ComponentFeedback
  locale?: ComponentLocale
  onSearch?: (params: T) => boolean | void | Promise<unknown>
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
  applied: [params: T]
}
/** 公开实例的顶层 Ref 已由 Vue 解包。 */
export interface FormSearchExpose<T extends object = SearchFormParams> {
  formRef: FormInst | null
  formParams: T
  /** 仅成功的 onSearch 更新；没有执行时为 null，重置草稿不伪造查询成功。 */
  appliedParams: T | null
  hasUnappliedChanges: boolean
  hiddenActiveCount: number
  searchFn: () => Promise<boolean>
  cleanFn: () => void
  /** 应用常用条件，不改固定/隐藏/只读字段，不自动查询或更新成功快照。 */
  applyPreset: (values: Partial<T>) => boolean
  changeFoldState: () => void
}
import type { FormInst, FormItemRule } from 'naive-ui'
import type { ComponentFeedback, ComponentLocale } from '../../config'
import type { ComponentDensity } from '../../core/density'
import type { VNodeChild } from 'vue'
