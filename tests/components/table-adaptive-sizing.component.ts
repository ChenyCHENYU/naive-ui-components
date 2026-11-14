import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { NDataTable, type DataTableColumn } from 'naive-ui'
import { h, ref, KeepAlive } from 'vue'
import C_Table from '../../src/components/C_Table/index.vue'
import { allocateColumnWidths } from '../../src/components/C_Table/composables/columnLayout'
import { flattenTableColumns } from '../../src/components/C_Table/helpers'
import { isSpecialColumn } from '../../src/components/C_Table/components/ColumnSettings/data'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

const leaves = (wrapper: VueWrapper) =>
  flattenTableColumns(
    wrapper.getComponent(NDataTable).props('columns') as TableColumn[]
  )
const widths = (wrapper: VueWrapper) =>
  leaves(wrapper).map(column => Number(column.width))
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

/** 模拟真实 body 可用宽/外宽；不依赖 happy-dom 的零尺寸布局。 */
function controlViewport() {
  let client = 900
  let outer = 900
  const observed: Array<{
    callback: ResizeObserverCallback
    targets: Set<Element>
  }> = []
  const isBody = (element: HTMLElement) =>
    element.matches(
      '.n-data-table-base-table-body .n-scrollbar-container, .n-data-table-base-table-body.v-vl'
    )
  const originalClientWidth = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'clientWidth'
  )
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      return isBody(this) ? client : (originalClientWidth?.get?.call(this) ?? 0)
    }
  )
  const getRect = HTMLElement.prototype.getBoundingClientRect
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const rect = getRect.call(this)
      return isBody(this) ? { ...rect, width: outer, toJSON: () => ({}) } : rect
    }
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      readonly record: (typeof observed)[number]
      constructor(callback: ResizeObserverCallback) {
        this.record = { callback, targets: new Set() }
        observed.push(this.record)
      }
      observe(target: Element) {
        this.record.targets.add(target)
      }
      unobserve(target: Element) {
        this.record.targets.delete(target)
      }
      disconnect() {
        this.record.targets.clear()
      }
    }
  )
  return {
    async resize(width: number, outerWidth = width) {
      client = width
      outer = outerWidth
      for (const record of observed) {
        const targets = [...record.targets].filter(target =>
          isBody(target as HTMLElement)
        )
        if (targets.length)
          record.callback(
            targets.map(
              target =>
                ({
                  target,
                  contentRect: target.getBoundingClientRect(),
                  borderBoxSize: [{ inlineSize: outer, blockSize: 200 }],
                  contentBoxSize: [{ inlineSize: client, blockSize: 200 }],
                  devicePixelContentBoxSize: [],
                }) as ResizeObserverEntry
            ),
            {} as ResizeObserver
          )
      }
      await flushPromises()
    },
    active: () =>
      observed
        .flatMap(record => [...record.targets])
        .filter(target => isBody(target as HTMLElement)).length,
  }
}

const config = { toolbar: { show: false }, pagination: false as const }
const columns: TableColumn[] = [
  { key: 'name', title: '名称' },
  { key: 'spec', title: '规格' },
  { key: 'fixed', title: '固定', width: 120 },
]
const data = [{ id: 1, name: 'A', spec: '1 × 200 × 6000', fixed: 0 }]

test('a few automatic columns share the actual viewport by preferred-width ratio, while utility and explicit columns stay fixed', async () => {
  const viewport = controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: { columns, data, config },
  })
  await flushPromises()
  const result = widths(wrapper)
  expect(result[0]).toBe(50)
  expect(result[3]).toBe(120)
  expect(result.reduce((sum, width) => sum + width, 0)).toBeCloseTo(900)
  expect(result[2]).toBeGreaterThan(result[1])
  expect(leaves(wrapper)[0].resizable).not.toBe(true)
  expect(leaves(wrapper)[1].resizable).toBe(true)
  expect(viewport.active()).toBe(1)
  wrapper.unmount()
  expect(viewport.active()).toBe(0)
})

