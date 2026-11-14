import { expect, test, vi } from 'vitest'
import { exportTableData } from '../../src/components/C_Table/composables/useTableExport'

const xlsx = vi.hoisted(() => {
  let resolve!: () => void
  const ready = new Promise<void>(done => {
    resolve = done
  })
  return {
    ready,
    resolve: () => resolve(),
    writeFile: vi.fn(),
    aoaToSheet: vi.fn(() => ({})),
  }
})
vi.mock('xlsx', async () => {
  await xlsx.ready
  return {
    utils: {
      aoa_to_sheet: xlsx.aoaToSheet,
      book_new: () => ({}),
      book_append_sheet: vi.fn(),
    },
    writeFile: xlsx.writeFile,
  }
})

test('revoked ownership during the XLSX chunk load prevents file generation and a fresh owner can export', async () => {
  let active = true
  const pending = exportTableData(
    [{ name: 'Old report' }],
    [{ key: 'name', title: 'Name' }],
    { format: 'xlsx', filename: 'old-report' },
    () => active
  )
  active = false
  xlsx.resolve()
  await pending
  expect(xlsx.aoaToSheet).not.toHaveBeenCalled()
  expect(xlsx.writeFile).not.toHaveBeenCalled()

  await exportTableData(
    [{ name: 'New report' }],
    [{ key: 'name', title: 'Name' }],
    { format: 'xlsx', filename: 'new-report' }
  )
  expect(xlsx.aoaToSheet).toHaveBeenCalledWith([['Name'], ['New report']])
  expect(xlsx.writeFile).toHaveBeenCalledWith({}, 'new-report.xlsx')
})

test('a revoked owner cannot initiate CSV download', async () => {
  const createUrl = vi.spyOn(URL, 'createObjectURL')
  await exportTableData(
    [{ name: 'Old report' }],
    [{ key: 'name', title: 'Name' }],
    { format: 'csv' },
    () => false
  )
  expect(createUrl).not.toHaveBeenCalled()
})
