import { beforeEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { NConfigProvider, darkTheme } from 'naive-ui'
import { defineComponent, h, ref } from 'vue'
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
  scrollTop = 0
  scrollLeft = 0
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
  await wrapper.setProps({ preset: 'project' })
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

test('theme-only updates retain the engine, records and public scroll coordinates', async () => {
  const records = [{ id: 'task', title: 'Task', start: '2026-11-14' }]
  const wrapper = mount(GanttView, {
    props: { data: records, showToolbar: false },
  })
  await vi.waitFor(() => expect(state.instances).toHaveLength(1))
  const instance = state.instances[0]
  instance.scrollTop = 128
  instance.scrollLeft = 240
  instance.updateOption.mockImplementation(() => {
    instance.scrollTop = 0
    instance.scrollLeft = 0
  })
  await wrapper.setProps({ theme: 'dark' })
  await flushPromises()
  expect(state.instances).toHaveLength(1)
  expect(instance.released).toBe(false)
  expect(instance.updateOption).toHaveBeenCalledOnce()
  expect(instance.updateOption.mock.calls[0][0].records).toEqual(records)
  expect(instance.scrollTop).toBe(128)
  expect(instance.scrollLeft).toBe(240)
  expect(wrapper.emitted('ganttCreated')).toHaveLength(1)
})

test.each(['basic', 'project', 'timeline', 'official', 'milestone'] as const)(
  '%s Provider colors update the same Gantt while preset accents remain',
  async preset => {
    const dark = ref(false)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            NConfigProvider,
            {
              theme: dark.value ? darkTheme : null,
              themeOverrides: {
                common: {
                  cardColor: dark.value ? '#19242f' : '#fdfbfa',
                  actionColor: dark.value ? '#24313d' : '#f4f1ee',
                  borderColor: dark.value ? '#607080' : '#d1c8c1',
                  bodyColor: dark.value ? '#121a22' : '#f8f5f2',
                  textColor3: dark.value ? '#a1b2c3' : '#665544',
                  hoverColor: dark.value ? '#354657' : '#eee4d9',
                },
              },
            },
            {
              default: () => h(GanttView, { preset, showToolbar: false }),
            }
          ),
      })
    )
    await vi.waitFor(() => expect(state.instances).toHaveLength(1))
    const instance = state.instances[0]
    dark.value = true
    await flushPromises()
    expect(state.instances).toHaveLength(1)
    expect(instance.updateOption).toHaveBeenCalledOnce()
    const next = instance.updateOption.mock.calls[0][0]
    expect(next.grid).toMatchObject({
      backgroundColor: '#19242f',
      verticalLine: {
        lineColor:
          preset === 'milestone' ? 'rgba(255, 168, 64, 0.3)' : '#607080',
      },
    })
    const tableTheme = next.taskListTable!.theme!
    expect(tableTheme.headerStyle).toMatchObject({ bgColor: '#24313d' })
    expect(tableTheme.bodyStyle).toMatchObject({ bgColor: '#19242f' })
    expect(next.timelineHeader).toMatchObject({
      backgroundColor: '#24313d',
      horizontalLine: { lineColor: '#607080' },
      verticalLine: { lineColor: '#607080' },
    })
    expect(next.frame).toMatchObject({
      outerFrameStyle: {
        borderColor: preset === 'milestone' ? '#ffa940' : '#607080',
      },
      verticalSplitLine: { lineColor: '#607080' },
      horizontalSplitLine: { lineColor: '#607080' },
    })
    expect(next.scrollStyle).toMatchObject({
      scrollRailColor: '#354657',
      scrollSliderColor: '#a1b2c3',
    })
    expect(next.underlayBackgroundColor).toBe('#121a22')
    expect(next.taskBar).toEqual(instance.options.taskBar)
    if (preset === 'official') {
      expect(tableTheme.headerStyle).toMatchObject({ color: 'red' })
      expect(tableTheme.bodyStyle).toMatchObject({ color: '#4D4D4D' })
      expect(next.timelineHeader.scales[0].style).toMatchObject({
        color: 'white',
      })
      expect(next.taskBar).toMatchObject({ barStyle: { borderColor: 'black' } })
    }
    expect(instance.released).toBe(false)
    wrapper.unmount()
  }
)

