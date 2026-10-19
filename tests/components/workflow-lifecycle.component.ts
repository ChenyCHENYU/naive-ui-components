import { afterEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, shallowRef } from 'vue'
import { useWorkflowNodes } from '../../src/components/C_WorkFlow/composables/useWorkflowNodes'
import { useWorkflowValidation } from '../../src/components/C_WorkFlow/composables/useWorkflowValidation'
import type { WorkflowNode } from '../../src/components/C_WorkFlow/types'

afterEach(() => vi.useRealTimers())

test.each(['unmount', 'replacement'])(
  'a manual workflow fit request cannot run after %s',
  async reason => {
    const fitView = vi.fn()
    const replacementFit = vi.fn()
    const canvas = shallowRef({ fitView })
    let workflow!: ReturnType<typeof useWorkflowNodes>
    const wrapper = mount(
      defineComponent({
        setup() {
          workflow = useWorkflowNodes({}, () => {}, canvas)
          return () => null
        },
      })
    )
    workflow.fitView()
    if (reason === 'unmount') wrapper.unmount()
    else canvas.value = { fitView: replacementFit }
    await nextTick()
    expect(fitView).not.toHaveBeenCalled()
    expect(replacementFit).not.toHaveBeenCalled()
    if (reason !== 'unmount') wrapper.unmount()
  }
)

test.each(['reset', 'removed', 'replaced', 'unmount', 'unchanged'])(
  'workflow error navigation handles %s before its delayed configuration',
  async reason => {
    vi.useFakeTimers()
    const nodes = ref<WorkflowNode[]>([
      {
        id: 'approval',
        type: 'approval',
        position: { x: 0, y: 0 },
        data: { title: '审批' },
      },
    ])
    const showConfig = vi.fn()
    let validation!: ReturnType<typeof useWorkflowValidation>
    const wrapper = mount(
      defineComponent({
        setup() {
          validation = useWorkflowValidation(
            nodes,
            ref([]),
            shallowRef({ setCenter: vi.fn() }),
            { onShowNodeConfig: showConfig }
          )
          return () => null
        },
      })
    )
    validation.jumpToErrorNode('approval')
    if (reason === 'reset') validation.resetValidation()
    if (reason === 'removed') nodes.value = []
    if (reason === 'replaced')
      nodes.value = nodes.value.map(node => ({ ...node }))
    if (reason === 'unmount') wrapper.unmount()
    await vi.advanceTimersByTimeAsync(900)
    expect(showConfig).toHaveBeenCalledTimes(reason === 'unchanged' ? 1 : 0)
    if (reason !== 'unmount') wrapper.unmount()
  }
)