test('only the dragged column changes through persistence; gutter changes retain widths and a real container resize reallocates automatic peers', async () => {
  vi.useFakeTimers()
  const viewport = controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: { columns, data, config },
  })
  await flushPromises()
  const initial = widths(wrapper)
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  const target = leaves(wrapper)[1]
  const expected = initial.map((width, index) =>
    index === 1 ? width - 40 : width
  )
  resize(
    expected[1],
    expected[1],
    target as Parameters<typeof resize>[2],
    () => initial[1]
  )
  await flushPromises()
  expect(widths(wrapper)).toEqual(expected)
  await vi.advanceTimersByTimeAsync(150)
  await flushPromises()
  expect(widths(wrapper)).toEqual(expected)
  await viewport.resize(884, 900)
  expect(widths(wrapper)).toEqual(expected)
  await viewport.resize(1000)
  const enlarged = widths(wrapper)
  expect(enlarged[1]).toBe(expected[1])
  expect(enlarged[3]).toBe(120)
  expect(enlarged[2]).toBeGreaterThan(expected[2])
  expect(enlarged.reduce((sum, width) => sum + width, 0)).toBeCloseTo(1000)
})

test('zero-effect resize leaves automatic columns adaptive and reset returns a manual width to automatic allocation', async () => {
  const viewport = controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: { columns, data, config: { pagination: false } },
  })
  await flushPromises()
  const initial = widths(wrapper)
  let resize = wrapper.getComponent(NDataTable).props('onUnstableColumnResize')!
  resize(
    initial[1],
    initial[1],
    leaves(wrapper)[1] as Parameters<typeof resize>[2],
    () => initial[1]
  )
  await flushPromises()
  await viewport.resize(1100)
  expect(widths(wrapper)[1]).toBeGreaterThan(initial[1])
  const adaptive = widths(wrapper)
  resize = wrapper.getComponent(NDataTable).props('onUnstableColumnResize')!
  resize(
    100,
    100,
    leaves(wrapper)[1] as Parameters<typeof resize>[2],
    () => adaptive[1]
  )
  await flushPromises()
  expect(widths(wrapper)[1]).toBe(100)
  await wrapper.get('.column-settings-btn').trigger('click')
  await flushPromises()
  wrapper.getComponent({ name: 'ColumnSettings' }).vm.$emit('reset')
  await flushPromises()
  expect(widths(wrapper)).toEqual(adaptive)
})

test('allocation respects explicit maxima and never shrinks content bases to fit a smaller viewport', () => {
  const columns = [
    { key: 'a', width: 80, maxWidth: 90 },
    { key: 'b', width: 160 },
    { key: 'fixed', width: 50 },
  ] as DataTableColumn[]
  const options = {
    available: 500,
    automatic: new Set(['a', 'b']),
    pending: new Map(),
  }
  const result = allocateColumnWidths(columns, options)
  expect(result.map(column => column.width)).toEqual([90, 360, 50])
  expect(
    allocateColumnWidths(columns, { ...options, available: 200 }).map(
      column => column.width
    )
  ).toEqual([80, 160, 50])
  expect(columns.map(column => column.width)).toEqual([80, 160, 50])
})

test('native percentage widths retain native ownership, even after a resize callback', async () => {
  controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: [{ ...columns[0], width: '25%' }, ...columns.slice(1)],
      data,
      config: { ...config, display: { scrollX: 1050 } },
    },
  })
  await flushPromises()
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  resize(
    190,
    190,
    leaves(wrapper)[1] as Parameters<typeof resize>[2],
    () => 190
  )
  await flushPromises()
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(1050)
  expect(wrapper.attributes('style')).toContain('--c-table-native-width: 100%')
})

test('all structure-column forms are excluded from the settings bulk resizable switch', () => {
  for (const column of [
    { type: 'index' },
    { key: '_index' },
    { key: '_radio_selection' },
    { key: '_actions' },
    { type: 'selection' },
    { type: 'expand' },
  ] as TableColumn[])
    expect(isSpecialColumn(column)).toBe(true)
  expect(isSpecialColumn({ key: 'name', title: 'Name' })).toBe(false)
})

