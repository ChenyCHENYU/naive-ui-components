import { afterEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { NProgress } from 'naive-ui'
import Progress from '../../src/components/C_Progress/index.vue'
import Timeline from '../../src/components/C_Timeline/index.vue'
import type { TimelineItem } from '../../src/components/C_Timeline/types'
import * as html from '../../src/utils/html'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('animated fractional progress settles exactly and later input can cancel the animation', async () => {
  let frame: FrameRequestCallback | undefined
  const cancelled = vi.fn()
  vi.spyOn(performance, 'now').mockReturnValue(0)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', cancelled)
  const wrapper = mount(Progress, {
    props: { percentage: 12.5, isAnimation: true, time: 100 },
  })
  try {
    frame!(50)
    await nextTick()
    expect(wrapper.getComponent(NProgress).props('percentage')).toBe(6)
    frame!(100)
    await nextTick()
    expect(wrapper.getComponent(NProgress).props('percentage')).toBe(12.5)

    await wrapper.setProps({ percentage: 70.25 })
    await wrapper.setProps({ percentage: 40.75, isAnimation: false })
    expect(cancelled).toHaveBeenCalledOnce()
    expect(wrapper.getComponent(NProgress).props('percentage')).toBe(40.75)
  } finally {
    wrapper.unmount()
  }
})

test('progress retains multiple-circle precision and immediate-duration behavior', async () => {
  const wrapper = mount(Progress, {
    props: {
      percentage: [12.5, 80.25],
      type: 'multiple-circle',
      isAnimation: true,
    },
  })
  try {
    expect(wrapper.getComponent(NProgress).props('percentage')).toEqual([
      12.5, 80.25,
    ])
    await wrapper.setProps({ type: 'line', percentage: 24.125, time: 0 })
    expect(wrapper.getComponent(NProgress).props('percentage')).toBe(24.125)
  } finally {
    wrapper.unmount()
  }
})

test('timeline reuses unchanged sanitized content and invalidates an edited body only', async () => {
  // 此处验证组件渲染净化结果及其失效时机；DOMPurify 策略由真实浏览器回归覆盖。
  const sanitize = vi
    .spyOn(html, 'sanitizeRichHtml')
    .mockImplementation(source =>
      source.includes('Updated')
        ? '<strong>Clean updated</strong>'
        : '<b>Clean body</b>'
    )
  const items = reactive<TimelineItem[]>(
    Array.from({ length: 24 }, (_, id) => ({
      id,
      title: `Event ${id}`,
      content: '<b>Unchanged body</b><img src="x" onerror="alert(1)">',
    }))
  )
  const wrapper = mount(Timeline, { props: { items } })
  try {
    expect(sanitize).toHaveBeenCalledTimes(24)
    expect(wrapper.html()).not.toContain('onerror')
    sanitize.mockClear()
    await wrapper.setProps({ pending: true, reverse: true })
    expect(sanitize).not.toHaveBeenCalled()

    items[0].content = '<strong>Updated</strong><script>alert(1)</script>'
    await nextTick()
    expect(sanitize).toHaveBeenCalledOnce()
    expect(wrapper.findAll('.c-timeline__content').at(-1)!.html()).toContain(
      '<strong>Clean updated</strong>'
    )
    expect(wrapper.html()).not.toContain('<script>')
  } finally {
    wrapper.unmount()
  }
})

test('timeline keeps collapsed content lazy and never reuses removed node content by id', async () => {
  const sanitize = vi.spyOn(html, 'sanitizeRichHtml')
  const wrapper = mount(Timeline, {
    props: {
      items: [
        { id: 1, title: 'Old', content: '<b>Old body</b>', collapsible: true },
      ],
    },
  })
  try {
    expect(sanitize).not.toHaveBeenCalled()
    const trigger = wrapper.get('.c-timeline__collapse-trigger')
    await trigger.trigger('click')
    expect(sanitize).toHaveBeenCalledOnce()
    await trigger.trigger('click')
    await trigger.trigger('click')
    expect(sanitize).toHaveBeenCalledOnce()
    await wrapper.setProps({ items: [] })
    await wrapper.setProps({
      items: [{ id: 1, title: 'New', content: '<b>New body</b>' }],
    })
    expect(sanitize).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.c-timeline__content').text()).toBe('New body')
  } finally {
    wrapper.unmount()
  }
})

test('timeline semantic tag types follow theme tokens while unknown legacy values use the default', async () => {
  const wrapper = mount(Timeline, {
    props: {
      items: [
        { id: 1, title: 'Event', tags: [{ text: 'Check', type: 'success' }] },
      ],
    },
  })
  try {
    const tag = () => wrapper.get<HTMLElement>('.c-timeline__tag').element
    expect(tag().style.getPropertyValue('--tl-tag-color')).toContain(
      '--c-success'
    )
    await wrapper.setProps({
      items: [
        { id: 1, title: 'Event', tags: [{ text: 'Check', type: 'error' }] },
      ],
    })
    expect(tag().style.getPropertyValue('--tl-tag-color')).toContain(
      '--c-error'
    )
    await wrapper.setProps({
      items: [
        {
          id: 1,
          title: 'Event',
          tags: [{ text: 'Check', type: 'business-status' }],
        },
      ],
    })
    expect(tag().style.getPropertyValue('--tl-tag-color')).toBe('')
    expect(tag().textContent).toBe('Check')
  } finally {
    wrapper.unmount()
  }
})
