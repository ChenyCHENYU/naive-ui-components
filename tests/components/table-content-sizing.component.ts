import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { NDataTable, type DataTableProps } from 'naive-ui'
import { h, ref } from 'vue'
import C_Table from '../../src/components/C_Table/index.vue'
import { flattenTableColumns } from '../../src/components/C_Table/helpers'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

const rows = [{ id: 1, customer: '星海科技', grade: 'Q355B', amount: 12 }]
const columns: TableColumn[] = [
  { key: 'customer', title: '客户名称', resizable: true },
  { key: 'grade', title: '钢种', resizable: true },
  { key: 'amount', title: '计划量 (t)', width: 110 },
]
const baseConfig = { toolbar: { show: false }, pagination: false as const }
afterEach(() => vi.useRealTimers())

/** 检查实际交给 Naive 的叶列，而不是测宽中间结果。 */
const leaves = (wrapper: VueWrapper) =>
  flattenTableColumns(
    wrapper.getComponent(NDataTable).props('columns') as TableColumn[]
  )

function expectManagedWidths(wrapper: VueWrapper) {
  const widths = leaves(wrapper).map(column => column.width)
  expect(
    widths.every(width => typeof width === 'number' && Number.isFinite(width))
  ).toBe(true)
  const total = widths.reduce<number>((sum, width) => sum + Number(width), 0)
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(total)
  expect(wrapper.attributes('style')).toContain(
    `--c-table-native-width: ${total}px`
  )
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('fixed')
  return widths
}

for (const scrollX of [undefined, 1050]) {
  test(`content widths stay numeric and own the actual canvas with scrollX=${scrollX}`, async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: rows,
        columns,
        config: { ...baseConfig, display: { scrollX } },
      },
    })
    await flushPromises()
    const widths = expectManagedWidths(wrapper)
    expect(widths[1]).toBeLessThanOrEqual(360)
    expect(columns[0].width).toBeUndefined()
  })
}

for (const virtualScrollX of [false, true]) {
  test(`nested leaves share one numeric width budget with virtualScrollX=${virtualScrollX}`, async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: rows,
        virtualScrollX,
        columns: [
          {
            type: 'group',
            title: '订单信息',
            children: [
              columns[0],
              { type: 'group', title: '指标', children: columns.slice(1) },
            ],
          },
        ],
        config: { ...baseConfig, display: { scrollX: 1050 } },
      },
    })
    await flushPromises()
    expectManagedWidths(wrapper)
    expect(wrapper.getComponent(NDataTable).props('columns')).toHaveLength(2)
  })
}

test('no index and disabled content measuring retain numeric widths without native stretching', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: rows,
      rowNumber: false,
      columns: columns
        .slice(0, 2)
        .map(column => ({ ...column, autoWidth: false })),
      config: baseConfig,
    },
  })
  await flushPromises()
  expect(expectManagedWidths(wrapper)).toEqual([180, 180])
})

test('pointer widths update the same canvas immediately and do not jump on the 150ms preference commit', async () => {
  vi.useFakeTimers()
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: rows,
      columns,
      config: {
        ...baseConfig,
        persistKey: 'live-column-widths',
        display: { scrollX: 1050 },
      },
    },
  })
  await flushPromises()
  const initial = expectManagedWidths(wrapper)
  const target = leaves(wrapper)[1]
  const initialWidth = Number(target.width)
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize') as NonNullable<
    DataTableProps['onUnstableColumnResize']
  >
  await [initialWidth + 1, initialWidth + 40, initialWidth + 10].reduce(
    async (previous, width) => {
      await previous
      resize(width, width, target as Parameters<typeof resize>[2], () => width)
      // 同帧跟随原生 colgroup，不能等到保存偏好时才更新总宽。
      await flushPromises()
      const expected = initial.map((value, index) =>
        index === 1 ? width : value
      )
      expect(expectManagedWidths(wrapper)).toEqual(expected)
    },
    Promise.resolve()
  )
  await vi.advanceTimersByTimeAsync(149)
  expectManagedWidths(wrapper)
  await vi.advanceTimersByTimeAsync(1)
  await flushPromises()
  expect(expectManagedWidths(wrapper)).toEqual(
    initial.map((width, index) => (index === 1 ? initialWidth + 10 : width))
  )
  expect(leaves(wrapper)[2].width).toBe(initial[2])
  expect(columns[0].width).toBeUndefined()
})