test('wide adaptive columns remain freely resizable past the former implicit 500px cap', async () => {
  const viewport = controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: { columns, data, config },
  })
  await flushPromises()
  await viewport.resize(2400)
  const initial = widths(wrapper)
  const target = leaves(wrapper)[2]
  expect(initial[2]).toBeGreaterThan(500)
  expect(target.maxWidth).toBeUndefined()
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  resize(
    initial[2] + 1,
    initial[2] + 1,
    target as Parameters<typeof resize>[2],
    () => initial[2]
  )
  await flushPromises()
  expect(widths(wrapper)).toEqual(
    initial.map((width, index) => (index === 2 ? width + 1 : width))
  )
})

test('viewport allocation never resamples offscreen values and raw utility keys keep the non-resizable default', async () => {
  const viewport = controlViewport()
  let reads = 0
  const data = Array.from({ length: 1000 }, (_, index) => ({
    id: index,
    name: 'A',
    get spec() {
      if (index === 999) reads++
      return '1 × 200 × 6000'
    },
  }))
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: [...columns, { key: '_radio_selection', title: '', width: 40 }],
      data,
      config: { ...config, virtualScroll: true, display: { maxHeight: 200 } },
    },
  })
  await flushPromises()
  const sampled = reads
  expect(sampled).toBeGreaterThan(0)
  await viewport.resize(1200)
  await viewport.resize(700)
  await viewport.resize(1400)
  expect(reads).toBe(sampled)
  expect(
    leaves(wrapper).find(column => column.key === '_radio_selection')?.resizable
  ).toBe(false)
})

test('forwarding an absent native tableLayout never disables the managed fixed layout', async () => {
  controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    attrs: { tableLayout: undefined },
    props: { columns, data, config },
  })
  await flushPromises()
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('fixed')
  expect(widths(wrapper).reduce((sum, width) => sum + width, 0)).toBeCloseTo(
    900
  )
})

test('keep-alive tables stop observing while inactive and remeasure when restored', async () => {
  const viewport = controlViewport()
  const visible = ref(true)
  const wrapper = mount({
    render: () =>
      h(KeepAlive, null, {
        default: () =>
          visible.value
            ? h(C_Table<DataRecord>, { columns, data, config })
            : h('div', 'other tab'),
      }),
  })
  await flushPromises()
  expect(viewport.active()).toBe(1)
  visible.value = false
  await flushPromises()
  expect(viewport.active()).toBe(0)
  await viewport.resize(1200)
  visible.value = true
  await flushPromises()
  expect(viewport.active()).toBe(1)
  expect(widths(wrapper).reduce((sum, width) => sum + width, 0)).toBeCloseTo(
    1200
  )
})

test('autoWidth false preserves its legacy 180px width while other automatic columns fill the viewport', async () => {
  const viewport = controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: [{ ...columns[0], autoWidth: false }, ...columns.slice(1)],
      data,
      config,
    },
  })
  await flushPromises()
  expect(widths(wrapper)).toEqual([50, 180, 550, 120])
  await viewport.resize(1200)
  expect(widths(wrapper)).toEqual([50, 180, 850, 120])
})

test.each(['leaf', 'group', 'preference'] as const)(
  'hidden native widths never disable visible-column allocation: %s',
  async mode => {
    controlViewport()
    const native: TableColumn = { key: 'native', title: '原生', width: '25%' }
    const hidden: TableColumn =
      mode === 'group'
        ? {
            type: 'group',
            title: '隐藏分组',
            visible: false,
            children: [native],
          }
        : { ...native, visible: mode === 'leaf' ? false : undefined }
    if (mode === 'preference')
      localStorage.setItem(
        'c_table_cols_hidden-native',
        JSON.stringify({ columns: [{ key: 'native', visible: false }] })
      )
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        columns: [...columns, hidden],
        data,
        config: {
          ...config,
          persistKey: 'hidden-native',
          display: { scrollX: 1050 },
        },
      },
    })
    await flushPromises()
    expect(widths(wrapper).reduce((sum, width) => sum + width, 0)).toBeCloseTo(
      900
    )
    expect(wrapper.getComponent(NDataTable).props('scrollX')).toBeCloseTo(900)
    if (mode !== 'preference') {
      await wrapper.setProps({ columns: [...columns, native] })
      expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(1050)
      expect(wrapper.attributes('style')).toContain(
        '--c-table-native-width: 100%'
      )
    }
  }
)
