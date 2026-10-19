import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import C_WorkFlow from '../../src/components/C_WorkFlow/index.vue'
import { useWorkflowValidation } from '../../src/components/C_WorkFlow/composables/useWorkflowValidation'
import { validateWorkflowStructure } from '../../src/components/C_WorkFlow/composables/workflowStructure'
import type {
  WorkflowEdge,
  WorkflowNode,
} from '../../src/components/C_WorkFlow/types'

vi.mock('@vue-flow/core', () => ({
  VueFlow: { name: 'VueFlow', template: '<div />' },
  Handle: { template: '<div />' },
  Position: { Top: 'top', Bottom: 'bottom' },
}))

function node(id: string, type: WorkflowNode['type'] = 'copy'): WorkflowNode {
  return { id, type, position: { x: 0, y: 0 }, data: { title: id } }
}

function edge(source: string, target: string): WorkflowEdge {
  return { id: `${source}_${target}`, source, target }
}

test('workflow validation rejects dangling endpoints and exposes the same errors through save', async () => {
  const data = {
    nodes: [node('start', 'start')],
    edges: [edge('start', 'missing')],
  }
  const wrapper = mount(C_WorkFlow, { props: { modelValue: data } })
  await flushPromises()
  const errors = wrapper.vm.validateWorkflow()
  expect(errors).toEqual([
    expect.objectContaining({
      nodeId: 'start',
      field: 'connection',
      type: 'invalid',
    }),
  ])
  wrapper.vm.saveWorkflow()
  await flushPromises()
  expect(wrapper.emitted('save')).toBeUndefined()
  expect(wrapper.emitted('validate-error')).toEqual([[errors]])
  expect(document.body.textContent).toContain('指向不存在的节点')
})

test.each([
  { nodes: [], field: 'start' },
  { nodes: [node('copy')], field: 'start' },
  { nodes: [node('a', 'start'), node('b', 'start')], field: 'start' },
  { nodes: [node('start', 'start'), node('a'), node('a')], field: 'nodeId' },
  { nodes: [node('', 'start')], field: 'nodeId' },
])(
  'workflow validates start cardinality and unique nonempty node ids: $field',
  data => {
    expect(validateWorkflowStructure(data.nodes, [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: data.field, type: 'invalid' }),
      ])
    )
  }
)

test('an isolated cycle and reverse-only connection are unreachable from the unique start', () => {
  const nodes = [node('start', 'start'), node('a'), node('b'), node('reverse')]
  const edges = [edge('a', 'b'), edge('b', 'a'), edge('reverse', 'start')]
  const errors = validateWorkflowStructure(nodes, edges)
  expect(errors.map(error => error.nodeId).sort()).toEqual([
    'a',
    'b',
    'reverse',
  ])
  expect(errors.every(error => error.field === 'connection')).toBe(true)
})

test('reachable cycles remain compatible by default and can be forbidden by a live business policy', async () => {
  const nodes = ref([node('start', 'start'), node('a'), node('b')])
  const edges = ref([edge('start', 'a'), edge('a', 'b'), edge('b', 'a')])
  const allowCycles = ref(true)
  let controller!: ReturnType<typeof useWorkflowValidation>
  mount(
    defineComponent({
      setup() {
        controller = useWorkflowValidation(nodes, edges, ref(null), {
          allowCycles: () => allowCycles.value,
        })
        return () => null
      },
    })
  )
  expect(controller.validateWorkflow()).toEqual([])
  allowCycles.value = false
  expect(controller.validateWorkflow()).toEqual([
    expect.objectContaining({ nodeId: 'a', field: 'cycle', type: 'invalid' }),
  ])
  edges.value.pop()
  expect(controller.validateWorkflow()).toEqual([])
})

test('workflow structure validation handles a long directed graph without recursive traversal', () => {
  const nodes = [
    node('start', 'start'),
    ...Array.from({ length: 15000 }, (_, index) => node(String(index))),
  ]
  const edges = nodes
    .slice(1)
    .map((current, index) => edge(nodes[index].id, current.id))
  expect(
    validateWorkflowStructure(nodes, edges, { allowCycles: false })
  ).toEqual([])
  edges.push(edge('14999', '10000'))
  expect(
    validateWorkflowStructure(nodes, edges, { allowCycles: false })
  ).toEqual([expect.objectContaining({ nodeId: '10000', field: 'cycle' })])
})

test('duplicate or empty edge ids cannot silently overwrite connections in the canvas model', () => {
  const nodes = [node('start', 'start'), node('a')]
  const edges = [edge('start', 'a'), { ...edge('a', 'start'), id: 'start_a' }]
  expect(validateWorkflowStructure(nodes, edges)).toEqual([
    expect.objectContaining({ field: 'edgeId', nodeId: 'a' }),
  ])
})
