import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import C_SplitPane from '../../src/components/C_SplitPane/index.vue'
import type { SplitPaneExpose } from '../../src/components/C_SplitPane/types'

const observers: Array<{
  callback: ResizeObserverCallback
  disconnect: ReturnType<typeof vi.fn>
}> = []
let width = 1006
let height = 606
beforeEach(() => {
  width = 1006
  height = 606
  observers.length = 0
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
      unobserve = vi.fn()
      constructor(callback: ResizeObserverCallback) {
        observers.push({ callback, disconnect: this.disconnect })
      }
    }
  )
})
afterEach(() => vi.unstubAllGlobals())
const resizeContainer = async () => {
  for (const item of observers) item.callback([], {} as ResizeObserver)
  await nextTick()
}
const dispatchPointer = (
  element: Element | Document,
  type: string,
  x: number,
  pointerId = 1
) => {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: x,
      pointerId,
      isPrimary: true,
      button: 0,
    })
  )
}

describe('C_SplitPane real container and public contracts', () => {
  test('uses remaining space, reactive pixel limits and proportional degradation for narrow containers', async () => {
    const wrapper = mount(C_SplitPane, {
      props: { defaultSize: 20, minFirstSize: 300, minSecondSize: 200 },
    })
    await nextTick()
    const separator = wrapper.get('[role=separator]')
    expect(Number(separator.attributes('aria-valuenow'))).toBe(30)
    await wrapper.setProps({ minFirstSize: 400, step: 5 })
    expect(Number(separator.attributes('aria-valuenow'))).toBe(40)
    width = 306
    await resizeContainer()
    expect(Number(separator.attributes('aria-valuenow'))).toBeCloseTo(66.666666)
    expect(
      (wrapper.get('.split-panel--first').element as HTMLElement).style.flexGrow
    ).toContain('66.666')
    expect(wrapper.emitted('update:size')?.at(-1)).toEqual([(400 / 600) * 100])
    expect(
      wrapper.get('.split-panel--first').attributes('style')
    ).not.toContain('calc(')
  })

  test('controlled size requires parent acknowledgement and external updates reflect in scoped slots', async () => {
    const wrapper = mount(C_SplitPane, {
      props: { size: 40, minSize: 10, maxSize: 90 },
      slots: {
        first: ({ size, collapsed }) => h('span', `${size}:${collapsed}`),
      },
    })
    await wrapper
      .get('[role=separator]')
      .trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:size')?.at(-1)).toEqual([42])
    expect(wrapper.text()).toContain('40:false')
    await wrapper.setProps({ size: 65 })
    expect(wrapper.text()).toContain('65:false')
    await wrapper.setProps({ size: 0 })
    expect(wrapper.text()).toContain('0:true')
    expect(wrapper.get('.split-panel--first').attributes('aria-hidden')).toBe(
      'true'
    )
    expect(wrapper.get('.split-panel--first').attributes('inert')).toBeDefined()
    expect(
      (wrapper.get('.split-panel--first').element as HTMLElement).style.flexGrow
    ).toBe('0')
    expect(
      (wrapper.get('.split-panel--first').element as HTMLElement).style
        .flexBasis
    ).toBe('0px')
    expect(wrapper.emitted('collapse')).toEqual([['first']])
    await wrapper.setProps({ size: 100, ariaLabel: '订单主表' })
    expect(wrapper.get('[role=separator]').attributes('aria-label')).toBe(
      '订单主表'
    )
    await wrapper.get('[role=separator]').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:size')?.at(-1)).toEqual([65])
  })

  test('an initially collapsed controlled or internal pane has a usable restore position', async () => {
    const controlled = mount(C_SplitPane, {
      props: { size: 0, defaultSize: 35 },
    })
    const controlledApi = controlled.vm as unknown as SplitPaneExpose
    controlledApi.expand()
    expect(controlled.emitted('update:size')?.at(-1)).toEqual([35])
    const internal = mount(C_SplitPane, { props: { defaultSize: 0 } })
    const internalApi = internal.vm as unknown as SplitPaneExpose
    internalApi.expand()
    await nextTick()
    expect(internalApi.getPanelInfo().first).toEqual({
      size: 50,
      collapsed: false,
    })
  })

  test('v-model keeps first and second collapses, restore, reset and default changes coherent', async () => {
    const size = ref(45)
    const parent = mount({
      setup: () => () =>
        h(C_SplitPane, {
          size: size.value,
          'onUpdate:size': value => {
            size.value = value
          },
          minSize: 20,
          maxSize: 80,
          defaultSize: 60,
        }),
    })
    const wrapper = parent.getComponent(C_SplitPane)
    const api = wrapper.vm as unknown as SplitPaneExpose
    api.collapse('first')
    await nextTick()
    expect(size.value).toBe(0)
    api.collapse('second')
    await nextTick()
    expect(api.getPanelInfo().second.collapsed).toBe(true)
    api.expand()
    await nextTick()
    expect(size.value).toBe(45)
    api.setSize(Number.NaN)
    expect(size.value).toBe(45)
    api.resetSize()
    await nextTick()
    expect(size.value).toBe(60)
  })

  test('keyboard follows direction, live step, Shift, bounds and button key ownership', async () => {
    const wrapper = mount(C_SplitPane, {
      props: { defaultSize: 50, minSize: 20, maxSize: 80 },
    })
    const separator = wrapper.get('[role=separator]')
    await separator.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('resize')).toBeUndefined()
    await wrapper.setProps({ direction: 'vertical', step: 3 })
    await separator.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(wrapper.emitted('resize')?.at(-1)).toEqual([80, 20])
    await separator.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('resize')?.at(-1)).toEqual([20, 80])
    await separator.trigger('keydown', { key: 'Enter' })
    expect(wrapper.get('.split-panel--first').attributes('aria-hidden')).toBe(
      'true'
    )
    await separator.trigger('keydown', { key: 'End' })
    expect(
      wrapper.get('.split-panel--first').attributes('aria-hidden')
    ).toBeUndefined()
    expect(wrapper.emitted('expand')?.at(-1)).toEqual(['first'])
    const before = wrapper.emitted('resize')?.length
    await wrapper.get('button').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('resize')?.length).toBe(before)
    await wrapper.setProps({ disabled: true })
    await separator.trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('resize')?.length).toBe(before)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(separator.attributes('tabindex')).toBe('-1')
  })

  test.each(['pointercancel', 'pointerup', 'blur', 'disable', 'unmount'])(
    'pointer gesture restores body styles and removes listeners on %s',
    async reason => {
      document.body.style.setProperty('cursor', 'crosshair', 'important')
      document.body.style.userSelect = 'text'
      const onUpdate = vi.fn()
      const wrapper = mount(C_SplitPane, {
        props: { defaultSize: 40, 'onUpdate:size': onUpdate },
      })
      const separator = wrapper.get('[role=separator]').element
      dispatchPointer(separator, 'pointerdown', 400)
      expect(document.body.style.cursor).toBe('col-resize')
      dispatchPointer(document, 'pointermove', 600, 2)
      expect(wrapper.emitted('resize')).toBeUndefined()
      dispatchPointer(document, 'pointermove', 600)
      expect(wrapper.emitted('update:size')?.at(-1)).toEqual([60])
      if (reason === 'blur') window.dispatchEvent(new Event('blur'))
      else if (reason === 'disable') await wrapper.setProps({ disabled: true })
      else if (reason === 'unmount') wrapper.unmount()
      else dispatchPointer(document, reason, 600)
      expect(document.body.style.cursor).toBe('crosshair')
      expect(document.body.style.getPropertyPriority('cursor')).toBe(
        'important'
      )
      expect(document.body.style.userSelect).toBe('text')
      expect(wrapper.emitted('drag-end')).toEqual([[60]])
      dispatchPointer(document, 'pointermove', 900)
      expect(onUpdate).toHaveBeenCalledTimes(1)
      expect(onUpdate).toHaveBeenLastCalledWith(60)
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
    }
  )

  test('nested splitters isolate gestures, retain child refs and disconnect observers', async () => {
    const wrapper = mount(C_SplitPane, {
      slots: {
        first: () =>
          h(
            C_SplitPane,
            { direction: 'vertical' },
            { second: () => h('span', 'nested detail') }
          ),
      },
    })
    const nested = wrapper.getComponent(C_SplitPane)
    const separators = wrapper.findAll('[role=separator]')
    expect(
      new Set(separators.map(item => item.attributes('aria-controls'))).size
    ).toBe(2)
    dispatchPointer(separators[1].element, 'pointerdown', 500)
    dispatchPointer(separators[0].element, 'pointerdown', 300)
    expect(wrapper.emitted('drag-end')).toHaveLength(1)
    expect(nested.emitted('drag-start')).toHaveLength(1)
    expect(wrapper.text()).toContain('nested detail')
    wrapper.unmount()
    expect(
      observers.every(item => item.disconnect.mock.calls.length === 1)
    ).toBe(true)
  })
})
