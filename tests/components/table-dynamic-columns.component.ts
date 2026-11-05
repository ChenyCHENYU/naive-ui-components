import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NDataTable, NPagination } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

const source = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  amount: index * 10,
}))
const cols: TableColumn[] = [{ key: 'amount', title: '金额' }]

test('default index and pager use page offsets; either can be disabled without removing custom columns', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: { columns: cols, data: source },
  })
  const ordinals = () =>
    wrapper.findAll('tbody .c-table-index-column').map(cell => cell.text())
  const table = wrapper.getComponent(NDataTable)
  expect(table.props('columns')![1]).toMatchObject({
    key: 'amount',
    align: 'center',
    titleAlign: 'center',
  })
  expect(ordinals()).toEqual(source.slice(0, 10).map(row => String(row.id)))
  wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
  await flushPromises()
  expect(ordinals()).toEqual(['11', '12'])

  await wrapper.setProps({ rowNumber: false, pagination: false })
  expect(wrapper.findComponent(NPagination).exists()).toBe(false)
  expect(ordinals()).toEqual([])
  expect(wrapper.findAll('tbody tr')).toHaveLength(12)

  await wrapper.setProps({
    rowNumber: true,
    columns: [
      { key: 'amount', title: '金额', align: 'right' },
      { type: 'index', title: '行号' },
    ],
    pagination: { page: 3, pageSize: 5, itemCount: 17 },
    remote: true,
    data: source.slice(-2),
  })
  expect(wrapper.findAll('thead th').map(cell => cell.text())).toEqual([
    '金额',
    '行号',
  ])
  expect(wrapper.getComponent(NDataTable).props('columns')![0]).toMatchObject({
    align: 'right',
  })
  expect(ordinals()).toEqual(['11', '12'])
  await wrapper.setProps({ rowNumber: false })
  expect(ordinals()).toEqual(['11', '12'])
})

test('column preferences restore before the drawer opens and follow only stable keys in the current report', async () => {
  const report = 'dynamic-test'
  const storageKey = `c_table_cols_${report}`
  localStorage.setItem(
    storageKey,
    JSON.stringify([
      { key: 'amount', fixed: 'left', width: 160 },
      { key: 'day', visible: false },
    ])
  )
  const resizeListeners = [vi.fn(), vi.fn()]
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: [],
      data: [],
      config: { persistKey: report, pagination: false },
    },
    attrs: { onUnstableColumnResize: resizeListeners },
  })
  const tableColumns = () => wrapper.getComponent(NDataTable).props('columns')!
  try {
    const initial: TableColumn[] = [
      { key: 'day', title: '日期' },
      { key: 'amount', title: '金额', width: 120, resizable: true },
      { key: 'rate', title: '合格率', width: 125 },
    ]
    await wrapper.setProps({
      columns: initial,
      data: [{ id: 1, amount: 5, rate: '99%' }],
    })
    expect(tableColumns()).toEqual([
      expect.objectContaining({ key: '_index' }),
      expect.objectContaining({ key: 'amount', width: 160, fixed: 'left' }),
      expect.objectContaining({ key: 'rate', width: 125 }),
    ])
    const oldTable = wrapper.getComponent(NDataTable)
    const resize = oldTable.props('onUnstableColumnResize')!
    resize(183, 183, { key: 'amount', title: '金额' }, () => 160)
    for (const listener of resizeListeners)
      expect(listener).toHaveBeenCalledTimes(1)
    const replacement: TableColumn[] = [
      { key: 'day', title: '统计日' },
      { key: 'region', title: '地区', width: 110 },
      { key: 'amount', title: '核算金额', width: 140, resizable: true },
    ]
    await wrapper.setProps({
      columns: replacement,
      data: [{ id: 2, amount: 6, region: '西区' }],
    })
    expect(wrapper.getComponent(NDataTable).element).toBe(oldTable.element)
    expect(tableColumns()).toEqual([
      expect.objectContaining({ key: '_index' }),
      expect.objectContaining({
        key: 'amount',
        title: '核算金额',
        width: 183,
        fixed: 'left',
      }),
      expect.objectContaining({ key: 'region', width: 110 }),
    ])
    await wrapper.setProps({
      columns: replacement.map(column =>
        column.key === 'amount'
          ? { ...column, title: '汇总核算金额（统计币种人民币）'.repeat(3) }
          : column
      ),
    })
    expect(wrapper.getComponent(NDataTable).element).not.toBe(oldTable.element)
    expect(
      tableColumns().find(column => 'key' in column && column.key === 'amount')
        ?.width
    ).toBeGreaterThan(183)
    await wrapper.setProps({
      columns: replacement.filter(column => column.key !== 'day'),
    })
    await wrapper.setProps({ columns: replacement })
    expect(
      tableColumns().map(column => 'key' in column && column.key)
    ).toContain('day')

    await wrapper.setProps({
      config: { persistKey: 'different-report', pagination: false },
    })
    expect(tableColumns()).toEqual([
      expect.objectContaining({ key: '_index' }),
      expect.objectContaining({ key: 'day' }),
      expect.objectContaining({ key: 'region' }),
      expect.objectContaining({ key: 'amount', width: 140 }),
    ])
  } finally {
    wrapper.unmount()
    localStorage.removeItem(storageKey)
  }
})

test('drawer edits survive fresh definitions and reset to the latest server defaults', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns: [
        { key: 'day', title: '日期' },
        { key: 'amount', title: '金额' },
      ],
      data: [{ id: 1, day: '星期三', amount: 10 }],
    },
  })
  const titles = () => wrapper.findAll('thead th').map(cell => cell.text())
  try {
    await wrapper
      .get('.column-settings-btn[aria-label="mdi:cog"]')
      .trigger('click')
    await flushPromises()
    const settings = wrapper.getComponent({ name: 'ColumnSettings' })
    settings.vm.$emit('change', [
      { key: 'amount', title: '金额', fixed: 'left' },
      { key: 'day', title: '日期', visible: false },
    ])
    await flushPromises()
    await wrapper.setProps({
      columns: [
        { key: 'day', title: '交易日' },
        { key: 'amount', title: '净额' },
        { key: 'currency', title: '币种' },
      ],
    })
    expect(titles()).toEqual(['序号', '净额', '币种'])
    await settings
      .findAll('button')
      .find(button => button.text() === '重置')!
      .trigger('click')
    expect(titles()).toEqual(['序号', '交易日', '净额', '币种'])
  } finally {
    wrapper.unmount()
  }
})
