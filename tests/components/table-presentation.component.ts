import { expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import { NDataTable, NTag } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

const config = { toolbar: { show: false }, pagination: false as const }
const columnsOf = (wrapper: VueWrapper) =>
  wrapper.getComponent(NDataTable).props('columns') as Array<{
    key: string
    width: number
  }>

test('content widths use displayed labels, bound long content and preserve explicit widths', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      config,
      data: [
        {
          id: 1,
          short: 'A',
          long: '超长文本'.repeat(10000),
          code: 'X',
          formatted: 1,
        },
      ],
      columns: [
        { type: 'index' },
        { key: 'short', title: '短' },
        { key: 'long', title: '备注' },
        { key: 'explicit', title: '指定宽度', width: 480 },
        {
          key: 'formatted',
          title: '数字',
          formatter: { type: 'enum', fn: () => '格式化后的业务信息' },
        },
        {
          key: 'code',
          title: '代码',
          dictionary: {
            getOptions: () => [
              { value: 'X', label: '需要按展示文字测量的字典标签' },
            ],
          },
        },
      ],
    },
  })
  await flushPromises()
  const widths = new Map(
    columnsOf(wrapper).map(column => [column.key, column.width])
  )
  expect(widths.get('_index')).toBe(50)
  expect(widths.get('short')).toBe(80)
  expect(widths.get('long')).toBe(360)
  expect(widths.get('explicit')).toBe(480)
  expect(widths.get('formatted')).toBeGreaterThan(120)
  expect(widths.get('code')).toBeGreaterThan(180)
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('fixed')
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(
    [...widths.values()].reduce((sum, width) => sum + width, 0)
  )
})

test('automatic widths respond to loaded data while explicit and disabled widths remain stable', async () => {
  const consumerColumns: TableColumn[] = [
    { key: 'name', title: '名称', minWidth: 90, maxWidth: 200 },
    { key: 'id', title: '编号', autoWidth: false },
    { key: 'fixed', title: '固定', width: 140 },
  ]
  const wrapper = mount(C_Table<DataRecord>, {
    props: { config, columns: consumerColumns, data: [{ id: 1, name: '短' }] },
  })
  await flushPromises()
  expect(columnsOf(wrapper).map(col => col.width)).toEqual([90, 180, 140])
  await wrapper.setProps({
    data: [{ id: 1, name: '较长的客户名称'.repeat(20) }],
  })
  expect(columnsOf(wrapper).map(col => col.width)).toEqual([200, 180, 140])
  expect(consumerColumns[0].width).toBeUndefined()
  expect(wrapper.emitted('update:data')).toBeUndefined()
})

test('status shorthand preserves zero, false, dictionaries, unknown values and custom render precedence', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      config,
      data: [0, false, 'S1C', '__proto__', null].map((state, id) => ({
        id,
        state,
      })),
      columns: [
        {
          key: 'state',
          title: '状态',
          status: {
            0: { label: '待复核', color: 'warning' },
            false: { label: '特殊状态', color: '#8b5cf6' },
          },
          dictionary: { getOptions: () => [{ value: 'S1C', label: '已完成' }] },
        },
      ],
    },
  })
  await flushPromises()
  const tags = wrapper.findAllComponents(NTag)
  expect(tags.map(tag => tag.text())).toEqual([
    '待复核',
    '特殊状态',
    '已完成',
    '__proto__',
  ])
  expect(tags[0].props('type')).toBe('warning')
  expect(tags[1].props('color')?.textColor).toBe('#8b5cf6')
  expect(tags[2].props('type')).toBe('success')
  expect(tags[3].props('type')).toBe('default')
  await wrapper.setProps({
    columns: [
      {
        key: 'state',
        title: '状态',
        status: true,
        render: () => h('mark', '自定义'),
      },
    ],
  })
  expect(wrapper.findComponent(NTag).exists()).toBe(false)
  expect(wrapper.find('mark').text()).toBe('自定义')
})

test('measurement work is bounded and custom renderers are not invoked for sizing', async () => {
  const formatter = vi.fn((value: unknown) => String(value))
  const renderer = vi.fn(() => h('mark', '渲染器'))
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      config: { ...config, pagination: { pageSize: 10 } },
      data: Array.from({ length: 1000 }, (_, id) => ({ id, name: '普通内容' })),
      columns: [
        {
          key: 'name',
          title: '名称',
          formatter: { type: 'enum', fn: formatter },
          render: renderer,
        },
      ],
    },
  })
  await flushPromises()
  // formatter 仅用于抽样；展示走 render，避免为测宽额外挂载或执行用户渲染器。
  expect(formatter.mock.calls.length).toBeLessThanOrEqual(200) // 根元素挂载前后各一次。
  const calls = formatter.mock.calls.length
  await wrapper.setProps({ loading: true })
  expect(formatter).toHaveBeenCalledTimes(calls)
  expect(columnsOf(wrapper)[0].width).toBeLessThanOrEqual(360)
})

test('resizable columns cannot shrink below their header text and controls', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      config,
      data: [{ id: 1 }],
      columns: [
        {
          key: 'id',
          title: '生产计划',
          width: 240,
          minWidth: 40,
          resizable: true,
          sorter: 'default',
          filter: 'default',
          filterOptions: [],
        },
      ],
    },
  })
  await flushPromises()
  const column = wrapper.getComponent(NDataTable).props('columns')![0]!
  expect(column.minWidth).toBeGreaterThan(120)
  expect(column.width).toBe(240)
})
