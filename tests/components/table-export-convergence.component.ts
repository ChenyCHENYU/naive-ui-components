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
      config?: ExportConfig,
      canDownload?: () => boolean
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

  test.each(['source', 'page', 'selected'] as const)(
    '%s request owns its starting schema, nested formatter, and file configuration across a report switch',
    async scope => {
      let resolveRequest!: (data: DataRecord[]) => void
      const formatter = { currency: { prefix: 'Report A ', precision: 1 } }
      const columns: TableColumn<Row>[] = [
        {
          type: 'group',
          title: 'Report A',
          children: [
            {
              key: 'id',
              title: 'Amount A',
              formatter: { type: 'currency', config: { suffix: ' A' } },
            },
          ],
        },
      ]
      const config = {
        scope,
        filename: 'report-a',
        format: 'csv' as const,
        columnKeys: ['id'],
        requestData: () =>
          new Promise<DataRecord[]>(resolve => {
            resolveRequest = resolve
          }),
      }
      const wrapper = mount(C_Table<Row>, {
        props: {
          data: rows,
          columns,
          config: {
            toolbar: { show: false },
            pagination: false,
            persistKey: 'report-a',
            export: config,
            formatterConfig: formatter,
          },
        },
      })
      const api = wrapper.vm as unknown as TableInstance<Row>
      const pending = api.exportData()
      config.columnKeys[0] = 'name'
      formatter.currency.prefix = 'Mutated '
      if (columns[0].type === 'group') {
        columns[0].children[0].title = 'Mutated'
        columns[0].children[0].formatter!.config!.suffix = ' Mutated'
      }
      await wrapper.setProps({
        columns: [{ key: 'name', title: 'Report B' }],
        config: {
          toolbar: { show: false },
          pagination: false,
          persistKey: 'report-b',
          export: { scope, filename: 'report-b', columnKeys: ['name'] },
          formatterConfig: { currency: { prefix: 'Report B ' } },
        },
      })
      resolveRequest([{ id: 99, name: 'A result' }])
      await pending
      const [exportRows, exportColumns, exportConfig] =
        exporter.run.mock.calls[0]
      expect(exportRows).toEqual([{ id: 99, name: 'A result' }])
      expect(exportColumns).toEqual([
        {
          type: 'group',
          title: 'Report A',
          children: [
            {
              key: 'id',
              title: 'Amount A',
              formatter: { type: 'currency', config: { suffix: ' A' } },
            },
          ],
        },
      ])
      expect(exportConfig).toMatchObject({
        scope,
        filename: 'report-a',
        format: 'csv',
        columnKeys: ['id'],
        formatterConfig: {
          currency: { prefix: 'Report A ', precision: 1 },
        },
      })
      await api.exportData()
      expect(exporter.run.mock.calls[1][1]).toEqual([
        { key: 'name', title: 'Report B' },
      ])
      expect(exporter.run.mock.calls[1][2]?.filename).toBe('report-b')
    }
  )

  test('unmount prevents a pending server result from starting a download', async () => {
    let resolveRequest!: (data: DataRecord[]) => void
    const requestData = vi.fn(
      () =>
        new Promise<DataRecord[]>(resolve => {
          resolveRequest = resolve
        })
    )
    const { wrapper, api } = mountExport({ requestData })
    const pending = api.exportData()
    wrapper.unmount()
    resolveRequest([{ id: 99 }])
    await pending
    expect(exporter.run).not.toHaveBeenCalled()
    await api.exportData()
    expect(requestData).toHaveBeenCalledTimes(1)
  })

  test('unmount revokes download ownership already handed to a lazy exporter', async () => {
    let finishDownload!: () => void
    const downloading = new Promise<void>(resolve => {
      finishDownload = resolve
    })
    exporter.run.mockImplementationOnce(() => downloading)
    const { wrapper, api } = mountExport({ format: 'xlsx' })
    const pending = api.exportData()
    const canDownload = exporter.run.mock.calls[0][3]!
    expect(canDownload()).toBe(true)
    wrapper.unmount()
    expect(canDownload()).toBe(false)
    finishDownload()
    await pending
  })

  test.each(['request', 'download'] as const)(
    '%s failure rejects to the caller and unlocks a successful retry',
    async failureAt => {
      const failure = new Error(`${failureAt} failed`)
      const request = vi.fn<() => Promise<DataRecord[]>>()
      if (failureAt === 'request') request.mockRejectedValueOnce(failure)
      else exporter.run.mockRejectedValueOnce(failure)
      request.mockResolvedValue([{ id: 99 }])
      const { api } = mountExport({ requestData: request })
      await expect(api.exportData()).rejects.toBe(failure)
      await api.exportData()
      expect(request).toHaveBeenCalledTimes(2)
      expect(exporter.run).toHaveBeenCalledTimes(
        failureAt === 'request' ? 1 : 2
      )
    }
  )
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

test.each(['cell', 'modal'] as const)(
  'formatted table date keeps business strings in %s mode',
  async mode => {
    const data = [{ id: 1, dueAt: '2026-01-01' }]
    const onSave = vi.fn()
    const wrapper = mount(C_Table<(typeof data)[number]>, {
      props: {
        data,
        columns: [
          {
            key: 'dueAt',
            title: 'Due date',
            editType: 'date',
            editProps: { valueMode: 'formatted', valueFormat: 'yyyy-MM-dd' },
          },
        ],
        config: {
          toolbar: { show: false },
          pagination: false,
          edit: { mode, onSave },
        },
      },
    })
    const api = wrapper.vm as unknown as TableInstance<(typeof data)[number]>
    api.startEdit(1, mode === 'cell' ? 'dueAt' : undefined)
    dateChunk.resolve()
    await vi.waitFor(() =>
      expect(wrapper.findComponent(NDatePicker).exists()).toBe(true)
    )
    const picker = wrapper.getComponent(NDatePicker)
    expect(picker.props('value')).toBeUndefined()
    expect(picker.props('formattedValue')).toBe('2026-01-01')
    picker.vm.$emit('update:formattedValue', '2026-01-02', Date.UTC(2026, 0, 2))
    await flushPromises()
    await api.saveEdit()
    expect(onSave.mock.calls[0][0].dueAt).toBe('2026-01-02')
    expect(data[0].dueAt).toBe('2026-01-01')
    wrapper.unmount()
  }
)
