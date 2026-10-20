import { beforeEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { GanttConstructorOptions } from '@visactor/vtable-gantt'
import GanttView from '../../src/components/C_VtableGantt/index.vue'

const state = vi.hoisted(() => ({
  fail: false,
  failBinding: false,
  attempts: 0,
  instances: [] as MockGantt[],
}))
class MockGantt {
  released = false
  constructor(readonly options: GanttConstructorOptions) {
    state.attempts++
    if (state.fail) throw new Error('construction failed')
    state.instances.push(this)
  }
  on() {
    if (state.failBinding) throw new Error('binding failed')
  }
  release() {
    this.released = true
  }
  setRecords = vi.fn()
  updateOption = vi.fn<(options: GanttConstructorOptions) => void>()
}
vi.mock('@visactor/vtable-gantt', () => ({
  Gantt: class {
    constructor(_container: HTMLElement, options: GanttConstructorOptions) {
      return new MockGantt(options)
    }
  },
}))
vi.mock('@visactor/vtable', async importOriginal => {
  const { themes } = await importOriginal<typeof import('@visactor/vtable')>()
  return { themes, register: { editor: () => true } }
})
vi.mock('@visactor/vtable-editors', () => ({
  InputEditor: class {},
  DateInputEditor: class {},
}))
beforeEach(() => {
  state.fail = false
  state.failBinding = false
  state.attempts = 0
  state.instances = []
})

test('failed rebuild clears the released public reference and retry restores a fresh instance', async () => {
  const wrapper = mount(GanttView, { props: { showToolbar: false } })
  await vi.waitFor(() => expect(state.instances).toHaveLength(1))
  const old = state.instances[0]
  expect(wrapper.vm.ganttInstance).toBe(old)
  state.fail = true
  await wrapper.setProps({ theme: 'dark' })
  await flushPromises()
  expect(old.released).toBe(true)
  expect(wrapper.vm.ganttInstance).toBeUndefined()
  expect(wrapper.vm.error?.message).toBe('construction failed')
  expect(wrapper.vm.loading).toBe(false)
  expect(wrapper.emitted('error')).toHaveLength(1)
  expect(wrapper.text()).toContain('甘特图加载失败')
  state.fail = false
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(wrapper.vm.ganttInstance).toBe(state.instances[1])
  expect(wrapper.vm.error).toBeUndefined()
  expect(wrapper.emitted('ganttCreated')).toHaveLength(2)
})

test('binding failures release the candidate and exposed reload can recover', async () => {
  state.failBinding = true
  const wrapper = mount(GanttView, { props: { showToolbar: false } })
  await vi.waitFor(() => expect(state.instances).toHaveLength(1))
  expect(state.instances[0].released).toBe(true)
  expect(wrapper.vm.ganttInstance).toBeUndefined()
  expect(wrapper.vm.error?.message).toBe('binding failed')
  state.failBinding = false
  await wrapper.vm.reload()
  expect(wrapper.vm.ganttInstance).toBe(state.instances[1])
  wrapper.unmount()
  expect(state.instances[1].released).toBe(true)
})

test('unmount before scheduled initialization creates no engine or late error', async () => {
  const wrapper = mount(GanttView, { props: { showToolbar: false } })
  await flushPromises()
  wrapper.unmount()
  await new Promise(resolve => setTimeout(resolve, 120))
  expect(state.attempts).toBe(0)
  expect(wrapper.emitted('error')).toBeUndefined()
})

test('imperative option patches retain the complete timeline, data and prior patches', async () => {
  const tasks = [{ id: 1, title: 'Initial', start: '2026-10-20' }]
  const wrapper = mount(GanttView, {
    props: { data: tasks, showToolbar: false },
  })
  await vi.waitFor(() => expect(state.instances).toHaveLength(1))
  const [instance] = state.instances
  const { scales } = instance.options.timelineHeader
  wrapper.vm.updateOptions({ rowHeight: 56 })
  expect(instance.updateOption.mock.lastCall?.[0]).toMatchObject({
    rowHeight: 56,
    records: tasks,
    timelineHeader: { scales },
  })
  const nextTasks = [{ id: 2, title: 'Updated', start: '2026-10-21' }]
  wrapper.vm.updateData(nextTasks)
  wrapper.vm.updateOptions({ timelineHeader: { colWidth: 90 } })
  expect(instance.updateOption.mock.lastCall?.[0]).toMatchObject({
    rowHeight: 56,
    records: nextTasks,
    timelineHeader: { scales, colWidth: 90 },
  })
  expect(instance.setRecords).toHaveBeenCalledWith(
    nextTasks.map(task => ({ ...task, children: undefined }))
  )
  wrapper.unmount()
})

test('native fullscreen changes update the control and stop after unmount', async () => {
  const wrapper = mount(GanttView)
  await vi.waitFor(() => expect(state.instances).toHaveLength(1))
  const container = wrapper.get('.gantt-container').element
  const original = Object.getOwnPropertyDescriptor(
    document,
    'fullscreenElement'
  )
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    value: container,
  })
  try {
    document.dispatchEvent(new Event('fullscreenchange'))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('退出全屏')
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    })
    document.dispatchEvent(new Event('fullscreenchange'))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('全屏')
    expect(wrapper.text()).not.toContain('退出全屏')
    const removed = vi.spyOn(document, 'removeEventListener')
    wrapper.unmount()
    expect(removed).toHaveBeenCalledWith(
      'fullscreenchange',
      expect.any(Function)
    )
    expect(state.instances).toHaveLength(1)
  } finally {
    if (original) Object.defineProperty(document, 'fullscreenElement', original)
    else Reflect.deleteProperty(document, 'fullscreenElement')
    if (wrapper.exists()) wrapper.unmount()
  }
})

test('theme patches preserve real SDK theme header overrides across body and size updates', async () => {
  const wrapper = mount(GanttView, {
    props: {
      showToolbar: false,
      options: {
        taskListTable: {
          theme: { headerStyle: { bgColor: '#c12345', fontSize: 19 } },
        },
      },
    },
  })
  await vi.waitFor(() => expect(state.instances).toHaveLength(1))
  const [instance] = state.instances
  const original = instance.options.taskListTable!.theme!
  expect(Object.getPrototypeOf(original)).not.toBe(Object.prototype)
  expect(original.headerStyle).toMatchObject({
    bgColor: '#c12345',
    fontSize: 19,
  })
  wrapper.vm.updateOptions({
    taskListTable: { theme: { bodyStyle: { color: '#1234ab' } } },
  })
  wrapper.vm.updateOptions({ rowHeight: 58 })
  const [next] = instance.updateOption.mock.lastCall!
  const { theme } = next.taskListTable!
  expect(theme!.headerStyle).toMatchObject({
    bgColor: '#c12345',
    fontSize: 19,
  })
  expect(theme!.bodyStyle).toMatchObject({
    color: '#1234ab',
  })
  expect(next.rowHeight).toBe(58)
  expect(original.bodyStyle?.color).not.toBe('#1234ab')
  wrapper.unmount()
})
