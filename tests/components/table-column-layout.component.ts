import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
import { NDataTable } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

const data = [{ id: 1, name: 'Alice' }]
const baseConfig = { toolbar: { show: false }, pagination: false as const }
const finalColumns = (wrapper: VueWrapper) =>
  wrapper.getComponent(NDataTable).props('columns') as unknown as Record<
    string,
    unknown
  >[]

describe('table column layout contracts', () => {
  test('uses compact auxiliary defaults independently of the business column default', async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data,
        columns: [
          { type: 'selection' },
          { type: 'expand', renderExpand: row => h('div', String(row.name)) },
          { type: 'index' },
          { key: 'name', title: 'Name' },
        ],
        config: {
          ...baseConfig,
          selection: true,
          display: { columnWidth: 240 },
        },
      },
    })
    await flushPromises()
    const columns = finalColumns(wrapper)
    expect(columns.map(column => column.width)).toEqual([40, 40, 50, 240])
    expect(columns[2].className).toContain('c-table-index-column')
  })

  test('preserves explicit native auxiliary metadata and a native expand renderer', async () => {
    const cellProps = () => ({ title: 'Native auxiliary cell' })
    const renderExpand = vi.fn(() => h('p', 'Native expanded content'))
    const columns: TableColumn[] = [
      {
        type: 'selection',
        width: 32,
        minWidth: 28,
        maxWidth: 44,
        className: 'custom-selection',
        fixed: 'left',
        cellProps,
      },
      {
        type: 'expand',
        width: '36px',
        minWidth: 30,
        maxWidth: 48,
        className: 'custom-expand',
        fixed: 'left',
        cellProps,
        renderExpand,
      },
      {
        type: 'index',
        title: '',
        width: 38,
        minWidth: 34,
        maxWidth: 46,
        className: 'custom-index',
        fixed: 'left',
        align: 'right',
        titleAlign: 'left',
        cellProps,
      },
      { key: 'name', title: 'Name' },
    ]
    const wrapper = mount(C_Table<DataRecord>, {
      props: { data, columns, config: { ...baseConfig, selection: true } },
    })
    await flushPromises()
    const result = finalColumns(wrapper)
    for (const index of [0, 1, 2]) {
      expect(result[index]).toMatchObject({
        width: columns[index].width,
        minWidth: columns[index].minWidth,
        maxWidth: columns[index].maxWidth,
        fixed: 'left',
        cellProps,
      })
      expect(result[index].className).toContain(columns[index].className)
    }
    expect(result[1].renderExpand).toBe(renderExpand)
    expect(result[2]).toMatchObject({
      title: '',
      align: 'right',
      titleAlign: 'left',
    })
    wrapper.getComponent(NDataTable).vm.$emit('update:expanded-row-keys', [1])
    await flushPromises()
    expect(wrapper.text()).toContain('Native expanded content')
    expect(renderExpand).toHaveBeenCalled()
  })

  test('configuration injects selection/expansion behavior while retaining native metadata', async () => {
    const cellProps = () => ({ title: 'Configured auxiliary cell' })
    const disabled = (row: DataRecord) => row.id === 2
    const expandable = (row: DataRecord) => row.id !== 2
    const nativeRenderExpand = vi.fn(() => h('div', 'Native-only content'))
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
        columns: [
          {
            type: 'selection',
            width: 34,
            minWidth: 30,
            maxWidth: 42,
            className: 'configured-selection',
            fixed: 'left',
            cellProps,
            multiple: false,
            disabled,
          },
          {
            type: 'expand',
            width: 36,
            minWidth: 32,
            maxWidth: 44,
            className: 'configured-expand',
            fixed: 'left',
            cellProps,
            expandable,
            renderExpand: nativeRenderExpand,
          },
          { key: 'id', title: 'ID', width: 50 },
        ],
        config: {
          ...baseConfig,
          selection: { rowCheckable: row => row.id !== 3 },
          expand: {
            rowExpandable: row => row.id !== 3,
            onLoadData: () => [{ detail: 'loaded' }],
            renderContent: row => h('div', `Details ${row.id}`),
          },
        },
      },
    })
    await flushPromises()
    const [selection, expand] = finalColumns(wrapper)
    expect(selection).toMatchObject({
      width: 34,
      minWidth: 30,
      maxWidth: 42,
      className: 'configured-selection',
      fixed: 'left',
      cellProps,
      multiple: false,
    })
    expect(expand).toMatchObject({
      width: 36,
      minWidth: 32,
      maxWidth: 44,
      className: 'configured-expand',
      fixed: 'left',
      cellProps,
    })
    const checkDisabled = selection.disabled as typeof disabled
    const canExpand = expand.expandable as typeof expandable
    expect(expand.renderExpand).not.toBe(nativeRenderExpand)
    expect([1, 2, 3].map(id => checkDisabled({ id }))).toEqual([
      false,
      true,
      true,
    ])
    expect([1, 2, 3].map(id => canExpand({ id }))).toEqual([true, false, false])
    wrapper.getComponent(NDataTable).vm.$emit('update:expanded-row-keys', [1])
    await flushPromises()
    expect(wrapper.text()).toContain('Details 1')
    expect(wrapper.text()).not.toContain('Native-only content')
    expect(nativeRenderExpand).not.toHaveBeenCalled()
  })

  test('protects resizable header text while retaining declared action-column sizing', async () => {
    const cellProps = () => ({ title: 'Custom actions' })
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data,
        columns: [
          {
            key: 'id',
            title: 'ID',
            width: 28,
            resizable: true,
            minWidth: 0,
            maxWidth: 56,
          },
          {
            key: '_actions',
            title: 'Operations',
            width: 96,
            minWidth: 84,
            maxWidth: 112,
            className: 'custom-actions',
            fixed: 'right',
            cellProps,
          },
        ],
        config: { ...baseConfig, actions: { detail: () => undefined } },
      },
    })
    await flushPromises()
    const columns = finalColumns(wrapper)
    expect(columns[0]).toMatchObject({ width: 28, minWidth: 42, maxWidth: 56 })
    const actions = columns.find(column => column.key === '_actions')!
    expect(actions).toMatchObject({
      width: 96,
      minWidth: 84,
      maxWidth: 112,
      fixed: 'right',
      cellProps,
    })
    expect(actions.className).toContain('custom-actions')
    expect(actions.className).toContain('c-table-actions-column')
    await wrapper.setProps({
      columns: wrapper
        .props('columns')!
        .map(column =>
          column.key === '_actions' ? { ...column, width: 104 } : column
        ),
    })
    await flushPromises()
    expect(
      finalColumns(wrapper).find(column => column.key === '_actions')
    ).toMatchObject({
      width: 104,
      minWidth: 84,
      maxWidth: 112,
      cellProps,
    })
  })

  test('reacts to display columnWidth and explicit scrollX updates without remounting', async () => {
    const columns: TableColumn[] = [
      { type: 'index' },
      { key: 'id', title: 'ID', fixed: 'left' },
      { key: 'name', title: 'Name', width: 72 },
    ]
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data,
        columns,
        config: { ...baseConfig, display: { columnWidth: 120, scrollX: 600 } },
      },
    })
    await flushPromises()
    expect(finalColumns(wrapper).map(column => column.width)).toEqual([
      50, 120, 72,
    ])
    expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(600)
    await wrapper.setProps({
      config: { ...baseConfig, display: { columnWidth: 88, scrollX: '60vw' } },
    })
    await flushPromises()
    expect(finalColumns(wrapper).map(column => column.width)).toEqual([
      50, 88, 72,
    ])
    expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe('60vw')
    await wrapper.setProps({
      config: { ...baseConfig, display: { columnWidth: 88 } },
    })
    await flushPromises()
    expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(210)
  })

  test('automatic scrolling sums only final visible auxiliary, ordinary and action columns', async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data,
        columns: [
          { type: 'selection', fixed: 'left' },
          { type: 'expand', renderExpand: row => h('div', String(row.name)) },
          { type: 'index' },
          { key: 'id', title: 'ID', width: 64 },
          { key: 'name', title: 'Name', width: '88px' },
          { key: 'hidden', title: 'Hidden', visible: false, width: 1_000 },
        ],
        config: {
          ...baseConfig,
          selection: true,
          actions: { detail: () => undefined },
        },
      },
    })
    await flushPromises()
    expect(finalColumns(wrapper).map(column => column.width)).toEqual([
      40,
      40,
      50,
      64,
      '88px',
      180,
    ])
    expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(462)
  })

  test('automatic scrolling includes dynamically injected radio selection columns', async () => {
    const wrapper = mount(C_Table<DataRecord>, {
      props: {
        data,
        columns: [{ key: 'name', title: 'Name', width: 100, fixed: 'left' }],
        config: {
          ...baseConfig,
          dynamicRows: { enablePrint: false },
        },
      },
    })
    await flushPromises()
    expect(finalColumns(wrapper).map(column => column.key)).toEqual([
      '_radio_selection',
      'name',
    ])
    expect(wrapper.getComponent(NDataTable).props('scrollX')).toBe(180)
  })
})
