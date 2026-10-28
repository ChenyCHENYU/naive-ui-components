import Runtime from './index.vue'
import type {
  EmitFn,
  VNode,
  VNodeProps,
  AllowedComponentProps,
  ComponentCustomProps,
} from 'vue'
import type {
  SearchFormParams,
  FormSearchProps,
  FormSearchEmits,
  FormSearchExpose,
  SearchFieldContext,
} from './types'

type Listeners<T extends object> = {
  [E in keyof FormSearchEmits<T> as `on${Capitalize<E>}`]?: (
    ...args: FormSearchEmits<T>[E]
  ) => void
}

/** 完整业务模型由 v-model 推导；动态表单保留原有零模型接入。 */
type SearchComponent = <T extends object = SearchFormParams>(
  props: FormSearchProps<T> &
    Listeners<T> &
    VNodeProps &
    AllowedComponentProps &
    ComponentCustomProps
) => VNode & {
  __ctx?: {
    props: FormSearchProps<T> & Listeners<T>
    emit: EmitFn<FormSearchEmits<T>>
    attrs: Record<string, unknown>
    slots: Record<string, (context: SearchFieldContext<T>) => VNode[]>
    expose: (exposed: FormSearchExpose<T>) => void
  }
}

export const C_FormSearch = Runtime as unknown as SearchComponent
export type { ComponentDensity } from '../../core/density'
export type {
  SearchFieldType,
  SearchOptionItem,
  SearchFormItem,
  SearchFormParams,
  SearchConfig,
  FormSearchEmits,
  FormSearchProps,
  FormSearchExpose,
  SearchFieldContext,
  SearchQueryEncoding,
  SearchNumberRangeValue,
} from './types'
export { serializeSearch, type SerializeSearchOptions } from './serializeSearch'
export { useSearchHistory } from './composables/useSearchHistory'
export { useSearchState } from './composables/useSearchState'

export type { DateRangeInput, SearchDateRangeValue } from './dateRange'
