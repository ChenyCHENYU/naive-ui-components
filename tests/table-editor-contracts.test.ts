import { describe, expect, test } from 'bun:test'
import { computed, effectScope, ref } from 'vue'
import { useTableManager } from '../src/components/C_Table/composables/useTableManager'
import { resolveConfig } from '../src/components/C_Table/composables/useTableConfig'
import { useCellEdit } from '../src/components/C_Table/composables/useCellEdit'
import { useRowEdit } from '../src/components/C_Table/composables/useRowEdit'
import { useModalEdit } from '../src/components/C_Table/composables/useModalEdit'
import { flattenTableColumns } from '../src/components/C_Table/helpers'
import { generateFormOptions } from '../src/components/C_Table/data'
import {
  mergeColumnPreferences,
  getColumnPreferences,
} from '../src/components/C_Table/components/ColumnSettings/persistence'
import type { DataRecord, TableColumn } from '../src/components/C_Table/types'

const columns: TableColumn[] = [
  {
    type: 'group',
    title: '业务',
    children: [
      {
        key: 'qty',
        title: '数量',
        editType: 'number',
        editProps: { precision: 3 },
        editable: row => !row.locked,
        required: true,
      },
      { key: 'remark', title: '备注' },
    ],
  },
]

describe('table row editing contracts', () => {
  test('cell start, updates and save share row permission including zero row key', async () => {
    const rows = [{ id: 0, qty: 2, locked: true }]
    let calls = 0
    const hook = useCellEdit({
      data: () => rows,
      rowKey: r => Number(r.id),
      columns: () => columns,
      onSave: () => {
        calls++
      },
    })
    expect(hook.startEditCell(0, 'qty')).toBe(false)
    rows[0].locked = false
    expect(hook.startEditCell(0, 'qty')).toBe(true)
    hook.updateEditingCellValue(0, 'qty', 0)
    expect(hook.getEditingCellValue(0, 'qty')).toBe(0)
    rows[0].locked = true
    hook.updateEditingCellValue(0, 'qty', 8)
    expect(hook.getEditingCellValue(0, 'qty')).toBe(0)
    await hook.saveEditCell()
    expect(calls).toBe(0)
    expect(hook.editingCell.value.columnKey).toBe('qty')
  })

  test('row save restores newly locked fields and current non-column metadata', async () => {
    const rows: DataRecord[] = [{ id: 1, qty: 2, remark: 'old', locked: false }]
    let saved: DataRecord | undefined
    const hook = useRowEdit({
      data: () => rows,
      rowKey: r => Number(r.id),
      columns: () => columns,
      onSave: row => {
        saved = row
      },
    })
    hook.startEditRow(1)
    hook.updateEditingRowData(1, 'qty', 9)
    hook.updateEditingRowData(1, 'remark', 'new')
    rows[0].locked = true
    await hook.saveEditRow()
    expect(saved).toEqual({ id: 1, qty: 2, remark: 'new', locked: true })
  })

  test('modal save uses the same current row permission and generated form skips locked validation', async () => {
    const rows: DataRecord[] = [{ id: 1, qty: 2, remark: 'old', locked: false }]
    let saved: DataRecord | undefined
    const hook = useModalEdit({
      data: () => rows,
      rowKey: r => Number(r.id),
      columns: () => columns,
      onSave: row => {
        saved = row
      },
    })
    hook.startEdit(1)
    rows[0].locked = true
    await hook.saveEdit({ id: 1, qty: 99, remark: 'new', locked: false })
    expect(saved?.qty).toBe(2)
    expect(saved?.locked).toBe(true)
    const fields = generateFormOptions(
      columns,
      () => rows[0],
      () => rows[0]
    )
    expect(fields[0].disabled).toBe(true)
    expect(fields[0].rules).toEqual([])
    expect(fields[0].attrs?.precision).toBe(3)
  })
})

test('group column preferences update leaf visibility/order without crossing groups or mutating defaults', () => {
  const source: TableColumn[] = [
    columns[0],
    {
      type: 'group',
      title: '其它',
      children: [{ key: 'other', title: '其它' }],
    },
  ]
  const leaves = flattenTableColumns(source)
  const updates = [
    leaves[2],
    { ...leaves[1], visible: false },
    { ...leaves[0], width: 151 },
  ]
  const prefs = getColumnPreferences(source, updates)
  const merged = mergeColumnPreferences(source, prefs)
  expect(flattenTableColumns(merged).map(c => c.key)).toEqual([
    'remark',
    'qty',
    'other',
  ])
  expect(flattenTableColumns(merged, true).map(c => c.key)).toEqual([
    'qty',
    'other',
  ])
  expect(flattenTableColumns(source)[0].width).toBeUndefined()
  expect(flattenTableColumns(source)[1].visible).toBeUndefined()
})

