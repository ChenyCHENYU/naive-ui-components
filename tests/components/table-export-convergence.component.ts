import { describe, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NDataTable, NDatePicker, NPagination } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  DataRecord,
  TableColumn,
  TableInstance,
} from '../../src/components/C_Table/types'
import type { ExportConfig } from '../../src/components/C_Table/composables/useTableExport'

const exporter = vi.hoisted(() => ({
  run: vi.fn<
    (
      rows: DataRecord[],
      columns: TableColumn[],
      config?: ExportConfig
    ) => Promise<void>
  >(() => Promise.resolve()),
}))
vi.mock('../../src/components/C_Table/composables/useTableExport', () => ({
  exportTableData: exporter.run,
}))

const dateChunk = vi.hoisted(() => {
  let resolve!: () => void
  const ready = new Promise<void>(complete => {
    resolve = complete
  })
  return { ready, resolve: () => resolve() }
})
vi.mock('../../src/internal/naive-fields/date-picker', async importOriginal => {
  await dateChunk.ready
  return importOriginal()
})

interface Row {
  id: number
  name: string
}

const rows: Row[] = [
  { id: 4, name: 'Four' },
  { id: 3, name: 'Three' },
  { id: 2, name: 'Two' },
  { id: 1, name: 'One' },
]

function mountExport(config: ExportConfig) {
  const wrapper = mount(C_Table<Row>, {
    props: {
      data: rows,
      columns: [
        { type: 'selection' },
        {
          key: 'id',
          title: 'ID',
          sorter: 'default',
          defaultSortOrder: 'ascend',
        },
        { key: 'name', title: 'Name' },
      ],
      config: {
        toolbar: { show: false },
        pagination: { page: 1, pageSize: 2 },
        selection: true,
        crossPageSelection: true,
        export: config,
      },
    },
  })
  const api = wrapper.vm as unknown as TableInstance<Row>
  return { wrapper, api }
}

describe('table export scope and asynchronous ownership', () => {
  test.each([
    ['page', [1, 2]],
    ['selected', [1, 4]],
    ['source', [4, 3, 2, 1]],
  ] as const)(
    'exports the %s scope through the real page and selection state',
    async (scope, expected) => {
      const { wrapper, api } = mountExport({ scope })
      await flushPromises()
      expect(
        wrapper
          .getComponent(NDataTable)
          .vm.getCurrentPageData()
          .map(row => row.id)
      ).toEqual([1, 2])
      if (scope === 'selected') {
        await wrapper.findAll('.n-checkbox')[1].trigger('click')
        wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
        await flushPromises()
        await wrapper.findAll('.n-checkbox')[2].trigger('click')
        expect(api.getSelectedRows().map(row => row.id)).toEqual([1, 4])
      }
      await api.exportData()
      expect(exporter.run.mock.calls.at(-1)![0].map(row => row.id)).toEqual(
        expected
      )
      if (scope === 'page') {
        wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
        await flushPromises()
        await api.exportData()
        expect(exporter.run.mock.calls.at(-1)![0].map(row => row.id)).toEqual([
          3, 4,
        ])
      }
      expect(rows.map(row => row.id)).toEqual([4, 3, 2, 1])
    }
  )

  test('requestData overrides local scope and locks the full request/download cycle', async () => {
    let resolveRequest!: (data: DataRecord[]) => void
    let finishDownload!: () => void
    const serverRows = [{ id: 99, name: 'Server result' }]
    const request = vi.fn(
      () =>
        new Promise<DataRecord[]>(resolve => {
          resolveRequest = resolve
        })
    )
    const downloading = new Promise<void>(resolve => {
      finishDownload = resolve
    })
    exporter.run.mockImplementationOnce(() => downloading)
    const { api } = mountExport({ scope: 'selected', requestData: request })
    expect(request).not.toHaveBeenCalled()
    expect(api.getSelectedRows()).toEqual([])
    const pending = api.exportData()
    await api.exportData()
    expect(request).toHaveBeenCalledTimes(1)
    expect(exporter.run).not.toHaveBeenCalled()

    resolveRequest(serverRows)
    await flushPromises()
    expect(exporter.run).toHaveBeenCalledTimes(1)
    expect(exporter.run.mock.calls[0][0]).toBe(serverRows)
    await api.exportData()
    expect(request).toHaveBeenCalledTimes(1)
    expect(exporter.run).toHaveBeenCalledTimes(1)
    finishDownload()
    await pending

    request.mockResolvedValueOnce(serverRows)
    await api.exportData()
    expect(request).toHaveBeenCalledTimes(2)
    expect(exporter.run).toHaveBeenCalledTimes(2)
  })
})

test('a cold date editor loads the actual Naive picker and saves its updated value', async () => {
  const original = Date.UTC(2026, 0, 1)
  const updated = Date.UTC(2026, 0, 2)
  const data = [{ id: 1, dueAt: original }]
  const onSave = vi.fn()
  const wrapper = mount(C_Table<(typeof data)[number]>, {
    props: {
      data,
      columns: [{ key: 'dueAt', title: 'Due date', editType: 'date' }],
      config: {
        toolbar: { show: false },
        pagination: false,
        edit: { mode: 'cell', onSave },
      },
    },
  })
  const api = wrapper.vm as unknown as TableInstance<(typeof data)[number]>
  expect(wrapper.findComponent(NDatePicker).exists()).toBe(false)
  api.startEdit(1, 'dueAt')
  await flushPromises()
  expect(wrapper.findComponent(NDatePicker).exists()).toBe(false)
  dateChunk.resolve()
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NDatePicker).exists()).toBe(true)
  )
  const picker = wrapper.getComponent(NDatePicker)
  expect(picker.props('value')).toBe(original)
  picker.vm.$emit('update:value', updated)
  await flushPromises()
  expect(picker.props('value')).toBe(updated)
  await api.saveEdit()
  expect(onSave).toHaveBeenCalledTimes(1)
  expect(onSave.mock.calls[0][0].dueAt).toBe(updated)
  expect(
    (wrapper.emitted('update:data')!.at(-1)![0] as typeof data)[0].dueAt
  ).toBe(updated)
  expect(data[0].dueAt).toBe(original)
})
