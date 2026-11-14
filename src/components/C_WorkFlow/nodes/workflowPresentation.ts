import {
  computed,
  defineComponent,
  inject,
  type ComputedRef,
  type InjectionKey,
} from 'vue'
import type { WorkflowNodeRenderContext, WorkflowSlots } from '../types'

export interface WorkflowPresentation {
  readonly: ComputedRef<boolean>
  renderer: ComputedRef<WorkflowSlots['node']>
  context: (id: string) => WorkflowNodeRenderContext | undefined
}

export const WORKFLOW_PRESENTATION: InjectionKey<WorkflowPresentation> = Symbol(
  'workflow-presentation'
)

/** 独立挂载节点保留可编辑默认值；画布内由唯一的只读状态控制。 */
export function useWorkflowReadonly() {
  const presentation = inject(WORKFLOW_PRESENTATION, undefined)
  return presentation?.readonly ?? computed(() => false)
}

/** 只替换内容，不交出连接点、只读边界和节点操作的所有权。 */
export const WorkflowNodeBody = defineComponent({
  name: 'WorkflowNodeBody',
  props: { nodeId: { type: String, required: true } },
  setup(props, { slots }) {
    const presentation = inject(WORKFLOW_PRESENTATION, undefined)
    return () => {
      const renderer = presentation?.renderer.value
      const context = renderer ? presentation?.context(props.nodeId) : undefined
      return context && renderer ? renderer(context) : slots.default?.()
    }
  },
})
