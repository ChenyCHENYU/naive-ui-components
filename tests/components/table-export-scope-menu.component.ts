import { flushPromises, mount } from '@vue/test-utils'
import { NDropdown, NPagination } from 'naive-ui'
import { describe, expect, test, vi } from 'vitest'
import C_Table from '../../src/components/C_Table/index.vue'
import type { ExportConfig, TableInstance } from '../../src/components/C_Table'

const download = vi.hoisted(() =>
  vi.fn<(...args: unknown[]) => Promise<void>>()
)
vi.mock(
  '../../src/components/C_Table/composables/useTableExport',
  async importOriginal => ({
    ...(await importOriginal<object>()),
    exportTableData: download,
  })
)

const rows = [
  { id: 3, name: 'Three', group: 'A' },
  { id: 2, name: 'Two', group: 'B' },
  { id: 1, name: 'One', group: 'A' },
]

function mountTable(config: ExportConfig, remote = false) {
  const wrapper = mount(C_Table<(typeof rows)[number]>, {
    props: {
      data: rows,
      remote,
      columns: [
        { type: 'selection' },
        { key: 'name', title: 'Name' },
        {
          key: 'group',
          title: 'Group',
          filter: 'default',
          defaultFilterOptionValues: ['A'],
        },
        {
          key: 'id',
          title: 'ID',
          sorter: 'default',
          defaultSortOrder: 'ascend',
        },
        { key: '_internal', title: 'Internal' },
      ],
      config: {
        pagination: { pageSize: 1, remote, total: 3 },
        export: config,
      },
    },
  })
  return {
    wrapper,
    api: wrapper.vm as unknown as TableInstance<(typeof rows)[number]>,
  }
}

describe('explicit table export scopes', () => {
  test('offers real scopes in order and exports local matching rows before pagination', async () => {
    const { wrapper, api } = mountTable({
      scopes: ['page', 'selected', 'matching'],
    })
    await vi.dynamicImportSettled()
    const menu = wrapper.getComponent(NDropdown)
    expect(menu.props('options')).toEqual([
      { key: 'page', label: '导出本页', disabled: false },
      { key: 'selected', label: '导出已选行', disabled: true },
      { key: 'matching', label: '导出全部匹配结果', disabled: false },
    ])
    menu.vm.$emit('select', 'matching')
    await flushPromises()
    expect(download.mock.lastCall?.[0]).toEqual([rows[2], rows[0]])
    await api.exportData('page')
    expect(download.mock.lastCall?.[0]).toEqual([rows[2]])

    wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
    await flushPromises()
    await api.exportData('page')
    expect(download.mock.lastCall?.[0]).toEqual([rows[0]])
  })

  test('never offers or executes all matching for a remote page without an explicit source', async () => {
    const { wrapper, api } = mountTable({ scopes: ['page', 'matching'] }, true)
    await vi.dynamicImportSettled()
    expect(wrapper.getComponent(NDropdown).props('options')).toEqual([
      { key: 'page', label: '导出本页', disabled: false },
    ])
    await api.exportData('matching')
    expect(download).not.toHaveBeenCalled()
  })

  test('only uses requestData for exact matching and preserves the old no-arg precedence', async () => {
    const remoteRows = [{ id: 15, name: 'Fifteen', group: 'A' }]
    const requestData = vi.fn(async () => remoteRows)
    const { api } = mountTable(
      { scope: 'page', scopes: ['page', 'matching'], requestData },
      true
    )
    await api.exportData('page')
    expect(download.mock.lastCall?.[0]).toEqual(rows)
    expect(requestData).not.toHaveBeenCalled()
    await api.exportData('matching')
    expect(download.mock.lastCall?.[0]).toEqual(remoteRows)
    await api.exportData()
    expect(requestData).toHaveBeenCalledTimes(2)
  })

  test('hands the initial matching schema to the host and keeps its task locked until settlement', async () => {
    let finish!: () => void
    const host = vi.fn<NonNullable<ExportConfig['onExportMatching']>>(
      () =>
        new Promise<void>(resolve => {
          finish = resolve
        })
    )
    const { wrapper, api } = mountTable(
      {
        scopes: ['matching'],
        onExportMatching: host,
        format: 'xlsx',
        filename: 'report',
      },
      true
    )
    const pending = api.exportData('matching')
    await api.exportData('matching')
    await wrapper.setProps({ columns: [{ key: 'group', title: 'New Group' }] })
    expect(host).toHaveBeenCalledExactlyOnceWith({
      columns: [
        { key: 'name', title: 'Name' },
        { key: 'group', title: 'Group' },
        { key: 'id', title: 'ID' },
      ],
      filename: 'report',
      format: 'xlsx',
    })
    finish()
    await pending
    expect(download).not.toHaveBeenCalled()
    host.mockResolvedValueOnce(undefined)
    await api.exportData('matching')
    expect(host.mock.lastCall?.[0].columns).toEqual([
      { key: 'group', title: 'New Group' },
    ])
  })
})
