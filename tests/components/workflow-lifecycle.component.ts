import { afterEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, shallowRef } from 'vue'
import { useWorkflowNodes } from '../../src/components/C_WorkFlow/composables/useWorkflowNodes'
import { useWorkflowValidation } from '../../src/components/C_WorkFlow/composables/useWorkflowValidation'
import type { WorkflowNode } from '../../src/components/C_WorkFlow/types'

afterEach(() => vi.useRealTimers())

test('workflow fitting uses pixel padding rather than SDK ratio padding on every entry point', async () => {
  vi.useFakeTimers()
  const fitView = vi.fn()
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes({}, () => {}, shallowRef({ fitView }))
        return () => null
      },
    })
  )
  await nextTick()
  await vi.advanceTimersByTimeAsync(300)
  expect(fitView).toHaveBeenLastCalledWith({
    padding: '80px',
    includeHiddenNodes: false,
    minZoom: 0.8,
    maxZoom: 1.2,
    duration: 600,
  })
  workflow.fitView()
  await nextTick()
  expect(fitView).toHaveBeenLastCalledWith({
    padding: '50px',
    includeHiddenNodes: false,
    minZoom: 0.5,
    maxZoom: 1.5,
    duration: 800,
  })
  workflow.addNode('copy')
  await nextTick()
  await vi.advanceTimersByTimeAsync(100)
  expect(fitView).toHaveBeenLastCalledWith({ padding: '60px', duration: 400 })
  workflow.resetNodes()
  await nextTick()
  await vi.advanceTimersByTimeAsync(100)
  expect(fitView).toHaveBeenLastCalledWith({ padding: '80px', duration: 600 })
  wrapper.unmount()
})

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

test('node factories preserve the public type/data relation for every node kind', () => {
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes({}, () => {}, shallowRef({}))
        return () => null
      },
    })
  )
  for (const type of ['start', 'approval', 'copy', 'condition'] as const)
    workflow.addNode(type)
  const { nodes } = workflow.getCurrentWorkflowData()
  expect(nodes.find(node => node.type === 'approval')?.data).toMatchObject({
    approvers: [],
    approvalMode: 'any',
  })
  expect(nodes.find(node => node.type === 'copy')?.data).toMatchObject({
    copyUsers: [],
  })
  expect(nodes.find(node => node.type === 'condition')?.data).toMatchObject({
    conditions: [],
  })
  expect(
    nodes
      .filter(node => node.type === 'start')
      .every(node => node.data.status === 'active')
  ).toBe(true)
  wrapper.unmount()
})
