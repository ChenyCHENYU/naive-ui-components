import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import WaterFall from '../../src/components/C_WaterFall/index.vue'
import type { WaterFallItem } from '../../src/components/C_WaterFall/types'

const frames = new Map<number, FrameRequestCallback>()
const observers: Observer[] = []
let serial = 0
let width = 400
let rootHeight = 400
let scroll = 0
let windowScroll = 0
let rootTop = 100
let nested = true
const itemHeights = new Map<number, number>()
let host: HTMLElement

class Observer {
  targets = new Set<Element>()
  constructor(readonly callback: ResizeObserverCallback) {
    observers.push(this)
  }
  observe(element: Element) {
    this.targets.add(element)
  }
  unobserve(element: Element) {
    this.targets.delete(element)
  }
  disconnect() {
    this.targets.clear()
  }
}

function items(count: number, offset = 0): WaterFallItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + offset,
    src: `/photo-${index + offset}.png`,
    width: 100,
    height: 100,
  }))
}
function rect(top: number, height: number) {
  return {
    x: 0,
    y: top,
    top,
    bottom: top + height,
    left: 0,
    right: width,
    width,
    height,
    toJSON() {},
  }
}
async function flushFrames() {
  await nextTick()
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach(callback => callback(0))
  await nextTick()
}
function resize(element: Element) {
  observers.forEach(observer => {
    if (observer.targets.has(element))
      observer.callback(
        [{ target: element } as ResizeObserverEntry],
        observer as unknown as ResizeObserver
      )
  })
}

beforeEach(() => {
  frames.clear()
  observers.length = 0
  itemHeights.clear()
  width = 400
  rootHeight = 400
  scroll = 0
  windowScroll = 0
  rootTop = 100
  nested = true
  vi.stubGlobal('ResizeObserver', Observer)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = ++serial
    frames.set(id, callback)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      if (this === host) return rect(rootTop - windowScroll, rootHeight)
      const origin = rootTop - windowScroll - (nested ? scroll : 0)
      if (this.classList.contains('waterfall__item')) {
        const index = Number(this.dataset.waterfallIndex)
        return rect(
          origin + Number.parseFloat(this.style.top),
          itemHeights.get(index) ??
            Number.parseFloat(this.querySelector('img')?.style.height ?? '100')
        )
      }
      return rect(origin, Number.parseFloat(this.style.height) || 1000)
    }
  )
  host = document.createElement('div')
  host.style.overflowY = 'auto'
  Object.defineProperties(host, {
    clientHeight: { get: () => rootHeight },
    scrollHeight: { get: () => 250_000 },
    scrollTop: { get: () => scroll },
  })
  host.scrollTo = vi.fn()
  document.body.append(host)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => {
  host.remove()
  vi.unstubAllGlobals()
})

test('10,000 items keep bounded DOM in a nested scroller and emit original indices', async () => {
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: items(10_000), columns: 4, gap: 0 },
    slots: {
      item: ({ item, index }: { item: WaterFallItem; index: number }) =>
        h('span', `${index}:${item.id}`),
    },
  })
  await flushFrames()
  expect(wrapper.findAll('.waterfall__item').length).toBeLessThan(40)
  scroll = 20_000
  host.dispatchEvent(new Event('scroll'))
  await flushFrames()
  const visible = wrapper.findAll('.waterfall__item')
  expect(visible.length).toBeLessThan(50)
  const original = Number(visible[0].attributes('data-waterfall-index'))
  expect(original).toBeGreaterThan(700)
  expect(visible[0].text()).toBe(`${original}:${original}`)
  await visible[0].trigger('click')
  expect(wrapper.emitted('item-click')?.at(-1)).toEqual([
    expect.objectContaining({ id: original }),
    original,
  ])
  const before = visible[0].attributes('data-waterfall-index')
  windowScroll = 350
  window.dispatchEvent(new Event('scroll'))
  await flushFrames()
  expect(
    wrapper.find('.waterfall__item').attributes('data-waterfall-index')
  ).not.toBe(before)
  wrapper.vm.scrollToTop()
  expect(host.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  expect(window.scrollTo).not.toHaveBeenCalled()
})

