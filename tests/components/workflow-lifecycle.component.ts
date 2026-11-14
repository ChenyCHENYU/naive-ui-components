import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NButton, NDrawer, NModal, NRadioGroup } from 'naive-ui'
import {
  defineComponent,
  h,
  KeepAlive,
  nextTick,
  onActivated,
  onDeactivated,
  ref,
  shallowRef,
  type VNode,
} from 'vue'
import Workflow from '../../src/components/C_WorkFlow/index.vue'
import { useWorkflowNodes } from '../../src/components/C_WorkFlow/composables/useWorkflowNodes'
import { useWorkflowValidation } from '../../src/components/C_WorkFlow/composables/useWorkflowValidation'
import type {
  WorkflowData,
  WorkflowNode,
} from '../../src/components/C_WorkFlow/types'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function cachedPage(renderPage: () => VNode) {
  const active = ref(true)
  const OtherPage = defineComponent({
    setup: () => () => h('div', 'other-page'),
  })
  const Host = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, {
        default: () => (active.value ? renderPage() : h(OtherPage)),
      }),
  })
  return { active, Host }
}

function workflowModel(): WorkflowData {
  return {
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 150, y: 100 },
        data: { title: '发起人', status: 'active' },
      },
      {
        id: 'approval',
        type: 'approval',
        position: { x: 150, y: 300 },
        data: { title: '未完成的审批', approvers: [], approvalMode: 'any' },
      },
    ],
    edges: [{ id: 'connection', source: 'start', target: 'approval' }],
    config: { version: 'draft', createdAt: '2026-11-14T00:00:00.000Z' },
  }
}

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

test('a cached workflow closes its teleported menu and preserves the graph for a fresh interaction', async () => {
  const model = workflowModel()
  const { active, Host } = cachedPage(() => h(Workflow, { modelValue: model }))
  const wrapper = mount(Host, { attachTo: document.body })
  await flushPromises()
  const workflow = wrapper.getComponent(Workflow)
  await workflow.get('.add-node-btn').trigger('click')
  const menu = document.body.querySelector<HTMLElement>('.add-node-menu')!
  expect(menu.style.display).not.toBe('none')

  active.value = false
  await flushPromises()
  expect(wrapper.text()).toBe('other-page')
  expect(menu.style.display).toBe('none')
  expect(workflow.vm.getCurrentWorkflowData()).toEqual(model)
  expect(workflow.emitted('change')).toBeUndefined()

  active.value = true
  await flushPromises()
  expect(menu.style.display).toBe('none')
  await workflow.get('.add-node-btn').trigger('click')
  expect(menu.style.display).not.toBe('none')
  const copy = Array.from(menu.querySelectorAll('button')).find(button =>
    button.textContent?.includes('抄送')
  )!
  copy.click()
  await flushPromises()
  expect(workflow.vm.getCurrentWorkflowData().nodes).toHaveLength(3)
  expect(workflow.emitted('change')).toHaveLength(1)
  wrapper.unmount()
  expect(document.body.contains(menu)).toBe(false)
})

test('viewport resizing cancels the node menu without changing the workflow model', async () => {
  const model = workflowModel()
  const wrapper = mount(Workflow, {
    props: { modelValue: model },
    attachTo: document.body,
  })
  await flushPromises()
  await wrapper.get('.add-node-btn').trigger('click')
  await flushPromises()
  const menu = document.body.querySelector<HTMLElement>('.add-node-menu')!
  expect(menu.style.display).not.toBe('none')
  window.dispatchEvent(new Event('resize'))
  await flushPromises()
  expect(menu.style.display).toBe('none')
  expect(wrapper.vm.getCurrentWorkflowData()).toEqual(model)
  expect(wrapper.emitted('change')).toBeUndefined()
  await wrapper.get('.add-node-btn').trigger('click')
  await flushPromises()
  expect(menu.style.display).not.toBe('none')
  wrapper.unmount()
  expect(document.body.contains(menu)).toBe(false)
})