test('modal schema does not evaluate row predicates before a row is opened', () => {
  const fields = generateFormOptions(
    [
      {
        key: 'qty',
        title: '数量',
        editable: row => (row.release as { locked: boolean }).locked === false,
      },
    ],
    () => ({}),
    () => undefined
  )
  expect(fields[0].disabled).toBe(true)
})

test('configured cell schema rejects unknown keys while legacy schema-free hooks stay usable', () => {
  const data = [{ id: 1, amount: 1, secret: 'kept' }]
  const configured = useCellEdit({
    data: () => data,
    rowKey: r => Number(r.id),
    columns: () => [{ key: 'amount', title: '金额', editable: false }],
  })
  expect(configured.startEditCell(1, 'secret')).toBe(false)
  configured.updateEditingCellValue(1, 'secret', 'changed')
  expect(data[0].secret).toBe('kept')
  const legacy = useCellEdit({ data: () => data, rowKey: r => Number(r.id) })
  expect(legacy.startEditCell(1, 'secret')).toBe(true)
})

test('removing an edited column rejects updates and saves instead of treating it as unrestricted', async () => {
  const data = [{ id: 1, amount: 1 }]
  let schema: TableColumn[] = [{ key: 'amount', title: '金额' }]
  let saves = 0
  const hook = useCellEdit({
    data: () => data,
    rowKey: r => Number(r.id),
    columns: () => schema,
    onSave: () => {
      saves++
    },
  })
  expect(hook.startEditCell(1, 'amount')).toBe(true)
  hook.updateEditingCellValue(1, 'amount', 9)
  schema = []
  hook.updateEditingCellValue(1, 'amount', 100)
  expect(hook.getEditingCellValue(1, 'amount')).toBe(9)
  await hook.saveEditCell()
  expect(saves).toBe(0)
  expect(data[0].amount).toBe(1)
})

test.each(['row', 'modal'] as const)(
  'removing a leaf column invalidates the %s draft without saving',
  async mode => {
    const scope = effectScope()
    const schema = ref<TableColumn[]>([
      {
        type: 'group',
        title: '分组',
        children: [{ key: 'amount', title: '金额' }],
      },
    ])
    const rows = [{ id: 1, amount: 2 }]
    let saves = 0
    const manager = scope.run(() =>
      useTableManager({
        data: () => rows,
        rowKey: row => Number(row.id),
        columns: () => schema.value,
        config: computed(() =>
          resolveConfig({
            edit: {
              mode,
              onSave: () => {
                saves++
              },
            },
          })
        ),
        emit: () => undefined,
      })
    )!
    manager.stateManager.edit.start(1)
    expect(manager.stateManager.edit.isEditing(1)).toBe(true)
    schema.value = [
      {
        type: 'group',
        key: 'renamed',
        title: '新标签',
        children: [
          { key: 'amount', title: '金额', width: 180 },
          { key: 'extra', title: '新增' },
        ],
      },
    ]
    expect(manager.stateManager.edit.isEditing(1)).toBe(true)
    schema.value = [{ key: 'extra', title: '新增' }]
    expect(manager.stateManager.edit.isEditing(1)).toBe(false)
    await manager.stateManager.edit.save()
    expect(saves).toBe(0)
    expect(rows[0].amount).toBe(2)
    scope.stop()
  }
)

test.each(['row', 'modal'] as const)(
  'a late %s save cannot patch rows after its column was removed',
  async mode => {
    const scope = effectScope()
    const schema = ref<TableColumn[]>([{ key: 'amount', title: '金额' }])
    const rows = [{ id: 1, amount: 2 }]
    let finish!: () => void
    let entered!: () => void
    const started = new Promise<void>(resolve => {
      entered = resolve
    })
    const request = new Promise<void>(resolve => {
      finish = resolve
    })
    const updates: unknown[] = []
    const manager = scope.run(() =>
      useTableManager({
        data: () => rows,
        rowKey: row => Number(row.id),
        columns: () => schema.value,
        config: computed(() =>
          resolveConfig({
            edit: {
              mode,
              onSave: () => {
                entered()
                return request
              },
            },
          })
        ),
        emit: (event, payload) => {
          if (event === 'update:data') updates.push(payload)
        },
      })
    )!
    manager.stateManager.edit.start(1)
    const saving = manager.stateManager.edit.save()
    await started
    schema.value = []
    finish()
    await saving
    expect(updates).toEqual([])
    expect(manager.stateManager.edit.isEditing(1)).toBe(false)
    scope.stop()
  }
)
