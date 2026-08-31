import { describe, expect, test } from 'bun:test'
import { computed, effectScope, nextTick, ref } from 'vue'
import { useCellEdit } from '../src/components/C_Table/composables/useCellEdit'
import { useCrossPageSelection } from '../src/components/C_Table/composables/useCrossPageSelection'
import { useModalEdit } from '../src/components/C_Table/composables/useModalEdit'
import { usePagination } from '../src/components/C_Table/composables/usePagination'
import { useRowEdit } from '../src/components/C_Table/composables/useRowEdit'
import type {
  DataRecord,
  PaginationConfig,
  TableColumn,
} from '../src/components/C_Table/types'

const rows = (count: number): DataRecord[] =>
  Array.from({ length: count }, (_, id) => ({ id, name: `row-${id}` }))

describe('C_Table pagination', () => {
  test('paginates local data without snapping user state back', async () => {
    const data = ref(rows(5))
    const config = ref<PaginationConfig | null>({
      enabled: true,
      page: 1,
      pageSize: 2,
    })
    const events: Array<[number, number]> = []
    const scope = effectScope()
    const pagination = scope.run(() =>
      usePagination({
        data,
        config,
        emit: (_event, page, pageSize) => events.push([page, pageSize]),
      })
    )!

    expect(pagination.paginatedData.value.map(row => row.id)).toEqual([0, 1])
    pagination.handlePageChange(2)
    await nextTick()
    expect(pagination.currentPage.value).toBe(2)
    expect(pagination.paginatedData.value.map(row => row.id)).toEqual([2, 3])
    expect(events).toEqual([[2, 2]])

    config.value = { ...config.value!, page: 3 }
    await nextTick()
    expect(pagination.paginatedData.value.map(row => row.id)).toEqual([4])
    scope.stop()
  })

  test('keeps remote page data intact and uses the server total', () => {
    const data = ref(rows(2))
    const scope = effectScope()
    const pagination = scope.run(() =>
      usePagination({
        data,
        config: computed(() => ({
          enabled: true,
          remote: true,
          page: 2,
          pageSize: 2,
          total: 20,
        })),
      })
    )!

    expect(pagination.paginatedData.value).toHaveLength(2)
    expect(pagination.paginationConfig.value?.itemCount).toBe(20)
    expect(pagination.getTotalPages()).toBe(10)
    scope.stop()
  })

  test('clamps an invalid page after local data shrinks', async () => {
    const data = ref(rows(5))
    const events: Array<[number, number]> = []
    const scope = effectScope()
    const pagination = scope.run(() =>
      usePagination({
        data,
        config: ref({ enabled: true, page: 3, pageSize: 2 }),
        emit: (_event, page, pageSize) => events.push([page, pageSize]),
      })
    )!

    data.value = rows(1)
    await nextTick()
    expect(pagination.currentPage.value).toBe(1)
    expect(events.at(-1)).toEqual([1, 2])
    scope.stop()
  })
})

describe('C_Table editing', () => {
  test('row editing supports key 0 and preserves structured values', async () => {
    const source = [
      {
        id: 0,
        name: 'before',
        createdAt: new Date('2026-08-31T00:00:00.000Z'),
        meta: { active: true },
      },
    ]
    const saves: DataRecord[] = []
    const editor = useRowEdit({
      data: () => source,
      rowKey: row => row.id as number,
      onSave: row => saves.push(row),
    })

    expect(editor.startEditRow(0)).toBe(true)
    const editing = editor.getEditingRowData(0)!
    expect(editing.createdAt).toEqual(source[0].createdAt)
    expect(editing.createdAt).not.toBe(source[0].createdAt)
    ;(editing.meta as { active: boolean }).active = false
    expect(source[0].meta.active).toBe(true)

    editor.updateEditingRowData(0, 'name', 'after')
    await editor.saveEditRow()
    expect(saves[0].name).toBe('after')
    expect(editor.editingRowKey.value).toBeNull()
  })

  test('row validation handles callback errors and keeps invalid edit state', async () => {
    const source = [{ id: 0, name: 'before' }]
    const columns: TableColumn[] = [
      {
        key: 'name',
        title: '名称',
        editProps: {
          rules: [
            {
              validator: (_rule, value, callback) => {
                if (value === 'invalid') callback(new Error('名称不可用'))
              },
            },
          ],
        },
      },
    ]
    const editor = useRowEdit({
      data: () => source,
      rowKey: row => row.id as number,
      columns: () => columns,
    })

    editor.startEditRow(0)
    editor.updateEditingRowData(0, 'name', 'invalid')
    expect(await editor.validateRow()).toBe(false)
    expect(editor.validationErrors.value).toEqual([
      { field: 'name', message: '名称不可用' },
    ])
    expect(editor.editingRowKey.value).toBe(0)
  })

  test('cell editing supports key 0 and collision-safe cache keys', async () => {
    const source = [{ id: 0, 'a-b': 'before' }]
    let saved: DataRecord | undefined
    const editor = useCellEdit({
      data: () => source,
      rowKey: row => row.id as number,
      onSave: row => {
        saved = row
      },
    })

    expect(editor.startEditCell(0, 'a-b')).toBe(true)
    editor.updateEditingCellValue(0, 'a-b', 'after')
    await editor.saveEditCell()
    expect(saved?.['a-b']).toBe('after')
    expect(editor.editingCell.value.rowKey).toBeNull()
  })

  test('modal editing retains data after a failed save and supports key 0', async () => {
    const source = [
      { id: 0, date: new Date('2026-08-31T00:00:00.000Z'), name: 'before' },
    ]
    let shouldFail = true
    const editor = useModalEdit({
      data: () => source,
      rowKey: row => row.id,
      onSave: async () => {
        if (shouldFail) throw new Error('network')
      },
    })

    expect(editor.startEdit(0)).toBe(true)
    expect(editor.editingRowIndex.value).toBe(0)
    expect(editor.editingData.value.date).toEqual(source[0].date)
    await expect(editor.saveEdit()).rejects.toThrow('network')
    expect(editor.isModalVisible.value).toBe(true)
    expect(editor.editingRowKey.value).toBe(0)

    shouldFail = false
    await editor.saveEdit()
    expect(editor.isModalVisible.value).toBe(false)
    expect(editor.editingRowKey.value).toBeNull()
  })
})

describe('C_Table cross-page selection', () => {
  test('reacts to enable and max-selection changes', async () => {
    const config = ref({ enabled: true, maxSelection: 3 })
    const scope = effectScope()
    const selection = scope.run(() =>
      useCrossPageSelection({
        allData: ref(rows(5)),
        rowKey: row => row.id as number,
        config,
      })
    )!

    selection.selectAll()
    expect([...selection.selectedKeys.value]).toEqual([0, 1, 2])
    selection.unselect(1)
    expect(selection.select(3)).toBe(true)
    expect([...selection.selectedKeys.value]).toEqual([0, 2, 3])
    expect(selection.select(4)).toBe(false)
    config.value.maxSelection = 1
    await nextTick()
    expect([...selection.selectedKeys.value]).toEqual([0])
    config.value.enabled = false
    await nextTick()
    expect(selection.selectedCount.value).toBe(0)
    scope.stop()
  })
})
