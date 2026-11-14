import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, shallowRef } from 'vue'
import { NButton, NDrawer, NTag } from 'naive-ui'
import Workflow from '../../src/components/C_WorkFlow/index.vue'
import { useWorkflowNodes } from '../../src/components/C_WorkFlow/composables/useWorkflowNodes'
import { validateWorkflowBranches } from '../../src/components/C_WorkFlow/composables/workflowBranches'
import type {
  WorkflowData,
  WorkflowProps,
} from '../../src/components/C_WorkFlow/types'

function model(): WorkflowData {
  return {
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 0, y: 0 },
        data: { title: 'Start', status: 'active' },
      },
      {
        id: 'condition',
        type: 'condition',
        position: { x: 0, y: 150 },
        data: {
          title: 'Route',
          conditions: [
            {
              id: 'amount',
              name: '金额',
              field: 'amount',
              operator: 'greater_than',
              value: '100',
              targetNodeId: 'approval',
            },
          ],
        },
      },
      {
        id: 'approval',
        type: 'approval',
        position: { x: 0, y: 300 },
        data: {
          title: 'Approval',
          approvers: [{ id: 'a', name: 'A', department: 'D', role: 'R' }],
        },
      },
      {
        id: 'copy',
        type: 'copy',
        position: { x: 0, y: 450 },
        data: { title: 'Copy' },
      },
    ],
    edges: [
      { id: 'a', source: 'start', target: 'condition' },
      {
        id: 'b',
        source: 'condition',
        target: 'approval',
        label: '原标签',
        data: { business: true },
      },
      { id: 'c', source: 'approval', target: 'copy' },
    ],
  }
}

test('real custom nodes expose source/target handles while readonly hides mutation controls', async () => {
  const wrapper = mount(Workflow, {
    props: { modelValue: model(), readonly: true },
  })
  await flushPromises()
  expect(wrapper.findAll('.vue-flow__handle.source')).toHaveLength(4)
  expect(wrapper.findAll('.vue-flow__handle.target')).toHaveLength(3)
  expect(wrapper.findAll('.workflow-port--readonly')).toHaveLength(7)
  expect(wrapper.vm.getCurrentWorkflowData().edges).toEqual(model().edges)
  expect(wrapper.findAll('.add-node-btn, .delete-btn')).toHaveLength(0)
  expect(wrapper.find('.node-config-modal').exists()).toBe(false)
  await wrapper.setProps({ readonly: false })
  expect(wrapper.findAll('.add-node-btn')).toHaveLength(4)
  expect(wrapper.findAll('.workflow-port--readonly')).toHaveLength(0)
  wrapper.unmount()
})

test('SDK hydration preserves imported edges so cycle policy reports instead of silently rewriting the graph', async () => {
  const data = model()
  data.edges.push({ id: 'cycle', source: 'copy', target: 'condition' })
  const wrapper = mount(Workflow, {
    props: { modelValue: data, readonly: true, allowCycles: false },
  })
  await flushPromises()
  expect(wrapper.vm.getCurrentWorkflowData().edges).toEqual(data.edges)
  expect(
    wrapper.vm.validateWorkflow().some(issue => issue.field === 'cycle')
  ).toBe(true)
  wrapper.unmount()
})

test('readonly design preview keeps same-name people keyed by identity and disables its save action', async () => {
  const data = model()
  const approval = data.nodes.find(node => node.type === 'approval')!
  approval.data.approvers = [
    { id: 'person-a', name: '同名', department: '研发', role: '主管' },
    { id: 'person-b', name: '同名', department: '产品', role: '主管' },
  ]
  const wrapper = mount(Workflow, {
    props: { modelValue: data, readonly: true },
  })
  wrapper.vm.previewWorkflow()
  await flushPromises()
  const tags = wrapper.findAllComponents(NTag)
  expect(tags.map(tag => tag.vm.$.vnode.key)).toEqual(['person-a', 'person-b'])
  expect(tags.map(tag => tag.text())).toEqual(['同名', '同名'])
  const save = wrapper
    .findAllComponents(NButton)
    .find(button => button.text() === '确认并保存')!
  expect(save.props('disabled')).toBe(true)
  await save.trigger('click')
  expect(wrapper.findAllComponents(NDrawer).at(-1)?.props('show')).toBe(true)
  expect(wrapper.emitted('save')).toBeUndefined()
  wrapper.unmount()
})

test('custom node bodies receive public snapshots and keep wrapper ports', async () => {
  const wrapper = mount(Workflow, {
    props: { modelValue: model(), readonly: true },
    slots: {
      node: ({ node, readonly }) => {
        node.data.title = `Custom ${node.id}`
        return h(
          'strong',
          { 'data-custom-node': node.id },
          `${node.data.title}:${readonly}`
        )
      },
    },
  })
  await flushPromises()
  expect(wrapper.findAll('[data-custom-node]')).toHaveLength(4)
  expect(wrapper.findAll('.vue-flow__handle')).toHaveLength(7)
  expect(wrapper.vm.getCurrentWorkflowData().nodes[0].data.title).toBe('Start')
  wrapper.unmount()
})

