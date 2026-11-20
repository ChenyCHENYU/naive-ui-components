import { expect, test } from 'bun:test'
import { createLocalDataPickerSource } from '../src/components/C_DataPicker/localSource'

const rows = [
  { id: 0, code: 0, name: '钢卷 A' },
  { id: 1, code: '0', name: '钢卷 B' },
  { id: 2, code: 'M02', name: '铁板' },
]

test('本地选择器先筛选再分页，批量回显保留业务编码类型', async () => {
  const source = createLocalDataPickerSource({
    rows,
    rowKey: 'id',
    value: row => row.code,
    label: row => row.name,
    searchText: row => `${row.code} ${row.name}`,
  })
  const { signal } = new AbortController()
  const page = await source.request({
    page: 2,
    pageSize: 1,
    search: ' 钢卷 ',
    signal,
  })
  expect(page).toEqual({ rows: [rows[1]], total: 2 })
  expect(
    await source.request({ page: 1, pageSize: 3, search: 'm02', signal })
  ).toEqual({ rows: [rows[2]], total: 1 })
  expect(await source.resolve?.([0, '0'], signal)).toEqual(rows.slice(0, 2))
  expect(await source.resolve?.(['0'], signal)).toEqual([rows[1]])
  await expect(
    source.request({
      page: 1,
      pageSize: 1,
      search: '',
      signal: AbortSignal.abort(),
    })
  ).rejects.toThrow()
})