test('cached workflow viewport tasks expire on deactivation while graph edits survive', async () => {
  vi.useFakeTimers()
  const fitView = vi.fn()
  const emit = vi.fn()
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const Page = defineComponent({
    setup() {
      workflow = useWorkflowNodes(
        { modelValue: workflowModel() },
        emit,
        shallowRef({ fitView })
      )
      return () => h('div', 'workflow-page')
    },
  })
  const { active, Host } = cachedPage(() => h(Page))
  const wrapper = mount(Host)
  workflow.addNode('copy')
  await nextTick()
  const draft = workflow.getCurrentWorkflowData()
  const calls = emit.mock.calls.length

  active.value = false
  workflow.fitView()
  await nextTick()
  await vi.advanceTimersByTimeAsync(300)
  expect(fitView).not.toHaveBeenCalled()
  expect(workflow.getCurrentWorkflowData()).toEqual(draft)
  expect(emit).toHaveBeenCalledTimes(calls)

  active.value = true
  await nextTick()
  workflow.fitView()
  await nextTick()
  expect(fitView).toHaveBeenCalledOnce()
  wrapper.unmount()
})

test('an immediate cached-page return cannot revive a viewport task from its previous activation', async () => {
  vi.useFakeTimers()
  const fitView = vi.fn()
  const lifecycle: string[] = []
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const Page = defineComponent({
    setup() {
      workflow = useWorkflowNodes({}, () => {}, shallowRef({ fitView }))
      onActivated(() => lifecycle.push('activated'))
      onDeactivated(() => {
        lifecycle.push('deactivated')
        active.value = true
      })
      return () => h('div', 'workflow-page')
    },
  })
  const { active, Host } = cachedPage(() => h(Page))
  const wrapper = mount(Host)
  await nextTick()
  active.value = false
  workflow.fitView()
  await nextTick()
  expect(lifecycle).toEqual(['activated', 'deactivated', 'activated'])
  expect(wrapper.text()).toBe('workflow-page')
  expect(fitView).not.toHaveBeenCalled()
  workflow.fitView()
  await nextTick()
  expect(fitView).toHaveBeenCalledOnce()
  wrapper.unmount()
})

test.each([
  { anchor: [790, 590], expected: ['488px', '492px'] },
  { anchor: [-20, -30], expected: ['8px', '8px'] },
])(
  'the workflow menu stays within viewport bounds for anchor $anchor',
  async ({ anchor, expected }) => {
    vi.stubGlobal('innerWidth', 800)
    vi.stubGlobal('innerHeight', 600)
    const wrapper = mount(Workflow, {
      props: { modelValue: workflowModel() },
      attachTo: document.body,
    })
    await flushPromises()
    const menu = document.body.querySelector<HTMLElement>('.add-node-menu')!
    const measure = vi
      .spyOn(menu, 'getBoundingClientRect')
      .mockImplementation(() =>
        menu.style.display === 'none'
          ? new DOMRect()
          : new DOMRect(0, 0, 304, 100)
      )
    const trigger = wrapper.get('.start-node .add-node-btn')
    vi.spyOn(trigger.element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(anchor[0], anchor[1] - 10, 0, 0)
    )
    await trigger.trigger('click')
    await flushPromises()
    expect([menu.style.left, menu.style.top]).toEqual(expected)
    expect(measure).toHaveBeenCalledOnce()
    expect(measure.mock.results[0].value.width).toBe(304)

    const nextTrigger = wrapper.get('.approval-node .add-node-btn')
    vi.spyOn(nextTrigger.element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(100, 90, 0, 0)
    )
    await nextTrigger.trigger('click')
    await flushPromises()
    expect([menu.style.left, menu.style.top]).toEqual(['100px', '100px'])
    expect(measure).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  }
)

test.each(['deactivate', 'unmount'] as const)(
  'a menu waiting for its visible DOM update is not measured after %s',
  async reason => {
    let leaveAfterUpdate = false
    const { active, Host } = cachedPage(() =>
      h(Workflow, {
        modelValue: workflowModel(),
        onVnodeUpdated: () => {
          if (!leaveAfterUpdate) return
          leaveAfterUpdate = false
          if (reason === 'deactivate') active.value = false
          else wrapper.unmount()
        },
      })
    )
    const wrapper = mount(Host, { attachTo: document.body })
    await flushPromises()
    const menu = document.body.querySelector<HTMLElement>('.add-node-menu')!
    const measure = vi
      .spyOn(menu, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 304, 100))
    leaveAfterUpdate = true
    await wrapper.get('.add-node-btn').trigger('click')
    await flushPromises()
    expect(measure).not.toHaveBeenCalled()
    if (reason === 'deactivate') {
      expect(wrapper.text()).toBe('other-page')
      expect(menu.style.display).toBe('none')
      wrapper.unmount()
    } else expect(document.body.contains(menu)).toBe(false)
  }
)

