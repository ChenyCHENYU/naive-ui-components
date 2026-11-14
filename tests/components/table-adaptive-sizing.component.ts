import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import {
  NDataTable,
  type DataTableColumn,
  type DataTableCreateSummary,
} from 'naive-ui'
import { h, ref, KeepAlive } from 'vue'
import C_Table from '../../src/components/C_Table/index.vue'
import { allocateColumnWidths } from '../../src/components/C_Table/composables/columnLayout'
import {
  nativeColumnLayout,
  nativeSummary,
} from '../../src/components/C_Table/composables/nativeColumnLayout'
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
      '.n-data-table-base-table-body .n-scrollbar-container, .n-data-table-base-table-body .v-vl'
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

test('right-fixed actions retain a full native canvas while a manual gesture changes only its business target and the decorative gap', async () => {
  vi.useFakeTimers()
  controlViewport()
  const declared: TableColumn[] = [
    ...columns,
    { key: '_actions', title: '操作', width: 124 },
  ]
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: declared,
      data,
      config: {
        ...config,
        persistKey: 'right-gap',
        actions: { detail: () => undefined },
      },
    },
  })
  await flushPromises()
  const logical = () =>
    leaves(wrapper).filter(column => column.className !== 'c-table-layout-gap')
  const initial = logical().map(column => column.width)
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  resize(112, 112, logical()[1] as Parameters<typeof resize>[2], () =>
    Number(initial[1])
  )
  await flushPromises()
  const expected = initial.map((width, index) => (index === 1 ? 112 : width))
  expect(logical().map(column => column.width)).toEqual(expected)
  const gap = leaves(wrapper).find(
    column => column.className === 'c-table-layout-gap'
  )!
  expect(gap.width).toBeCloseTo(Number(initial[1]) - 112)
  expect(gap).toMatchObject({ resizable: false, allowExport: false })
  expect(logical().at(-1)).toMatchObject({
    key: '_actions',
    width: 124,
    fixed: 'right',
  })
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(900)
  expect(wrapper.get('td.c-table-layout-gap').attributes('aria-hidden')).toBe(
    'true'
  )
  await vi.advanceTimersByTimeAsync(150)
  await flushPromises()
  expect(logical().map(column => column.width)).toEqual(expected)
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(900)
  expect(localStorage.getItem('c_table_cols_right-gap')).not.toContain(
    '__c_table_layout_gap__'
  )
  expect(declared.map(column => column.width)).toEqual([
    undefined,
    undefined,
    120,
    124,
  ])
})

test('native gap translates crossing body/header/summary spans without mutating logical columns or records', () => {
  const colSpan = vi.fn(() => 3)
  const rowSpan = vi.fn(() => 2)
  const columns: DataTableColumn[] = [
    { key: 'a', title: 'A', width: 100, colSpan, rowSpan, titleColSpan: 3 },
    { key: 'b', title: 'B', width: 100 },
    { key: 'c', title: 'C', width: 100, fixed: 'right' },
  ]
  const projected = nativeColumnLayout({ columns, width: 300 }, 600)
  const leaves = flattenTableColumns(projected.columns)
  const first = leaves[0]
  const record = { id: 1 }
  expect(projected.width).toBe(600)
  expect(leaves.map(column => column.width)).toEqual([100, 100, 300, 100])
  if (first.type || 'children' in first)
    throw new Error('Expected ordinary first column')
  expect(first.titleColSpan).toBe(4)
  if (!('colSpan' in first)) throw new Error('Expected ordinary first column')
  expect(first.colSpan!(record, 7)).toBe(4)
  expect(colSpan).toHaveBeenCalledExactlyOnceWith(record, 7)
  expect(first.rowSpan).toBe(rowSpan)
  expect(leaves[1]).toBe(columns[1])
  expect(leaves[3]).toBe(columns[2])
  const cell = Object.freeze({ value: '合计', colSpan: 3 })
  const summary = Object.freeze({ a: cell })
  const callback = vi.fn(() => summary)
  const rows = [record]
  expect(nativeSummary(callback, projected.gap)!(rows)).toEqual({
    a: { value: '合计', colSpan: 4 },
  })
  expect(callback).toHaveBeenCalledExactlyOnceWith(rows)
  expect(summary.a).toBe(cell)
  expect(summary.a.colSpan).toBe(3)
  expect(columns[0]).toMatchObject({ titleColSpan: 3, colSpan })
})