test('Canvas task table follows Provider colors while explicit SDK styles and shared themes stay intact', async () => {
  const { themes } = await import('@visactor/vtable')
  const shared = [themes.DEFAULT, themes.DARK].map(theme => ({
    headerBg: theme.headerStyle?.bgColor,
    bodyBg: theme.bodyStyle?.bgColor,
    border: theme.defaultStyle.borderColor,
    selection: theme.selectionStyle.cellBorderColor,
  }))
  const common = ref({
    cardColor: '#fdfbfa',
    actionColor: '#f1edea',
    hoverColor: '#eae1d7',
    popoverColor: '#fffefd',
    textColor1: '#292018',
    textColor2: '#67574a',
    textColor3: '#88796c',
    borderColor: '#cfc0b1',
    primaryColor: '#96601d',
  })
  const options = {
    underlayBackgroundColor: '#091827',
    grid: {
      backgroundColor: '#fff1e2',
      verticalLine: { lineColor: '#884422', lineWidth: 3 },
      horizontalLine: () => ({ lineColor: '#557744' }),
    },
    timelineHeader: {
      backgroundColor: '#e3f4f5',
      horizontalLine: { lineColor: '#258369' },
      verticalLine: { lineColor: '#873e67' },
      scales: [{ unit: 'day' as const, step: 1, style: { color: '#603399' } }],
    },
    frame: {
      outerFrameStyle: { borderColor: '#123abc', borderLineWidth: 4 },
      verticalSplitLine: { lineColor: '#567abc' },
      horizontalSplitLine: { lineColor: '#abc123' },
    },
    scrollStyle: { scrollRailColor: '#231645', scrollSliderColor: '#c0ffee' },
    taskListTable: {
      theme: {
        headerStyle: { bgColor: '#c12345', fontSize: 19 },
        bodyStyle: { color: '#1234ab' },
      },
    },
  }
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(
          NConfigProvider,
          { themeOverrides: { common: common.value } },
          {
            default: () =>
              h(GanttView, {
                showToolbar: false,
                options,
              }),
          }
        ),
    })
  )
  await vi.waitFor(() => expect(state.instances).toHaveLength(1))
  const instance = state.instances[0]
  const original = instance.options.taskListTable!.theme!
  expect(original.headerStyle).toMatchObject({
    bgColor: '#c12345',
    color: '#67574a',
    borderColor: '#cfc0b1',
    fontSize: 19,
  })
  expect(original.bodyStyle).toMatchObject({
    bgColor: '#fdfbfa',
    color: '#1234ab',
    borderColor: '#cfc0b1',
    hover: { cellBgColor: '#eae1d7' },
  })
  instance.scrollTop = 80
  instance.scrollLeft = 120
  common.value = {
    cardColor: '#202a34',
    actionColor: '#26323d',
    hoverColor: '#344859',
    popoverColor: '#2d3b47',
    textColor1: '#f2f5f8',
    textColor2: '#c1ceda',
    textColor3: '#95aabd',
    borderColor: '#4f6578',
    primaryColor: '#a8d8ff',
  }
  await flushPromises()
  expect(state.instances).toHaveLength(1)
  expect(instance.updateOption).toHaveBeenCalledOnce()
  const [updated] = instance.updateOption.mock.lastCall!
  const next = updated.taskListTable!.theme!
  expect(next).not.toBe(original)
  expect(next.headerStyle).toMatchObject({
    bgColor: '#c12345',
    color: '#c1ceda',
    borderColor: '#4f6578',
    fontSize: 19,
  })
  expect(next.bodyStyle).toMatchObject({
    bgColor: '#202a34',
    color: '#1234ab',
    borderColor: '#4f6578',
    hover: { cellBgColor: '#344859' },
  })
  expect(next.rowHeaderStyle?.bgColor).toBe('#c12345')
  expect(next.defaultStyle?.color).toBe('#f2f5f8')
  expect(next.frameStyle?.borderColor).toBe('#4f6578')
  expect(next.selectionStyle?.cellBorderColor).toBe('#a8d8ff')
  expect(next.columnResize?.lineColor).toBe('#a8d8ff')
  expect(next.scrollStyle?.scrollSliderColor).toBe('#95aabd')
  expect(next.tooltipStyle).toMatchObject({
    bgColor: '#2d3b47',
    color: '#f2f5f8',
  })
  expect(updated.underlayBackgroundColor).toBe(options.underlayBackgroundColor)
  expect(updated.grid).toMatchObject(options.grid)
  expect(updated.timelineHeader).toMatchObject(options.timelineHeader)
  expect(updated.frame).toMatchObject(options.frame)
  expect(updated.scrollStyle).toMatchObject(options.scrollStyle)
  expect(updated.taskBar?.barStyle).toEqual(instance.options.taskBar?.barStyle)
  expect(instance.scrollTop).toBe(80)
  expect(instance.scrollLeft).toBe(120)
  expect(instance.released).toBe(false)
  expect(
    [themes.DEFAULT, themes.DARK].map(theme => ({
      headerBg: theme.headerStyle?.bgColor,
      bodyBg: theme.bodyStyle?.bgColor,
      border: theme.defaultStyle.borderColor,
      selection: theme.selectionStyle.cellBorderColor,
    }))
  ).toEqual(shared)
  wrapper.unmount()
})
