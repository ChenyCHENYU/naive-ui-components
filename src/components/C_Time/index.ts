import Runtime from './index.vue'
import type {
  EmitFn,
  VNode,
  VNodeProps,
  AllowedComponentProps,
  ComponentCustomProps,
} from 'vue'
import type { TimeMode, TimeProps, TimeEmits, TimeExpose } from './types'
import type { TemporalValueMode } from '../../core/temporalField'

type Listeners<M extends TimeMode | undefined, V extends TemporalValueMode> = {
  [E in keyof TimeEmits<M, V> as `on${Capitalize<E>}`]?: (
    ...args: TimeEmits<M, V>[E]
  ) => void
}

/** 模式推导只留在公开声明，实际组件不增加任何运行时包装。 */
type ModeComponent = <
  M extends TimeMode | undefined = 'range',
  V extends TemporalValueMode = 'timestamp',
>(
  props: TimeProps<M, V> &
    Listeners<M, V> &
    VNodeProps &
    AllowedComponentProps &
    ComponentCustomProps
) => VNode & {
  __ctx?: {
    props: TimeProps<M, V> & Listeners<M, V>
    emit: EmitFn<TimeEmits<M, V>>
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
