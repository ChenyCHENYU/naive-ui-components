import { beforeEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import GanttView from '../../src/components/C_VtableGantt/index.vue'

const state = vi.hoisted(() => ({
  fail: false,
  failBinding: false,
  attempts: 0,
  instances: [] as MockGantt[],
}))
class MockGantt {
  released = false
  constructor() {
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
  updateOption = vi.fn()
}
vi.mock('@visactor/vtable-gantt', () => ({
  Gantt: class {
    constructor() {
      return new MockGantt()
    }
  },
}))
vi.mock('@visactor/vtable', () => ({
  themes: { DARK: { extends: () => ({}) }, DEFAULT: { extends: () => ({}) } },
  register: { editor: () => true },
}))
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