test('reconnection retains explicit branch meaning and connection snapshots keep ports', async () => {
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const props = reactive<WorkflowProps>({
    modelValue: model(),
    allowCycles: false,
  })
  const emit = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes(props, emit, shallowRef({}))
        return () => null
      },
    })
  )
  workflow.updateConnection({
    edge: workflow.edges.value[1],
    connection: {
      source: 'condition',
      target: 'copy',
      sourceHandle: 'output',
      targetHandle: 'input',
    },
  } as Parameters<typeof workflow.updateConnection>[0])
  await nextTick()
  const snapshot = workflow.getCurrentWorkflowData()
  expect(
    snapshot.nodes.find(node => node.type === 'condition')?.data
  ).toMatchObject({ conditions: [{ targetNodeId: 'copy' }] })
  expect(snapshot.edges[1]).toMatchObject({
    sourceHandle: 'output',
    targetHandle: 'input',
    label: '原标签',
    data: { business: true },
  })
  expect(
    workflow.canConnect({
      source: 'copy',
      target: 'start',
      sourceHandle: null,
      targetHandle: null,
    })
  ).toBe(false)
  wrapper.unmount()
})

test('bound branch insertion never merges routes through the generic add menu', async () => {
  const wrapper = mount(Workflow, {
    props: { modelValue: model(), allowedNodeTypes: ['copy'] },
    global: { stubs: { Teleport: true } },
  })
  await flushPromises()
  const before = wrapper.vm.getCurrentWorkflowData()
  await wrapper.find('.condition-node .add-node-btn').trigger('click')
  expect(wrapper.findAll('.add-menu-item')).toHaveLength(1)
  await wrapper.find('.add-menu-item').trigger('click')
  expect(wrapper.vm.getCurrentWorkflowData()).toEqual(before)
  expect(wrapper.emitted('change')).toBeUndefined()
  wrapper.unmount()
})

test('configuration loads on first edit and unmounts on readonly and subsequent close', async () => {
  const wrapper = mount(Workflow, { props: { modelValue: model() } })
  await flushPromises()
  expect(wrapper.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
    false
  )
  await wrapper.find('.approval-node .node-card').trigger('click')
  expect(wrapper.emitted('node-click')?.[0]?.[0]).toMatchObject({
    id: 'approval',
  })
  await vi.waitFor(() =>
    expect(wrapper.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
      true
    )
  )
  await wrapper.setProps({ readonly: true })
  expect(wrapper.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
    false
  )
  await wrapper.setProps({ readonly: false })
  await wrapper.find('.copy-node .node-card').trigger('click')
  await flushPromises()
  const dialog = wrapper.findComponent({ name: 'NodeConfigModal' })
  expect(dialog.props('currentNode')?.id).toBe('copy')
  dialog.vm.$emit('cancel')
  await nextTick()
  expect(wrapper.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
    false
  )
  wrapper.unmount()
})

test('saved approval configuration updates the real canvas title and personnel order before reopening', async () => {
  const data = model()
  const people = [
    { id: 'shen', name: '沈一', department: '研发', role: '主管' },
    { id: 'zhou', name: '周屿', department: '产品', role: '主管' },
  ]
  const approval = data.nodes.find(node => node.type === 'approval')!
  approval.data.approvers = people
  const wrapper = mount(Workflow, {
    props: { modelValue: data, users: people },
  })
  await flushPromises()
  const names = () =>
    wrapper.findAll('.approval-node .approver-name').map(item => item.text())
  expect(names()).toEqual(['沈一', '周屿'])
  await wrapper.find('.approval-node .node-card').trigger('click')
  await vi.waitFor(() =>
    expect(wrapper.findComponent({ name: 'NodeConfigModal' }).exists()).toBe(
      true
    )
  )
  wrapper
    .findComponent({ name: 'NodeConfigModal' })
    .vm.$emit('save', {
      title: '顺序审核',
      approvalMode: 'sequence',
      approvers: [people[1], people[0]],
    })
  await flushPromises()
  expect(
    wrapper.vm
      .getCurrentWorkflowData()
      .nodes.find(node => node.type === 'approval')?.data
  ).toMatchObject({ approvers: [{ id: 'zhou' }, { id: 'shen' }] })
  expect(names()).toEqual(['周屿', '沈一'])
  expect(wrapper.find('.approval-node .node-title').text()).toBe('顺序审核')
  await wrapper.find('.approval-node .node-card').trigger('click')
  await flushPromises()
  expect(
    wrapper.findComponent({ name: 'NodeConfigModal' }).props('currentNode')
      ?.data
  ).toMatchObject({ approvers: [{ id: 'zhou' }, { id: 'shen' }] })
  wrapper.unmount()
})

