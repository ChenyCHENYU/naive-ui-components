import Runtime from './index.vue'
import type {
  EmitFn,
  VNode,
  VNodeProps,
  AllowedComponentProps,
  ComponentCustomProps,
} from 'vue'
import type { GanttTask, GanttProps, GanttEmits, GanttExpose } from './types'

type Listeners<T extends GanttTask> = {
  [E in keyof GanttEmits<T> as `on${Capitalize<E>}`]?: (
    ...args: GanttEmits<T>[E]
  ) => void
}

/** 公开声明复用命名契约，避免生成器重复展开后代联合；运行时组件保持原对象。 */
type GanttComponent = <T extends GanttTask = GanttTask>(
  props: GanttProps<T> &
    Listeners<T> &
    VNodeProps &
    AllowedComponentProps &
    ComponentCustomProps
) => VNode & {
  __ctx?: {
    props: GanttProps<T> & Listeners<T>
    emit: EmitFn<GanttEmits<T>>
    attrs: Record<string, unknown>
    slots: Record<string, never>
    expose: (exposed: GanttExpose<T>) => void
  }
}

export const C_VtableGantt = Runtime as unknown as GanttComponent
export type {
  GanttTask,
  GanttTaskRecord,
  GanttTaskNodeRecord,
  GanttOptions,
  GanttPreset,
  GanttProps,
  GanttEmits,
  GanttExpose,
  GanttTaskChanges,
  GanttClickEvent,
  GanttTaskBarContext,
  GanttTaskBarLayout,
  GanttTimelineContext,
  GanttTimelineLayout,
  GanttTaskCellContext,
  GanttTaskCellLayout,
} from './types'

export { presetConfigs as ganttPresetConfigs } from './data'
export { appendGanttGroup } from './graphics'
