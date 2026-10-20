import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Graph } from '@antv/x6'
import type { DiagramData } from '../../src/components/C_AntV/types'
import type { BpmnCell } from '../../src/components/C_AntV/bpmnAdapter'
import DiagramView from '../../src/components/C_AntV/index.vue'

const state = vi.hoisted(() => ({
  graph: null as Graph | null,
  data: undefined as DiagramData | BpmnCell[] | undefined,
}))
vi.mock('../../src/components/C_AntV/layout/ER/index.vue', () => ({
  default: {
    template: '<div />',
    methods: {
      getGraph: () => state.graph,
      getData: () => state.data,
    },
  },
}))
vi.mock('../../src/components/C_AntV/layout/BPMN/index.vue', () => ({
  default: {
    template: '<div />',
    methods: {
      getGraph: () => state.graph,
      getData: () => state.data,
    },
  },
}))
vi.mock('../../src/components/C_AntV/layout/UML/index.vue', () => ({
  default: {
    template: '<div />',
    methods: {
      getGraph: () => state.graph,
      getData: () => state.data,
    },
  },
}))

test('diagram expose normalizes missing graphs and adapts layout data without retaining an unmounted ref', async () => {
  state.graph = null
  state.data = undefined
  const wrapper = mount(DiagramView, { props: { type: 'bpmn' } })
  await flushPromises()
  expect(wrapper.vm.getGraph()).toBeUndefined()
  expect(wrapper.vm.getData()).toBeUndefined()
  state.data = []
  expect(wrapper.vm.getData()).toEqual({ nodes: [], flows: [] })
  const graph = Object.create(null) as Graph
  state.graph = graph
  expect(wrapper.vm.getGraph()).toBe(graph)
  state.data = { tables: [], relations: [] }
  await wrapper.setProps({ type: 'er' })
  expect(wrapper.vm.getData()).toEqual(state.data)
  const exposed = wrapper.vm
  wrapper.unmount()
  expect(exposed.getGraph()).toBeUndefined()
  expect(exposed.getData()).toBeUndefined()
})