test('window scrolling and viewport resize update the range without an ancestor', async () => {
  nested = false
  host.style.overflowY = 'visible'
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: items(1000), columns: 4, gap: 0 },
  })
  await flushFrames()
  windowScroll = 5000
  window.dispatchEvent(new Event('scroll'))
  await flushFrames()
  expect(
    Number(wrapper.find('.waterfall__item').attributes('data-waterfall-index'))
  ).toBeGreaterThan(100)
  width = 200
  window.dispatchEvent(new Event('resize'))
  await flushFrames()
  expect(wrapper.find('.waterfall__item').attributes('style')).toContain(
    'width: 50px'
  )
  wrapper.vm.scrollToTop()
  expect(window.scrollTo).toHaveBeenCalledWith({
    top: window.scrollY + rootTop - windowScroll,
    behavior: 'smooth',
  })
})

test('outer scroll and clipping resize intersect nested viewports and skip non-scrollable clips', async () => {
  const outer = document.createElement('section')
  outer.style.overflowY = 'auto'
  let outerHeight = 240
  Object.defineProperties(outer, {
    clientHeight: { get: () => outerHeight },
    scrollHeight: { value: 250_000 },
  })
  outer.getBoundingClientRect = () => rect(0, outerHeight) as DOMRect
  outer.scrollTo = vi.fn()
  document.body.append(outer)
  outer.append(host)
  rootTop = 200
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: items(1000), columns: 4, gap: 0 },
  })
  await flushFrames()
  const initial = wrapper.findAll('.waterfall__item').length
  outerHeight = 600
  resize(outer)
  await flushFrames()
  expect(wrapper.findAll('.waterfall__item').length).toBeGreaterThan(initial)
  rootTop = -1000
  outer.dispatchEvent(new Event('scroll'))
  await flushFrames()
  expect(
    Number(wrapper.find('.waterfall__item').attributes('data-waterfall-index'))
  ).toBeGreaterThan(20)
  expect(wrapper.findAll('.waterfall__item').length).toBeLessThan(40)
  host.style.overflowY = 'clip'
  wrapper.vm.scrollToTop()
  expect(host.scrollTo).not.toHaveBeenCalled()
  expect(outer.scrollTo).toHaveBeenCalledWith({
    top: -1000,
    behavior: 'smooth',
  })
  wrapper.unmount()
  outer.remove()
})

test('scrollToTop skips a full-height overflow:auto shell for its scrolling parent', async () => {
  const outer = document.createElement('section')
  outer.style.overflowY = 'auto'
  Object.defineProperties(outer, {
    clientHeight: { value: 400 },
    scrollHeight: { value: 250_000 },
    scrollTop: { value: 10_000 },
  })
  outer.getBoundingClientRect = () => rect(rootTop, 400) as DOMRect
  outer.scrollTo = vi.fn()
  document.body.append(outer)
  outer.append(host)
  rootHeight = 250_000
  scroll = 10_000
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: items(10_000), columns: 4, gap: 0 },
  })
  await flushFrames()
  wrapper.vm.scrollToTop()
  expect(host.scrollTo).not.toHaveBeenCalled()
  expect(outer.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  expect(window.scrollTo).not.toHaveBeenCalled()
  wrapper.unmount()
  outer.remove()
})

