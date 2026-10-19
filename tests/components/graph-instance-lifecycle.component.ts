import { afterEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, isReactive, ref } from 'vue'
import { useGraphBase } from '../../src/components/C_AntV/composables/useGraphBase'
import C_VtableGantt from '../../src/components/C_VtableGantt/index.vue'

const instances = vi.hoisted(() => ({
  graphs: [] as any[],
  gantts: [] as any[],
}))

vi.mock('@antv/x6', () => ({
  Graph: class {
    #disposed = false
    constructor() {
      instances.graphs.push(this)
    }
    centerContent() {
      if (this.#disposed) throw new Error('graph already disposed')
    }
    dispose() {
      this.#disposed = true
    }
    get disposed() {
      return this.#disposed
    }
  },
}))

vi.mock('@visactor/vtable-gantt', () => ({
  Gantt: class {
    #records: unknown[] = []
    #released = false
    constructor() {
      instances.gantts.push(this)
    }
    on() {}
    setRecords(records: unknown[]) {
      this.#records = records
    }
    release() {
      this.#released = true
    }
    get records() {
      return this.#records
    }
    get released() {
      return this.#released
    }
  },
}))

vi.mock('@visactor/vtable', () => ({ themes: { DARK: {}, DEFAULT: {} } }))

afterEach(() => {
  vi.useRealTimers()
  instances.graphs.length = 0
  instances.gantts.length = 0
})

test('AntV retains the raw graph and safely invokes class methods through its controller', async () => {
  let controller!: ReturnType<typeof useGraphBase>
  const wrapper = mount(
    defineComponent({
      setup() {
        const container = ref<HTMLElement>()
        controller = useGraphBase(container)
        return { container }
      },
      template: '<div ref="container" />',
    })
  )
  await controller.initGraph()
  const graph = instances.graphs[0]
  expect(controller.graph.value).toBe(graph)
  expect(isReactive(controller.graph.value)).toBe(false)
  expect(() => controller.centerContent()).not.toThrow()
  wrapper.unmount()
  expect(graph.disposed).toBe(true)
})

test('Gantt retains raw instances and cancels delayed startup after an early configuration update', async () => {
  vi.useFakeTimers()
  const wrapper = mount(C_VtableGantt, { props: { showToolbar: false } })
  await flushPromises()
  await wrapper.setProps({
    theme: 'dark',
    options: { grid: { backgroundColor: '#111' } },
  })
  await flushPromises()
  expect(instances.gantts).toHaveLength(1)
  const first = instances.gantts[0]
  expect(wrapper.vm.ganttInstance).toBe(first)
  expect(isReactive(wrapper.vm.ganttInstance)).toBe(false)
  wrapper.vm.updateData([
    { id: 1, title: '任务一', start: '2026-10-19', end: '2026-10-20' },
  ])
  expect(first.records).toMatchObject([{ id: 1, title: '任务一' }])
  await vi.advanceTimersByTimeAsync(100)
  await flushPromises()
  expect(instances.gantts).toHaveLength(1)
  await wrapper.setProps({
    theme: 'light',
    options: { grid: { backgroundColor: '#fff' } },
  })
  await flushPromises()
  expect(instances.gantts).toHaveLength(2)
  expect(first.released).toBe(true)
  const current = instances.gantts[1]
  wrapper.unmount()
  expect(current.released).toBe(true)
  await vi.runOnlyPendingTimersAsync()
  expect(instances.gantts).toHaveLength(2)
})
