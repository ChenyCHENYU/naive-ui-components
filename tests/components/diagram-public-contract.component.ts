import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Graph } from '@antv/x6'
import type { DiagramData } from '../../src/components/C_AntV/types'
import type { BpmnCell } from '../../src/components/C_AntV/bpmnAdapter'
import DiagramView from '../../src/components/C_AntV/index.vue'

const state = vi.hoisted(() => ({
  graph: null as Graph | null,
  data: undefined as DiagramData | BpmnCell[] | undefined,
  loaded: [] as string[],
}))
vi.mock('../../src/components/C_AntV/layout/ER/index.vue', () => {
  state.loaded.push('er')
  return {
    default: {
      template: '<div />',
      methods: {
        getGraph: () => state.graph,
        getData: () => state.data,
      },
    },
  }
})
vi.mock('../../src/components/C_AntV/layout/BPMN/index.vue', () => {
  state.loaded.push('bpmn')
  return {
    default: {
      template: '<div />',
      methods: {
        getGraph: () => state.graph,
        getData: () => state.data,
      },
    },
  }
})
vi.mock('../../src/components/C_AntV/layout/UML/index.vue', () => {
  state.loaded.push('uml')
  return {
    default: {
      template: '<div />',
      methods: {
        getGraph: () => state.graph,
        getData: () => state.data,
      },
    },
  }
})

test('diagram expose normalizes missing graphs and adapts layout data without retaining an unmounted ref', async () => {
  state.graph = null
  state.data = undefined
  const wrapper = mount(DiagramView, { props: { type: 'bpmn' } })
  await flushPromises()
  expect(wrapper.vm.getGraph()).toBeUndefined()
  expect(wrapper.vm.getData()).toBeUndefined()
  state.data = []
  await vi.waitFor(() =>
    expect(wrapper.vm.getData()).toEqual({ nodes: [], flows: [] })
  )
  expect(state.loaded).toEqual(['bpmn'])
  const graph = Object.create(null) as Graph
  state.graph = graph
  expect(wrapper.vm.getGraph()).toBe(graph)
  state.data = { tables: [], relations: [] }
  await wrapper.setProps({ type: 'er' })
  await vi.waitFor(() => expect(wrapper.vm.getData()).toEqual(state.data))
  expect(state.loaded).toEqual(['bpmn', 'er'])
  const exposed = wrapper.vm
  wrapper.unmount()
  expect(exposed.getGraph()).toBeUndefined()
  expect(exposed.getData()).toBeUndefined()
})