test('card measurements, source replacement and 99/100 threshold preserve valid layout', async () => {
  width = 100
  const data = items(99)
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: data, columns: 1, gap: 0 },
  })
  await flushFrames()
  expect(wrapper.findAll('.waterfall__item')).toHaveLength(99)
  const first = wrapper.find('.waterfall__item').element
  itemHeights.set(0, 500)
  resize(first)
  await flushFrames()
  expect(
    wrapper.find('[data-waterfall-index="1"]').attributes('style')
  ).toContain('top: 500px')
  await wrapper.setProps({ items: items(100) })
  await flushFrames()
  expect(wrapper.findAll('.waterfall__item').length).toBeLessThan(10)
  expect(
    wrapper.find('[data-waterfall-index="1"]').attributes('style')
  ).toContain('top: 500px')
  scroll = 350
  host.dispatchEvent(new Event('scroll'))
  await flushFrames()
  expect(wrapper.find('[data-waterfall-index="0"]').exists()).toBe(true)
  width = 200
  resize(wrapper.element)
  await flushFrames()
  expect(wrapper.vm.getContainerHeight()).toBe(20_000)
  await wrapper.setProps({ virtualScroll: false })
  await flushFrames()
  expect(wrapper.findAll('.waterfall__item')).toHaveLength(100)
  await wrapper.setProps({ items: items(99, 1000) })
  await flushFrames()
  expect(wrapper.vm.getContainerHeight()).toBe(19_800)
  await wrapper.setProps({ items: [] })
  await flushFrames()
  expect(wrapper.vm.getContainerHeight()).toBe(0)
  expect(
    observers
      .flatMap(observer => [...observer.targets])
      .filter(element => element.classList.contains('waterfall__item'))
  ).toHaveLength(0)
})

test('focused cards stay mounted and keyboard navigation crosses virtual boundaries', async () => {
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: items(1000), columns: 4, gap: 0 },
  })
  await flushFrames()
  const first = wrapper.find('[data-waterfall-index="0"]')
    .element as HTMLElement
  first.focus()
  scroll = 10_000
  host.dispatchEvent(new Event('scroll'))
  await flushFrames()
  expect(document.activeElement).toBe(first)
  expect(wrapper.find('[data-waterfall-index="0"]').exists()).toBe(true)
  first.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'End',
      bubbles: true,
      cancelable: true,
    })
  )
  await nextTick()
  expect((document.activeElement as HTMLElement).dataset.waterfallIndex).toBe(
    '999'
  )
  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
  )
  await nextTick()
  expect((document.activeElement as HTMLElement).dataset.waterfallIndex).toBe(
    '998'
  )
  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )
  expect(wrapper.emitted('item-click')?.at(-1)?.[1]).toBe(998)
  const outside = document.createElement('button')
  document.body.append(outside)
  outside.focus()
  await nextTick()
  expect(wrapper.find('[data-waterfall-index="998"]').exists()).toBe(false)
})

test('custom card controls retain native Tab order and transfer focus at virtual boundaries', async () => {
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: items(1000), columns: 4, gap: 0 },
    slots: {
      item: () => [h('button', 'Edit'), h('input', { 'aria-label': 'Name' })],
    },
  })
  await flushFrames()
  const first = wrapper.find('[data-waterfall-index="0"]')
    .element as HTMLElement
  first.focus()
  const nativeTab = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  })
  first.dispatchEvent(nativeTab)
  expect(nativeTab.defaultPrevented).toBe(false)
  const input = first.querySelector('input')!
  input.focus()
  const nextTab = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  })
  input.dispatchEvent(nextTab)
  await nextTick()
  expect(nextTab.defaultPrevented).toBe(true)
  expect((document.activeElement as HTMLElement).dataset.waterfallIndex).toBe(
    '1'
  )
  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
  )
  await nextTick()
  expect(document.activeElement).toBe(input)
  input.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )
  expect(wrapper.emitted('item-click')).toBeUndefined()
})