test.each([
  { tableLayout: 'auto' as const },
  { 'table-layout': 'fixed' as const },
])('explicit native layout preserves its declared scrollX: %j', async attrs => {
  const wrapper = mount(C_Table<DataRecord>, {
    attrs,
    props: {
      data: rows,
      columns,
      config: { ...baseConfig, display: { scrollX: 1050 } },
    },
  })
  await flushPromises()
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(1050)
  expect(wrapper.attributes('style')).toContain('--c-table-native-width: 100%')
})

test('a native percentage column retains native scrollX and width metadata', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: rows,
      columns: [{ ...columns[0], width: '25%' }, ...columns.slice(1)],
      config: { ...baseConfig, display: { scrollX: 1050 } },
    },
  })
  await flushPromises()
  expect(leaves(wrapper)[1].width).toBe('25%')
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(1050)
  expect(wrapper.attributes('style')).toContain('--c-table-native-width: 100%')
})

test('switching reports flushes the old pending width without carrying it into the new report', async () => {
  vi.useFakeTimers()
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: rows,
      columns,
      config: { ...baseConfig, persistKey: 'width-report-a' },
    },
  })
  await flushPromises()
  const initial = expectManagedWidths(wrapper)
  const target = leaves(wrapper)[1]
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  resize(183, 183, target as Parameters<typeof resize>[2], () => 80)
  await flushPromises()
  expect(leaves(wrapper)[1].width).toBe(183)
  await wrapper.setProps({
    config: { ...baseConfig, persistKey: 'width-report-b' },
  })
  expect(expectManagedWidths(wrapper)).toEqual(initial)
  await vi.advanceTimersByTimeAsync(200)
  expect(expectManagedWidths(wrapper)).toEqual(initial)
  expect(
    JSON.parse(localStorage.getItem('c_table_cols_width-report-a')!).columns
  ).toEqual([{ key: 'customer', width: 183 }])
  expect(localStorage.getItem('c_table_cols_width-report-b')).toBeNull()
})

test('reset cancels pending width storage and returns the native cache to measured content widths', async () => {
  vi.useFakeTimers()
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data: rows,
      columns,
      config: { pagination: false, persistKey: 'width-reset' },
    },
  })
  await flushPromises()
  const initial = expectManagedWidths(wrapper)
  const target = leaves(wrapper)[1]
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  resize(183, 183, target as Parameters<typeof resize>[2], () => 80)
  await flushPromises()
  await wrapper.get('.column-settings-btn').trigger('click')
  await flushPromises()
  wrapper.getComponent({ name: 'ColumnSettings' }).vm.$emit('reset')
  await flushPromises()
  expect(expectManagedWidths(wrapper)).toEqual(initial)
  await vi.advanceTimersByTimeAsync(200)
  expect(expectManagedWidths(wrapper)).toEqual(initial)
  expect(localStorage.getItem('c_table_cols_width-reset')).toBeNull()
})

test('changing an explicit native layout switches width ownership without remounting the wrapper', async () => {
  const tableLayout = ref<'auto' | undefined>()
  const wrapper = mount({
    render: () =>
      h(C_Table<DataRecord>, {
        data: rows,
        columns,
        config: { ...baseConfig, display: { scrollX: 1050 } },
        ...(tableLayout.value === undefined
          ? {}
          : { tableLayout: tableLayout.value }),
      }),
  })
  await flushPromises()
  expectManagedWidths(wrapper)
  tableLayout.value = 'auto'
  await flushPromises()
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('auto')
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(1050)
  expect(wrapper.attributes('style')).toContain('--c-table-native-width: 100%')
  tableLayout.value = undefined
  await flushPromises()
  expectManagedWidths(wrapper)
})

test('resizing does not resample offscreen values in untouched automatic columns', async () => {
  vi.useFakeTimers()
  let sampled = 0
  const data = Array.from({ length: 1000 }, (_, index) => ({
    id: index,
    customer: '星海科技',
    get grade() {
      if (index === 999) sampled++
      return 'Q355B'
    },
    amount: 12,
  }))
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data,
      columns,
      config: {
        ...baseConfig,
        virtualScroll: true,
        display: { maxHeight: 200 },
      },
    },
  })
  await flushPromises()
  expect(sampled).toBeGreaterThan(0)
  const initial = sampled
  const target = leaves(wrapper)[1]
  const resize = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  await [120, 121, 160, 140].reduce(async (previous, width) => {
    await previous
    resize(width, width, target as Parameters<typeof resize>[2], () => 80)
    await flushPromises()
    expect(sampled).toBe(initial)
  }, Promise.resolve())
  await vi.advanceTimersByTimeAsync(150)
  await flushPromises()
  expect(sampled).toBe(initial)
})