test('deleting a bound route target reconnects one downstream and preserves explicit edge metadata', () => {
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const data = model()
  data.edges[1].sourceHandle = 'output'
  data.edges[2].targetHandle = 'input'
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes(
          { modelValue: data },
          vi.fn(),
          shallowRef({})
        )
        return () => null
      },
    })
  )
  workflow.deleteNode('approval')
  const snapshot = workflow.getCurrentWorkflowData()
  expect(
    snapshot.nodes.find(node => node.type === 'condition')?.data
  ).toMatchObject({ conditions: [{ targetNodeId: 'copy' }] })
  expect(
    snapshot.edges.find(edge => edge.source === 'condition')
  ).toMatchObject({
    target: 'copy',
    label: '原标签',
    data: { business: true },
    sourceHandle: 'output',
    targetHandle: 'input',
  })
  wrapper.unmount()
})

test('deletion cannot create a self-loop while bypassing an imported cycle', () => {
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const data = model()
  data.edges.push({ id: 'return', source: 'copy', target: 'approval' })
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes(
          { modelValue: data },
          vi.fn(),
          shallowRef({})
        )
        return () => null
      },
    })
  )
  workflow.deleteNode('approval')
  expect(workflow.getCurrentWorkflowData()).toEqual(data)
  wrapper.unmount()
})

test('deleting a node removes its imported self-loop instead of bypassing through a removed endpoint', () => {
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const data = model()
  data.edges.push({ id: 'self', source: 'approval', target: 'approval' })
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes(
          { modelValue: data },
          vi.fn(),
          shallowRef({})
        )
        return () => null
      },
    })
  )
  workflow.deleteNode('approval')
  const snapshot = workflow.getCurrentWorkflowData()
  expect(snapshot.nodes.some(node => node.id === 'approval')).toBe(false)
  expect(
    snapshot.edges.some(
      edge => edge.source === 'approval' || edge.target === 'approval'
    )
  ).toBe(false)
  expect(snapshot.edges.find(edge => edge.source === 'condition')?.target).toBe(
    'copy'
  )
  wrapper.unmount()
})

test('canvas delete keys preserve the start node and route target deletion through branch-aware removal', async () => {
  const data = model()
  data.nodes[0].selected = true
  const wrapper = mount(Workflow, { props: { modelValue: data } })
  await flushPromises()
  await wrapper.trigger('keydown', { key: 'Backspace' })
  expect(
    wrapper.vm.getCurrentWorkflowData().nodes.some(node => node.id === 'start')
  ).toBe(true)
  const next = model()
  next.nodes[2].selected = true
  await wrapper.setProps({ modelValue: next })
  await flushPromises()
  expect(wrapper.vm.getCurrentWorkflowData().edges).toEqual(next.edges)
  await wrapper.trigger('keydown', { key: 'Delete' })
  const snapshot = wrapper.vm.getCurrentWorkflowData()
  expect(snapshot.nodes.some(node => node.id === 'approval')).toBe(false)
  expect(
    snapshot.nodes.find(node => node.type === 'condition')?.data
  ).toMatchObject({ conditions: [{ targetNodeId: 'copy' }] })
  wrapper.unmount()
})

test('canvas delete shortcuts leave text editing and readonly graphs untouched', async () => {
  const data = model()
  data.nodes[2].selected = true
  const wrapper = mount(Workflow, {
    props: { modelValue: data },
    slots: { node: () => h('input', { value: 'typing' }) },
  })
  await flushPromises()
  await wrapper.find('input').trigger('keydown', { key: 'Backspace' })
  expect(wrapper.vm.getCurrentWorkflowData().nodes).toHaveLength(4)
  await wrapper.setProps({ readonly: true })
  await wrapper.trigger('keydown', { key: 'Delete' })
  expect(wrapper.vm.getCurrentWorkflowData().nodes).toHaveLength(4)
  wrapper.unmount()
})

test('keyboard edge deletion retains the business condition for actionable validation', async () => {
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes(
          { modelValue: model() },
          vi.fn(),
          shallowRef({})
        )
        return () => null
      },
    })
  )
  Reflect.set(workflow.edges.value[1], 'selected', true)
  workflow.handleCanvasKeydown(new KeyboardEvent('keydown', { key: 'Delete' }))
  await nextTick()
  const snapshot = workflow.getCurrentWorkflowData()
  expect(snapshot.edges.some(edge => edge.id === 'b')).toBe(false)
  expect(
    snapshot.nodes.find(node => node.type === 'condition')?.data
  ).toMatchObject({ conditions: [{ targetNodeId: 'approval' }] })
  expect(
    validateWorkflowBranches(snapshot.nodes, snapshot.edges).some(issue =>
      issue.message.includes('尚未连接')
    )
  ).toBe(true)
  wrapper.unmount()
})

test('stale dialogs cannot overwrite replacement models', async () => {
  let workflow!: ReturnType<typeof useWorkflowNodes>
  const props = reactive<WorkflowProps>({ modelValue: model() })
  const emit = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes(props, emit, shallowRef({}))
        return () => null
      },
    })
  )
  workflow.onNodeClick({ node: { id: 'approval' } })
  const replacement = model()
  replacement.nodes[2].data.title = 'New scope'
  props.modelValue = replacement
  await nextTick()
  workflow.handleConfigSave({ title: 'Stale dialog' })
  expect(workflow.getCurrentWorkflowData().nodes[2].data.title).toBe(
    'New scope'
  )
  expect(workflow.showNodeConfig.value).toBe(false)
  wrapper.unmount()
})
