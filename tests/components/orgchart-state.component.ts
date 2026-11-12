import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { NConfigProvider, darkTheme } from 'naive-ui'
import GenericOrgChart from '../../src/components/C_OrgChart/index.vue'
import type {
  OrgChartExpose,
  OrgChartKey,
  OrgChartNode,
} from '../../src/components/C_OrgChart/types'

const OrgChart = GenericOrgChart<OrgChartNode>

afterEach(() => vi.unstubAllGlobals())

function measuredLayout() {
  const frames = new Map<number, FrameRequestCallback>()
  let frame = 0
  const cancel = vi.fn((id: number) => frames.delete(id))
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frame, callback)
    return frame
  })
  vi.stubGlobal('cancelAnimationFrame', cancel)
  const observations: Array<{
    notify: (target: Element) => void
    disconnect: ReturnType<typeof vi.fn>
  }> = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
      unobserve = vi.fn()
      constructor(callback: ResizeObserverCallback) {
        observations.push({
          notify: target => callback([{ target } as ResizeObserverEntry], this),
          disconnect: this.disconnect,
        })
      }
    }
  )
  const measure = vi
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      const viewport = this.closest(
        '.c-orgchart__viewport'
      ) as HTMLElement | null
      const scale = Number(
        viewport?.style.transform.match(/scale\(([^)]+)\)/)?.[1] ?? 1
      )
      if (this.classList.contains('c-orgchart'))
        return new DOMRect(0, 0, 800, 600)
      if (this.classList.contains('c-orgchart__content'))
        return new DOMRect(50, 40, 600 * scale, 400 * scale)
      const name = this.querySelector('.c-orgchart__label')?.textContent
      if (this.classList.contains('c-orgchart__node')) {
        const boxes: Record<string, number[]> = {
          Root: [200, 0, 120, 60],
          Team: [100, 110, 160, 70],
          Member: [30, 250, 100, 50],
        }
        const [x, y, width, height] = boxes[name ?? ''] ?? [0, 0, 120, 60]
        return new DOMRect(
          50 + x * scale,
          40 + y * scale,
          width * scale,
          height * scale
        )
      }
      return new DOMRect()
    })
  return {
    measure,
    cancel,
    observations,
    flush: async () => {
      await nextTick()
      const pending = [...frames.values()]
      frames.clear()
      for (const callback of pending) callback(0)
      await nextTick()
    },
  }
}

const data = (): OrgChartNode => ({
  id: 0,
  label: 'Root',
  children: [
    {
      id: 1,
      label: 'Team',
      children: [{ id: 2, label: 'Member' }],
    },
  ],
})

test('legacy clicks stay unselected; node collapsed changes stay reactive without mutating input', async () => {
  const original = data()
  original.children![0].collapsed = true
  const wrapper = mount(OrgChart, { props: { data: original } })
  expect(wrapper.findAll('.c-orgchart__node')).toHaveLength(2)
  await wrapper.get('.c-orgchart__node-select').trigger('click')
  expect(wrapper.emitted('node-click')?.[0]).toEqual([original])
  expect(wrapper.find('.c-orgchart__node--selected').exists()).toBe(false)
  await wrapper.get('[aria-label="展开 Team"]').trigger('click')
  expect(wrapper.findAll('.c-orgchart__node')).toHaveLength(3)
  expect(original.children![0].collapsed).toBe(true)
  await wrapper.setProps({
    data: {
      ...original,
      children: [{ ...original.children![0], collapsed: false }],
    },
  })
  await wrapper.get('[aria-label="折叠 Team"]').trigger('click')
  expect(wrapper.findAll('.c-orgchart__node')).toHaveLength(2)
})