test('grouped native headers and summary rows preserve their logical merged-cell extents across the gap', async () => {
  controlViewport()
  const colSpan = vi.fn(() => 2)
  const declared: TableColumn[] = [
    {
      type: 'group',
      title: '订单信息',
      children: [
        { key: 'name', title: '名称', width: 100 },
        {
          type: 'group',
          title: '详情',
          children: [
            {
              key: 'spec',
              title: '规格',
              width: 100,
              titleColSpan: 2,
              colSpan,
            },
            { key: 'fixed', title: '右区', width: 100, fixed: 'right' },
          ],
        },
      ],
    },
  ]
  const summary = Object.freeze({
    spec: Object.freeze({ value: '合计', colSpan: 2 }),
  })
  const callback = vi.fn(() => summary)
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: declared,
      rowNumber: false,
      data,
      config: { ...config, summary: { render: callback } },
    },
  })
  await flushPromises()
  expect(leaves(wrapper).map(column => column.width)).toEqual([
    100, 100, 600, 100,
  ])
  const innerHeader = wrapper
    .findAll('th')
    .find(header => header.text() === '详情')!
  expect(innerHeader.attributes('colspan')).toBe('3')
  expect(wrapper.get('th[data-col-key="spec"]').attributes('colspan')).toBe('3')
  expect(
    wrapper
      .get('tbody tr:not(.n-data-table-tr--summary) [data-col-key="spec"]')
      .attributes('colspan')
  ).toBe('3')
  expect(
    wrapper
      .get('.n-data-table-tr--summary [data-col-key="spec"]')
      .attributes('colspan')
  ).toBe('3')
  expect(summary.spec.colSpan).toBe(2)
  expect(colSpan).toHaveBeenCalledWith(data[0], 0)
  expect(declared[0]).toMatchObject({
    children: [
      { width: 100 },
      { children: [{ titleColSpan: 2, colSpan }, { width: 100 }] },
    ],
  })
})

test.each([true, false])(
  'native attrs summary replacement and clearing stay current with gap=%s',
  async withGap => {
    controlViewport()
    const first = vi.fn(() => ({ name: { value: 'first', colSpan: 2 } }))
    const second = vi.fn(() => ({ name: { value: 'second', colSpan: 2 } }))
    const summary = ref<DataTableCreateSummary | undefined>(first)
    const declared: TableColumn[] = [
      { key: 'name', title: '名称', width: withGap ? 100 : 1100 },
      { key: 'fixed', title: '固定', width: 120, fixed: 'right' },
    ]
    const wrapper = mount({
      render: () =>
        h(C_Table<DataRecord>, {
          columns: declared,
          rowNumber: false,
          data,
          config,
          summary: summary.value,
        }),
    })
    await flushPromises()
    const invoke = () =>
      wrapper.getComponent(NDataTable).props('summary')!(data)
    let before = first.mock.calls.length
    expect(invoke()).toEqual({
      name: { value: 'first', colSpan: withGap ? 3 : 2 },
    })
    expect(first.mock.calls.length).toBe(before + 1)
    summary.value = second
    await flushPromises()
    before = second.mock.calls.length
    const prior = first.mock.calls.length
    expect(invoke()).toEqual({
      name: { value: 'second', colSpan: withGap ? 3 : 2 },
    })
    expect(second.mock.calls.length).toBe(before + 1)
    expect(first.mock.calls.length).toBe(prior)
    summary.value = undefined
    await flushPromises()
    expect(wrapper.getComponent(NDataTable).props('summary')).toBeUndefined()
  }
)

test('changing only gap width reuses summary projection and delegates each request once', async () => {
  controlViewport()
  const callback = vi.fn(() => ({ name: { value: '合计', colSpan: 2 } }))
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: [
        { key: 'name', title: '名称', width: 100 },
        { key: 'fixed', title: '固定', width: 120, fixed: 'right' },
      ],
      rowNumber: false,
      data,
      config: { ...config, summary: { render: callback } },
    },
  })
  await flushPromises()
  const summary = wrapper.getComponent(NDataTable).props('summary')
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  resize(
    120,
    120,
    leaves(wrapper)[0] as Parameters<typeof resize>[2],
    () => 100
  )
  await flushPromises()
  expect(wrapper.getComponent(NDataTable).props('summary')).toBe(summary)
  const calls = callback.mock.calls.length
  summary!(data)
  expect(callback.mock.calls.length).toBe(calls + 1)
})

