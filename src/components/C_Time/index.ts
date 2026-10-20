import Runtime from './index.vue'
import type {
  EmitFn,
  VNode,
  VNodeProps,
  AllowedComponentProps,
  ComponentCustomProps,
} from 'vue'
import type { TimeMode, TimeProps, TimeEmits, TimeExpose } from './types'

type Listeners<M extends TimeMode | undefined> = {
  [E in keyof TimeEmits<M> as `on${Capitalize<E>}`]?: (
    ...args: TimeEmits<M>[E]
  ) => void
}

/** 模式推导只留在公开声明，实际组件不增加任何运行时包装。 */
type ModeComponent = <M extends TimeMode | undefined = 'range'>(
  props: TimeProps<M> &
    Listeners<M> &
    VNodeProps &
    AllowedComponentProps &
    ComponentCustomProps
) => VNode & {
  __ctx?: {
    props: TimeProps<M> & Listeners<M>
    emit: EmitFn<TimeEmits<M>>
    attrs: Record<string, unknown>
    slots: Record<string, never>
    expose: (exposed: TimeExpose) => void
  }
}

export const C_Time = Runtime as unknown as ModeComponent
export type {
  TimeMode,
  TimeProps,
  TimeEmits,
  TimeExpose,
  TimeModelValue,
  TimeRangeValue,
} from './types'
export { useTimeSelection } from './composables/useTimeSelection'