test('cached workflow error navigation expires without discarding validation results', async () => {
  vi.useFakeTimers()
  const showConfig = vi.fn()
  let validation!: ReturnType<typeof useWorkflowValidation>
  const Page = defineComponent({
    setup() {
      validation = useWorkflowValidation(
        ref(workflowModel().nodes),
        ref(workflowModel().edges),
        shallowRef({ setCenter: vi.fn() }),
        { onShowNodeConfig: showConfig }
      )
      return () => h('div', 'workflow-page')
    },
  })
  const { active, Host } = cachedPage(() => h(Page))
  const wrapper = mount(Host)
  validation.validateCurrentWorkflow()
  const errors = [...validation.validationErrors.value]
  expect(validation.showValidationErrors.value).toBe(true)
  validation.jumpToErrorNode('approval')
  active.value = false
  await nextTick()
  expect(validation.showValidationErrors.value).toBe(false)
  expect(validation.validationErrors.value).toEqual(errors)
  await vi.advanceTimersByTimeAsync(900)
  expect(showConfig).not.toHaveBeenCalled()

  active.value = true
  await nextTick()
  validation.jumpToErrorNode('approval')
  await vi.advanceTimersByTimeAsync(900)
  expect(showConfig).toHaveBeenCalledOnce()
  validation.jumpToErrorNode('approval')
  wrapper.unmount()
  await vi.advanceTimersByTimeAsync(900)
  expect(showConfig).toHaveBeenCalledOnce()
})

test('deactivation cancels an unconfirmed node modal session without committing it on return', async () => {
  let confirm!: (value: boolean) => void
  const Picker = defineComponent({
    name: 'C_UserPicker',
    setup(_, { expose }) {
      expose({
        confirm: () =>
          new Promise<boolean>(resolve => {
            confirm = resolve
          }),
      })
      return () => h('div', 'people-picker')
    },
  })
  const model = workflowModel()
  const approval = model.nodes.find(node => node.type === 'approval')!
  approval.data.approvers = [
    { id: 'A', name: '甲', department: '研发', role: '主管' },
  ]
  const { active, Host } = cachedPage(() => h(Workflow, { modelValue: model }))
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { C_UserPicker: Picker } },
  })
  await flushPromises()
  const workflow = wrapper.getComponent(Workflow)
  await workflow.get('.approval-node .node-card').trigger('click')
  await vi.waitFor(() =>
    expect(workflow.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
      true
    )
  )
  workflow.getComponent(NRadioGroup).vm.$emit('update:value', 'all')
  await nextTick()
  expect(workflow.vm.getCurrentWorkflowData()).toEqual(model)
  const modal = workflow.getComponent(NModal)
  const pending = modal.props('onPositiveClick')!()
  active.value = false
  await flushPromises()
  expect(workflow.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
    false
  )
  confirm(true)
  await pending
  await flushPromises()
  expect(workflow.vm.getCurrentWorkflowData()).toEqual(model)
  expect(workflow.emitted('change')).toBeUndefined()

  active.value = true
  await flushPromises()
  expect(workflow.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
    false
  )
  await workflow.get('.approval-node .node-card').trigger('click')
  await flushPromises()
  expect(workflow.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
    true
  )
  wrapper.unmount()
})

test.each(['validation', 'preview'] as const)(
  'deactivation closes the %s drawer without reopening it or changing the graph',
  async drawer => {
    const model = workflowModel()
    const { active, Host } = cachedPage(() =>
      h(Workflow, { modelValue: model })
    )
    const wrapper = mount(Host, { attachTo: document.body })
    await flushPromises()
    const workflow = wrapper.getComponent(Workflow)
    if (drawer === 'preview') workflow.vm.previewWorkflow()
    else {
      const validate = workflow
        .findAllComponents(NButton)
        .find(button => button.text() === '验证流程')!
      await validate.trigger('click')
    }
    await flushPromises()
    expect(
      workflow.findAllComponents(NDrawer).some(item => item.props('show'))
    ).toBe(true)

    active.value = false
    await flushPromises()
    expect(
      workflow.findAllComponents(NDrawer).every(item => !item.props('show'))
    ).toBe(true)
    active.value = true
    await flushPromises()
    expect(
      workflow.findAllComponents(NDrawer).every(item => !item.props('show'))
    ).toBe(true)
    expect(workflow.vm.getCurrentWorkflowData()).toEqual(model)
    expect(workflow.emitted('change')).toBeUndefined()
    wrapper.unmount()
  }
)