test('horizontal virtualization receives the same gap geometry and unchanged business widths', async () => {
  controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: [
        { key: 'name', title: '名称', width: 100 },
        { key: 'fixed', title: '固定', width: 120, fixed: 'right' },
      ],
      virtualScrollX: true,
      rowNumber: false,
      data,
      config: { ...config, virtualScroll: true, display: { maxHeight: 200 } },
    },
  })
  await flushPromises()
  // happy-dom 没有真实布局；向虚拟列表发送浏览器已有的可见高度。
  wrapper
    .getComponent({ name: 'VirtualList' })
    .getComponent({ name: 'ResizeObserver' })
    .props('onResize')({
    target: wrapper.get('.v-vl').element,
    contentRect: { width: 900, height: 200 },
  })
  await flushPromises()
  expect(wrapper.getComponent(NDataTable).props('virtualScrollX')).toBe(true)
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(900)
  expect(leaves(wrapper).map(column => column.width)).toEqual([100, 680, 120])
  expect(
    wrapper.get('.n-data-table-td.c-table-layout-gap').attributes('aria-hidden')
  ).toBe('true')
})

test.each(['left', 'cancel'] as const)(
  'actions fixed-right default respects explicit override: %s',
  async override => {
    controlViewport()
    if (override === 'cancel')
      localStorage.setItem(
        'c_table_cols_actions-fixed',
        JSON.stringify({ columns: [{ key: '_actions', fixed: null }] })
      )
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        columns: [
          { key: 'name', title: '名称', width: 100 },
          {
            key: '_actions',
            title: '操作',
            width: 124,
            ...(override === 'left' ? { fixed: 'left' as const } : {}),
          },
        ],
        data,
        config: {
          ...config,
          persistKey: 'actions-fixed',
          actions: { detail: () => undefined },
        },
      },
    })
    await flushPromises()
    expect(leaves(wrapper).at(-1)?.fixed).toBe(
      override === 'left' ? 'left' : undefined
    )
    expect(
      leaves(wrapper).some(column => column.className === 'c-table-layout-gap')
    ).toBe(false)
  }
)

test('layout-only gap preserves untouched identities, avoids any business key and is absent from native fallbacks', () => {
  const ordinary: DataTableColumn = {
    key: '__c_table_layout_gap__',
    title: '名称',
    width: 100,
  }
  const right: DataTableColumn = {
    key: 'fixed',
    title: '固定',
    width: 100,
    fixed: 'right',
  }
  const group: DataTableColumn = {
    key: '__c_table_layout_gap___',
    title: '分组',
    children: [ordinary],
  }
  const layout = { columns: [group, right], width: 200 }
  const projected = nativeColumnLayout(layout, 500)
  const result = flattenTableColumns(projected.columns)
  expect('key' in result[1] && result[1].key).toBe('__c_table_layout_gap____')
  expect(projected.columns[0]).toBe(group)
  expect(result[0]).toBe(ordinary)
  expect(result[2]).toBe(right)
  expect(nativeColumnLayout(layout, 100)).toBe(layout)
  expect(
    nativeColumnLayout({ columns: [ordinary], width: 100 }, 500).gap
  ).toBeUndefined()
  const native = { columns: [right] }
  expect(nativeColumnLayout(native, 500)).toBe(native)
  expect(nativeSummary(undefined, projected.gap)).toBeUndefined()
})

test('a leading decorative gap never receives the logical tree expansion control', async () => {
  controlViewport()
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      rowNumber: false,
      columns: [{ key: 'name', title: '名称', width: 120, fixed: 'right' }],
      data: [{ id: 1, name: 'parent', children: [{ id: 2, name: 'child' }] }],
      config: { ...config, tree: true },
    },
  })
  await flushPromises()
  const trigger = wrapper.get(
    '.n-data-table-tbody .n-data-table-expand-trigger'
  )
  expect(trigger.element.closest('td')?.getAttribute('data-col-key')).toBe(
    'name'
  )
  await trigger.trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('child')
})
