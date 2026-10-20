import Runtime from './index.vue'
import type {
  EmitFn,
  VNode,
  VNodeProps,
  AllowedComponentProps,
  ComponentCustomProps,
} from 'vue'
import type { DatePickerMode, DateProps, DateEmits, DateExpose } from './types'

type Listeners<M extends DatePickerMode | undefined> = {
  [E in keyof DateEmits<M> as `on${Capitalize<E>}`]?: (
    ...args: DateEmits<M>[E]
  ) => void
}

/** 模式推导只留在公开声明，实际组件不增加任何运行时包装。 */
type ModeComponent = <M extends DatePickerMode | undefined = 'date'>(
  props: DateProps<M> &
    Listeners<M> &
    VNodeProps &
    AllowedComponentProps &
    ComponentCustomProps
) => VNode & {
  __ctx?: {
    props: DateProps<M> & Listeners<M>
    emit: EmitFn<DateEmits<M>>
    attrs: Record<string, unknown>
    slots: Record<string, never>
    expose: (exposed: DateExpose) => void
  }
}

export const C_Date = Runtime as unknown as ModeComponent
export type {
  DateModelValue,
  DatePickerMode,
  DateProps,
  DateRangeValue,
  DateValue,
  DateEmits,
  DateExpose,
} from './types'
