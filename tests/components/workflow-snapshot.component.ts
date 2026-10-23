import { expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, reactive, shallowRef } from 'vue'
import { useVueFlow, type VueFlowStore } from '@vue-flow/core'
import { cloneData } from '../../src/utils/data'
import { useWorkflowNodes } from '../../src/components/C_WorkFlow/composables/useWorkflowNodes'
import {
  getWorkflowFields,
  pruneWorkflowFields,
} from '../../src/components/C_WorkFlow/composables/workflowSnapshot'
import type {
  WorkflowData,
  WorkflowEdge,
  WorkflowNode,
  WorkflowProps,
} from '../../src/components/C_WorkFlow/types'

const initialModel = (): WorkflowData => ({
  nodes: [
    {
      id: 'start',
      type: 'start',
      position: { x: 150, y: 100 },
      data: { title: 'Start', status: 'active' },
    },
    {
      id: 'approval',
      type: 'approval',
      position: { x: 150, y: 300 },
      data: { title: 'Approval', config: { businessId: '0012' } },
    },
  ],
  edges: [
    { id: 'connection', source: 'start', target: 'approval', animated: true },
  ],
})

function setupWorkflow(model: WorkflowData) {
  const props = reactive<WorkflowProps>({ modelValue: cloneData(model) })
  const emit = vi.fn()
  let workflow!: ReturnType<typeof useWorkflowNodes>
  let flow!: VueFlowStore
  const wrapper = mount(
    defineComponent({
      setup() {
        workflow = useWorkflowNodes(props, emit, shallowRef({}))
        flow = useVueFlow({ id: crypto.randomUUID() })
        return () => null
      },
    })
  )
  const hydrate = () => {
    // Use the real SDK parser/store, including GraphNode/GraphEdge references
    // and synthesized defaults that VueFlow's v-model sends back to the host.
    flow.setNodes(cloneData(workflow.nodes.value))
    flow.setEdges(cloneData(workflow.edges.value))
    workflow.nodes.value = flow.getNodes.value as WorkflowNode[]
    workflow.edges.value = flow.getEdges.value as WorkflowEdge[]
  }
  hydrate()
  return { workflow, flow, emit, props, hydrate, wrapper }
}

test('real Vue Flow runtime fields never enter drag snapshots, parent echoes or node-click payloads', async () => {
  const model = initialModel()
  const { workflow, flow, emit, props, wrapper } = setupWorkflow(model)
  const approval = flow.findNode('approval')!
  const edge = flow.findEdge('connection')!
  expect(approval).toHaveProperty('computedPosition')
  expect(edge.sourceNode).toBe(flow.findNode('start'))
  expect(edge).toMatchObject({ type: 'default', label: '', data: {} })
  expect(workflow.getCurrentWorkflowData()).toEqual(model)

  approval.position = { x: 240, y: 255 }
  approval.selected = true
  approval.dragging = false
  edge.sourceX = 230
  edge.targetX = 320
  workflow.commitCanvasChange()
  workflow.commitCanvasChange()
  await nextTick()

  const expected = cloneData(model)
  expected.nodes[1].position = { x: 240, y: 255 }
  expect(emit.mock.calls.map(([event]) => event)).toEqual([
    'update:modelValue',
    'change',
  ])
  expect(emit.mock.calls[0][1]).toEqual(expected)
  expect(workflow.getCurrentWorkflowData()).toEqual(expected)
  expect(props.modelValue).toEqual(model)

  // A normal v-model echo must not replace the live SDK graph or emit again.
  const graphNodes = workflow.nodes.value
  const graphEdges = workflow.edges.value
  props.modelValue = cloneData(expected)
  await nextTick()
  expect(workflow.nodes.value).toBe(graphNodes)
  expect(workflow.edges.value).toBe(graphEdges)
  expect(emit).toHaveBeenCalledTimes(2)

  workflow.onNodeClick({ node: { id: 'approval' } })
  expect(emit.mock.calls.at(-1)).toEqual(['node-click', expected.nodes[1]])
  const snapshot = workflow.getCurrentWorkflowData()
  snapshot.nodes[1].data.config!.businessId = 'changed outside'
  expect(approval.data.config.businessId).toBe('0012')
  wrapper.unmount()
})

test('explicit public configuration and business data survive the SDK snapshot boundary', () => {
  const model = initialModel()
  Object.assign(model.nodes[1], {
    selected: false,
    dragging: false,
    connectable: false,
    selectable: true,
    deletable: false,
    dragHandle: '.business-handle',
    width: 240,
    height: 120,
    zIndex: 3,
    extent: [
      [0, 0],
      [500, 500],
    ],
    expandParent: true,
  })
  Object.assign(model.edges[0], {
    type: 'default',
    sourceHandle: null,
    targetHandle: 'approval-input',
    hidden: false,
    deletable: false,
    selectable: true,
    data: { sourceNode: 'business field', events: { approved: true } },
    style: { stroke: '#123456', strokeWidth: 2 },
    label: '',
    labelStyle: { fontWeight: 'bold' },
    labelShowBg: true,
    labelBgStyle: { fill: '#eeeeee' },
    labelBgPadding: [4, 6],
    labelBgBorderRadius: 8,
    markerStart: 'start-marker',
    markerEnd: 'end-marker',
  })
  const { workflow, wrapper } = setupWorkflow(model)
  expect(workflow.getCurrentWorkflowData()).toEqual(model)
  wrapper.unmount()
})

test('external replacement removes explicit optional fields and remains silent after SDK hydration', async () => {
  const model = initialModel()
  model.nodes[1].selected = true
  model.edges[0].label = 'Old label'
  model.edges[0].data = { old: true }
  const { workflow, props, hydrate, emit, wrapper } = setupWorkflow(model)
  const replacement = initialModel()
  props.modelValue = replacement
  await nextTick()
  hydrate()
  expect(workflow.getCurrentWorkflowData()).toEqual(replacement)
  expect(emit).not.toHaveBeenCalled()
  wrapper.unmount()
})

test('component-created edge configuration stays stable after the real SDK hydrates it', async () => {
  const model = initialModel()
  model.edges = []
  const { workflow, hydrate, wrapper } = setupWorkflow(model)
  workflow.connectNodes({
    source: 'start',
    target: 'approval',
    sourceHandle: null,
    targetHandle: null,
  })
  const before = workflow.getCurrentWorkflowData()
  hydrate()
  await nextTick()
  expect(before.edges[0].type).toBe('default')
  expect(workflow.getCurrentWorkflowData()).toEqual(before)
  wrapper.unmount()
})

test('field metadata is bounded by live canvas elements', () => {
  const fields = getWorkflowFields([
    { id: 'kept', selected: false },
    { id: 'removed', selected: true },
  ])
  pruneWorkflowFields([{ id: 'kept' }], fields)
  expect([...fields.keys()]).toEqual(['kept'])
  expect(fields.get('kept')?.has('selected')).toBe(true)
})