test('custom fields, zero keys and event payloads preserve the original business node', async () => {
  const child = Object.freeze({
    code: 1,
    title: 'Platform',
    leader: 'Lee',
    photo: '/lee.png',
    units: [],
  })
  const original = Object.freeze({
    code: 0,
    title: 'Engineering',
    leader: 'Chen',
    photo: '/chen.png',
    units: Object.freeze([child]),
  })
  const wrapper = mount(GenericOrgChart<typeof original>, {
    props: {
      data: original,
      keyField: 'code',
      labelField: 'title',
      childrenField: 'units',
      subtitleField: 'leader',
      avatarField: 'photo',
      defaultSelectedKey: 0,
    },
  })
  expect(
    wrapper.get('.c-orgchart__node--selected .c-orgchart__label').text()
  ).toBe('Engineering')
  expect(wrapper.findAll('img').map(image => image.attributes('src'))).toEqual([
    '/chen.png',
    '/lee.png',
  ])
  expect(wrapper.text()).toContain('Lee')
  await wrapper.findAll('.c-orgchart__node-select')[1].trigger('click')
  expect(wrapper.emitted('node-click')?.[0][0]).toBe(child)
  expect(wrapper.emitted('update:selectedKey')?.[0]).toEqual([1, child])
  expect(wrapper.vm.getNode(0)).toBe(original)
  expect(wrapper.vm.getNode('0')).toBeNull()
})

test('controlled state only emits proposals until the parent accepts them', async () => {
  measuredLayout()
  const original = data()
  const wrapper = mount(OrgChart, {
    props: { data: original, selectedKey: 0, expandedKeys: [] },
  })
  await wrapper.get('[aria-label="展开 Root"]').trigger('click')
  expect(wrapper.findAll('.c-orgchart__node')).toHaveLength(1)
  expect(wrapper.emitted('update:expandedKeys')?.[0]).toEqual([[0], original])
  expect(await wrapper.vm.locate(2)).toBe(false)
  expect(wrapper.emitted('update:expandedKeys')?.at(-1)?.[0]).toEqual([0, 1])
  expect(wrapper.emitted('update:selectedKey')?.at(-1)?.[0]).toBe(2)
  expect(
    wrapper.get('.c-orgchart__node--selected .c-orgchart__label').text()
  ).toBe('Root')
  await wrapper.setProps({ expandedKeys: [0, 1], selectedKey: 2 })
  expect(await wrapper.vm.locate(2)).toBe(true)
  expect(
    wrapper.get('.c-orgchart__node--selected .c-orgchart__label').text()
  ).toBe('Member')
})

test('locate accepts synchronous v-model updates and manual focus survives later resize auto-fit', async () => {
  const layout = measuredLayout()
  const expanded = ref<OrgChartKey[]>([])
  const selected = ref<OrgChartKey | null>(null)
  const original = data()
  const chartRef = ref<OrgChartExpose>()
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(OrgChart, {
          ref: chartRef,
          data: original,
          expandedKeys: expanded.value,
          selectedKey: selected.value,
          fitOnInit: true,
          'onUpdate:expandedKeys': (keys: OrgChartKey[]) => {
            expanded.value = keys
          },
          'onUpdate:selectedKey': (key: OrgChartKey | null) => {
            selected.value = key
          },
        })
    )
  )
  const chart = wrapper.findComponent(OrgChart)
  Object.defineProperties(chart.element, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  })
  await flushPromises()
  expect(await chartRef.value?.locate(2)).toBe(true)
  expect(expanded.value).toEqual([0, 1])
  expect(selected.value).toBe(2)
  const focused = chart.get('.c-orgchart__viewport').attributes('style')
  layout.observations[0].notify(chart.element)
  await layout.flush()
  expect(chart.get('.c-orgchart__viewport').attributes('style')).toBe(focused)
})

