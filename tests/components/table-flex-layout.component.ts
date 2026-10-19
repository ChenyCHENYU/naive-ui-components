import { expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import { NDataTable } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'
import { TABLE_GLOBAL_CONFIG_KEY } from '../../src/components/C_Table/composables/useTableGlobalConfig'

const data = [{ id: 1, name: 'Alice', count: 3 }]
const baseConfig = { toolbar: { show: false }, pagination: false as const }
const finalColumns = (wrapper: VueWrapper) =>
  wrapper.getComponent(NDataTable).props('columns') as unknown as Record<
    string,
    unknown
  >[]

test('default auxiliary widths stay compact while an undeclared business width remains naturally flexible', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data,
      columns: [
        { type: 'selection' },
        { type: 'expand', renderExpand: () => h('div', 'Details') },
        { type: 'index' },
        { key: 'name', title: 'Name' },
      ],
      config: { ...baseConfig, selection: true },
    },
  })
  await flushPromises()
  const columns = finalColumns(wrapper)
  expect(columns.map(column => column.width)).toEqual([40, 40, 50, undefined])
  expect(columns[3].minWidth).toBe(180)
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('fixed')
  // 窄容器也保留自然业务列的 180px 首选下限，避免 fixed 布局压扁内容。
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(310)
})

test('native horizontal virtualization retains numeric defaults and reacts when disabled', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data,
      virtualScrollX: true,
      columns: [{ type: 'index' }, { key: 'name', title: 'Name' }],
      config: { ...baseConfig, virtualScroll: true },
    },
  })
  await flushPromises()
  expect(wrapper.getComponent(NDataTable).props('virtualScrollX')).toBe(true)
  expect(finalColumns(wrapper).map(col => col.width)).toEqual([50, 180])
  await wrapper.setProps({ virtualScrollX: false })
  expect(wrapper.getComponent(NDataTable).props('virtualScrollX')).toBe(false)
  expect(finalColumns(wrapper).map(col => col.width)).toEqual([50, undefined])
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(230)
})

test.each([
  { scope: 'local', width: 180 },
  { scope: 'local', width: 240 },
  { scope: 'global-display', width: 180 },
  { scope: 'global-defaults', width: 180 },
])(
  'explicit $scope columnWidth=$width remains a declared width',
  async ({ scope, width }) => {
    const globals =
      scope === 'global-display'
        ? { display: { columnWidth: width } }
        : { defaults: { display: { columnWidth: width } } }
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data,
        columns: [{ type: 'index' }, { key: 'name', title: 'Name' }],
        config: {
          ...baseConfig,
          ...(scope === 'local' ? { display: { columnWidth: width } } : {}),
        },
      },
      global: {
        provide:
          scope === 'local'
            ? {}
            : { [TABLE_GLOBAL_CONFIG_KEY as symbol]: globals },
      },
    })
    await flushPromises()
    expect(finalColumns(wrapper).map(column => column.width)).toEqual([
      50,
      width,
    ])
    expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('auto')
  }
)

test('explicit widths, maximums and fixed column bounds retain their native metadata', async () => {
  const cellProps = () => ({ title: 'custom business cell' })
  const columns: TableColumn[] = [
    { type: 'index', width: 46, maxWidth: 56 },
    {
      key: 'name',
      title: 'Name',
      width: 90,
      minWidth: 70,
      maxWidth: 120,
      className: 'custom-business',
      cellProps,
    },
    { key: 'count', title: 'Count', minWidth: 130, maxWidth: 220 },
    { key: 'id', title: 'ID', fixed: 'left', minWidth: 140 },
    { key: 'percentage', title: 'Percentage', width: '25%', maxWidth: 400 },
    { key: 'automatic', title: 'Automatic', width: 'auto', maxWidth: 300 },
  ]
  const wrapper = mount(C_Table<DataRecord>, {
    props: { data, columns, config: baseConfig },
  })
  await flushPromises()
  const mapped = finalColumns(wrapper)
  expect(mapped[0]).toMatchObject({ width: 46, maxWidth: 56 })
  expect(mapped[1]).toMatchObject({
    width: 90,
    minWidth: 70,
    maxWidth: 120,
    className: 'custom-business',
    cellProps,
  })
  expect(mapped[2]).toMatchObject({ width: 180, minWidth: 130, maxWidth: 220 })
  expect(mapped[3]).toMatchObject({ width: 180, minWidth: 140, fixed: 'left' })
  expect(mapped[4]).toMatchObject({ width: '25%', maxWidth: 400 })
  expect(mapped[5]).toMatchObject({ width: 'auto', maxWidth: 300 })
  expect(columns[2].width).toBeUndefined()
  expect(columns[3].width).toBeUndefined()
})

test.each(['table-layout', 'tableLayout'])(
  'an explicit %s=auto overrides the natural fixed layout default',
  async attribute => {
    const wrapper = mount(C_Table<DataRecord>, {
      attrs: { [attribute]: 'auto' },
      props: {
        data,
        columns: [{ type: 'index' }, { key: 'name', title: 'Name' }],
        config: baseConfig,
      },
    })
    await flushPromises()
    expect(finalColumns(wrapper)[1].width).toBeUndefined()
    expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('auto')
  }
)

test('fixed table scrolling counts the preferred minimum of a naturally flexible business column', async () => {
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      data,
      columns: [
        { type: 'index', fixed: 'left' },
        { key: 'name', title: 'Name', minWidth: 260 },
        { key: 'count', title: 'Count', width: 90 },
      ],
      config: baseConfig,
    },
  })
  await flushPromises()
  expect(finalColumns(wrapper).map(column => column.width)).toEqual([
    50,
    undefined,
    90,
  ])
  expect(finalColumns(wrapper)[1].minWidth).toBe(260)
  expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(400)
})

test('reactive width policy changes retain rendering metadata and never mutate the consumer columns', async () => {
  const cellProps = () => ({ title: 'reactive metadata' })
  const render = vi.fn((row: DataRecord) => h('mark', String(row.name)))
  const columns: TableColumn[] = [
    { type: 'index', className: 'custom-index', maxWidth: 60 },
    {
      key: 'name',
      title: 'Name',
      minWidth: 96,
      align: 'left',
      titleAlign: 'right',
      className: 'custom-name',
      cellProps,
      render,
    },
  ]
  const wrapper = mount(C_Table<DataRecord>, {
    props: { data, columns, config: baseConfig },
  })
  await flushPromises()
  expect(finalColumns(wrapper)[1].width).toBeUndefined()
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('fixed')
  await wrapper.setProps({
    config: { ...baseConfig, display: { columnWidth: 180 } },
  })
  expect(finalColumns(wrapper)[1].width).toBe(180)
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('auto')
  await wrapper.setProps({ config: baseConfig })
  const restored = finalColumns(wrapper)
  expect(restored[1]).toMatchObject({
    width: undefined,
    minWidth: 96,
    align: 'left',
    titleAlign: 'right',
    className: 'custom-name',
    cellProps,
  })
  expect(restored[0]).toMatchObject({ width: 50, maxWidth: 60 })
  expect(restored[0].className).toContain('custom-index')
  expect(wrapper.get('mark').text()).toBe('Alice')
  expect(wrapper.getComponent(NDataTable).props('tableLayout')).toBe('fixed')
  expect(columns[1].width).toBeUndefined()
  expect(columns[1].minWidth).toBe(96)
  expect(wrapper.emitted('column-change')).toBeUndefined()
  expect(wrapper.emitted('update:data')).toBeUndefined()
})