test.each([
  ['display-none self', () => h('button', { style: 'display:none' }, 'Hidden')],
  [
    'display-none ancestor',
    () => h('div', { style: 'display:none' }, h('button', 'Hidden')),
  ],
  [
    'visibility-hidden self',
    () => h('button', { style: 'visibility:hidden' }, 'Hidden'),
  ],
  [
    'visibility-hidden ancestor',
    () => h('div', { style: 'visibility:hidden' }, h('button', 'Hidden')),
  ],
  ['hidden ancestor', () => h('div', { hidden: true }, h('button', 'Hidden'))],
  ['inert ancestor', () => h('div', { inert: true }, h('button', 'Hidden'))],
])('Tab skips %s controls in both directions', async (_, hiddenControl) => {
  const wrapper = mount(WaterFall, {
    attachTo: host,
    props: { items: items(1000), columns: 4, gap: 0 },
    slots: {
      item: () => [
        h('button', { class: 'visible-control' }, 'Edit'),
        hiddenControl(),
      ],
    },
  })
  await flushFrames()
  const control = wrapper.find('[data-waterfall-index="0"] .visible-control')
    .element as HTMLElement
  control.focus()
  const next = new KeyboardEvent('keydown', {
    key: 'Tab',
    bubbles: true,
    cancelable: true,
  })
  control.dispatchEvent(next)
  await nextTick()
  expect(next.defaultPrevented).toBe(true)
  expect((document.activeElement as HTMLElement).dataset.waterfallIndex).toBe(
    '1'
  )
  document.activeElement!.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
  )
  await nextTick()
  expect(document.activeElement).toBe(control)
})

test('KeepAlive releases observers and frames, then restores the current viewport', async () => {
  const show = ref(true)
  const Other = defineComponent({ render: () => h('p', 'Other') })
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () =>
            show.value
              ? h(WaterFall, { items: items(1000), columns: 4, gap: 0 })
              : h(Other),
        }),
    }),
    { attachTo: host }
  )
  await flushFrames()
  host.dispatchEvent(new Event('scroll'))
  expect(frames.size).toBeGreaterThan(0)
  show.value = false
  await nextTick()
  expect(frames.size).toBe(0)
  expect(observers.every(observer => observer.targets.size === 0)).toBe(true)
  scroll = 15_000
  host.dispatchEvent(new Event('scroll'))
  window.dispatchEvent(new Event('resize'))
  expect(frames.size).toBe(0)
  show.value = true
  await flushFrames()
  expect(
    Number(wrapper.find('.waterfall__item').attributes('data-waterfall-index'))
  ).toBeGreaterThan(500)
  expect(observers.some(observer => observer.targets.size > 0)).toBe(true)
  wrapper.unmount()
  host.dispatchEvent(new Event('scroll'))
  expect(frames.size).toBe(0)
  expect(observers.every(observer => observer.targets.size === 0)).toBe(true)
})

test('KeepAlive disconnects infinite loading and ignores stale observer callbacks', async () => {
  const intersections: {
    callback: IntersectionObserverCallback
    targets: Set<Element>
  }[] = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      targets = new Set<Element>()
      constructor(readonly callback: IntersectionObserverCallback) {
        intersections.push(this)
      }
      observe(element: Element) {
        this.targets.add(element)
      }
      disconnect() {
        this.targets.clear()
      }
    }
  )
  const show = ref(true)
  const loadMore = vi.fn()
  const Other = defineComponent({ render: () => h('p', 'Other') })
  const wrapper = mount(
    defineComponent({
      setup: () => () =>
        h(KeepAlive, null, {
          default: () =>
            show.value
              ? h(WaterFall, {
                  items: items(1000),
                  infinite: true,
                  onLoadMore: loadMore,
                })
              : h(Other),
        }),
    }),
    { attachTo: host }
  )
  await flushFrames()
  const observer = intersections[intersections.length - 1]
  const sentinel = [...observer.targets][0]
  const notify = () =>
    observer.callback(
      [{ target: sentinel, isIntersecting: true } as IntersectionObserverEntry],
      observer as unknown as IntersectionObserver
    )
  notify()
  expect(loadMore).toHaveBeenCalledTimes(1)
  show.value = false
  await nextTick()
  expect(intersections.every(item => item.targets.size === 0)).toBe(true)
  notify()
  expect(loadMore).toHaveBeenCalledTimes(1)
  show.value = true
  await flushFrames()
  expect(intersections.some(item => item.targets.has(sentinel))).toBe(true)
  wrapper.unmount()
  expect(intersections.every(item => item.targets.size === 0)).toBe(true)
})