test('slot actions select once with native buttons; nested independent controls remain independent', async () => {
  const wrapper = mount(OrgChart, {
    props: { data: data(), defaultSelectedKey: null },
    slots: {
      node: ({ node, key, isSelected, select }) => [
        h(
          'button',
          { 'data-select': key, 'aria-pressed': isSelected, onClick: select },
          node.label
        ),
        h('button', { 'data-detail': key }, 'Details'),
      ],
    },
  })
  await wrapper.get('[data-detail="1"]').trigger('click')
  expect(wrapper.emitted('node-click')).toBeUndefined()
  await wrapper.get('[data-select="1"]').trigger('click')
  expect(wrapper.emitted('node-click')).toHaveLength(1)
  expect(wrapper.get('[data-select="1"]').attributes('aria-pressed')).toBe(
    'true'
  )
  const nativeSpace = new KeyboardEvent('keydown', {
    key: ' ',
    bubbles: true,
    cancelable: true,
  })
  wrapper.get('[data-select="1"]').element.dispatchEvent(nativeSpace)
  expect(nativeSpace.defaultPrevented).toBe(false)
  expect(wrapper.emitted('node-click')).toHaveLength(1)
})

test('measured connectors follow scale, card resize, direction and visibility', async () => {
  const layout = measuredLayout()
  const wrapper = mount(OrgChart, {
    props: { data: data(), lineStyle: 'straight' },
  })
  await layout.flush()
  expect(wrapper.findAll('path').map(path => path.attributes('d'))).toEqual([
    'M 260 60 L 180 110',
    'M 180 180 L 80 250',
  ])
  wrapper.vm.zoomIn()
  await layout.flush()
  expect(wrapper.findAll('path')[0].attributes('d')).toBe('M 260 60 L 180 110')
  await wrapper.setProps({ direction: 'horizontal', lineStyle: 'rounded' })
  await layout.flush()
  expect(wrapper.findAll('path')[0].attributes('d')).toContain('M 320 30')
  expect(wrapper.findAll('path')[0].attributes('d')).toContain('Q')
  await wrapper.get('[aria-label="折叠 Team"]').trigger('click')
  await layout.flush()
  expect(wrapper.findAll('path')).toHaveLength(1)
  const node = wrapper.get('.c-orgchart__node').element
  vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(50, 40, 220, 100)
  )
  layout.observations[0].notify(node)
  await layout.flush()
  expect(wrapper.findAll('path')[0].attributes('d')).not.toContain('M 320 30')
})

test('manual zoom cancels pending fit and locate; data replacement cancels stale same-key focus', async () => {
  measuredLayout()
  const wrapper = mount(OrgChart, { props: { data: data() } })
  Object.defineProperties(wrapper.element, {
    clientWidth: { value: 800 },
    clientHeight: { value: 600 },
  })
  const fit = wrapper.vm.fitView()
  wrapper.vm.zoomIn()
  await fit
  expect(wrapper.vm.zoom).toBeCloseTo(1.1)
  const locate = wrapper.vm.locate(2)
  wrapper.vm.zoomOut()
  expect(await locate).toBe(false)
  const stale = wrapper.vm.locate(2)
  await wrapper.setProps({ data: data() })
  expect(await stale).toBe(false)
})

test('unmount cancels queued measurements and asynchronous view work', async () => {
  const layout = measuredLayout()
  const wrapper = mount(OrgChart, { props: { data: data() } })
  await nextTick()
  const locating = wrapper.vm.locate(2)
  const fitting = wrapper.vm.fitView()
  wrapper.unmount()
  const reads = layout.measure.mock.calls.length
  await layout.flush()
  expect(await locating).toBe(false)
  await fitting
  expect(layout.measure).toHaveBeenCalledTimes(reads)
  expect(layout.cancel).toHaveBeenCalled()
  expect(layout.observations[0].disconnect).toHaveBeenCalledOnce()
})

test('Naive theme changes only update component-scoped variables', async () => {
  const dark = ref(false)
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(
          NConfigProvider,
          { theme: dark.value ? darkTheme : null },
          { default: () => h(OrgChart, { data: data() }) }
        )
    )
  )
  const chart = wrapper.get('.c-orgchart')
  const light = chart.element.getAttribute('style')
  dark.value = true
  await nextTick()
  expect(chart.element.getAttribute('style')).not.toBe(light)
  expect(document.documentElement.getAttribute('style')).toBeNull()
})
