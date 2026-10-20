import { describe, expect, test } from 'bun:test'
import { computed, effectScope, h, nextTick, ref, type VNode } from 'vue'
import type { DataRecord } from '../src/components/C_Table/types'
import { useRowEdit } from '../src/components/C_Table/composables/useRowEdit'
import { useCellEdit } from '../src/components/C_Table/composables/useCellEdit'
import { useTableManager } from '../src/components/C_Table/composables/useTableManager'
import { useCrossPageSelection } from '../src/components/C_Table/composables/useCrossPageSelection'
import { useTableExpand } from '../src/components/C_Table/composables/useTableExpand'
import { useDynamicRows } from '../src/components/C_Table/composables/useDynamicRow'
import { useTableColumns } from '../src/components/C_Table/composables/useTableColumns'
import { useTableActions } from '../src/components/C_Table/composables/useTableActions'
import {
  resolveConfig,
  createEditModeChecker,
} from '../src/components/C_Table/composables/useTableConfig'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { resolve, promise }
}
const noFeedback = {
  success: () => undefined,
  warning: () => undefined,
  error: () => undefined,
}

describe('C_Table save transactions', () => {
  test('locks row identity and payload during validation and prevents duplicate saves', async () => {
    const validation = deferred<void>()
    const saves: DataRecord[] = []
    const source = [
      { id: 1, name: 'first' },
      { id: 2, name: 'second' },
    ]
    const stable = useRowEdit({
      data: () => source,
      rowKey: row => row.id as number,
      columns: () => [
        {
          key: 'name',
          title: 'Name',
          editProps: { rules: [{ asyncValidator: () => validation.promise }] },
        },
      ],
      onSave: row => {
        saves.push(row)
      },
    })
    stable.startEditRow(1)
    const first = stable.saveEditRow()
    const second = stable.saveEditRow()
    expect(stable.isSaving.value).toBe(true)
    expect(stable.startEditRow(2)).toBe(false)
    stable.updateEditingRowData(1, 'name', 'late mutation')
    validation.resolve()
    await Promise.all([first, second])
    expect(saves).toEqual([{ id: 1, name: 'first' }])
    expect(stable.isSaving.value).toBe(false)
  })

  test('cell validation owns its session and a refreshed row cancels the stale save', async () => {
    const validation = deferred<void>()
    let source: DataRecord[] = [{ id: 1, name: 'first' }]
    let calls = 0
    const editor = useCellEdit({
      data: () => source,
      rowKey: row => row.id as number,
      columns: () => [
        {
          key: 'name',
          title: 'Name',
          editProps: { rules: [{ asyncValidator: () => validation.promise }] },
        },
      ],
      onSave: () => {
        calls++
      },
    })
    editor.startEditCell(1, 'name')
    const save = editor.saveEditCell()
    expect(editor.startEditCell(1, 'name')).toBe(false)
    source = [{ id: 1, name: 'server refresh' }]
    validation.resolve()
    await save
    expect(calls).toBe(0)
    expect(editor.getEditingCellValue(1, 'name')).toBe('first')
  })

  test('an async save cannot restore a dataset replaced by a search response', async () => {
    const scope = effectScope()
    const request = deferred<void>()
    const data = ref<DataRecord[]>([{ id: 1, name: 'old' }])
    const updates: DataRecord[][] = []
    const manager = scope.run(() =>
      useTableManager({
        data: () => data.value,
        rowKey: row => row.id as number,
        config: computed(() =>
          resolveConfig({
            edit: { mode: 'row', onSave: () => request.promise },
          })
        ),
        emit: (event, payload) => {
          if (event === 'update:data') updates.push(payload)
        },
      })
    )!
    const saving = manager.eventHandlers.onSave({ id: 1, name: 'edited' }, 0)
    data.value = [{ id: 99, name: 'new query' }]
    request.resolve()
    await saving
    expect(updates).toEqual([])
    expect(data.value[0].id).toBe(99)
    scope.stop()
  })

  test('tree child editing patches the child and keeps siblings intact', async () => {
    const scope = effectScope()
    const data = ref<DataRecord[]>([
      {
        id: 1,
        children: [
          { id: 2, name: 'child' },
          { id: 3, name: 'sibling' },
        ],
      },
    ])
    let update: DataRecord[] = []
    const manager = scope.run(() =>
      useTableManager({
        data: () => data.value,
        rowKey: row => row.id as number,
        config: computed(() =>
          resolveConfig({ tree: true, edit: { mode: 'row' } })
        ),
        emit: (event, payload) => {
          if (event === 'update:data') update = payload
        },
      })
    )!
    manager.stateManager.edit.start(2)
    manager.editStates.rowEdit.updateEditingRowData(2, 'name', 'changed')
    await manager.stateManager.edit.save()
    expect(update[0].children).toEqual([
      { id: 2, name: 'changed' },
      { id: 3, name: 'sibling' },
    ])
    expect((data.value[0].children as DataRecord[])[0].name).toBe('child')
    scope.stop()
  })
})

describe('C_Table one selection owner', () => {
  test('remote selection keeps keys and visited row snapshots across page changes', async () => {
    const scope = effectScope()
    const data = ref([{ id: 1, name: 'first' }])
    const events: number[][] = []
    const selection = scope.run(() =>
      useCrossPageSelection({
        allData: data,
        rowKey: row => row.id,
        remote: true,
        config: ref({ enabled: true }),
        onSelectionChange: keys => events.push(keys as number[]),
      })
    )!
    selection.handlePageSelectionChange([1], data.value)
    data.value = [{ id: 2, name: 'second' }]
    await nextTick()
    selection.handlePageSelectionChange([2], data.value)
    expect([...selection.selectedKeys.value]).toEqual([1, 2])
    expect(selection.getSelectedRows().map(row => row.name)).toEqual([
      'first',
      'second',
    ])
    expect(events).toEqual([[1], [1, 2]])
    selection.clearAll()
    expect(selection.getSelectedRows()).toEqual([])
    scope.stop()
  })

  test('disabled cross-page selection never scans rows on data changes', async () => {
    const scope = effectScope()
    let keyCalls = 0
    const data = ref([{ id: 1 }])
    scope.run(() =>
      useCrossPageSelection({
        allData: data,
        rowKey: row => {
          keyCalls++
          return row.id
        },
        config: undefined,
      })
    )
    data.value = [{ id: 2 }, { id: 3 }]
    await nextTick()
    expect(keyCalls).toBe(0)
    scope.stop()
  })

  test('tree selection accepts descendants and emits one transition', async () => {
    const events: number[][] = []
    const selection = useTableExpand({
      data: ref([{ id: 1, children: [{ id: 2 }] }]),
      rowKey: row => row.id,
      childrenKey: 'children',
      enableSelection: true,
      onSelectionChange: keys => events.push(keys as number[]),
    })
    selection.handleSelectionChange([2])
    await nextTick()
    expect(selection.checkedKeys.value).toEqual([2])
    expect(events).toEqual([[2]])
    selection.handleSelectionChange([2])
    expect(events).toHaveLength(1)
  })
})

describe('C_Table expansion lifecycle', () => {
  test('failed expansion stays failed until explicit retry and invalidates refreshed rows', async () => {
    const scope = effectScope()
    const data = ref([{ id: 1, version: 'old' }])
    let calls = 0
    let fail = true
    const expanded = scope.run(() =>
      useTableExpand({
        data,
        rowKey: row => row.id,
        onLoadData: async row => {
          calls++
          if (fail) throw new Error('offline')
          return [{ version: row.version }]
        },
      })
    )!
    await expanded.expandRow(1)
    const column = expanded.getTableColumns([{ type: 'expand' }])[0] as {
      renderExpand: (row: (typeof data.value)[0]) => VNode
    }
    expect(expanded.errorMap.value.has(1)).toBe(true)
    column.renderExpand(data.value[0])
    column.renderExpand(data.value[0])
    await nextTick()
    expect(calls).toBe(1)
    fail = false
    await expanded.retryExpand(1)
    expect(expanded.expandDataMap.value.get(1)).toEqual([{ version: 'old' }])
    data.value = [{ id: 1, version: 'new' }]
    await nextTick()
    await Promise.resolve()
    expect(expanded.expandDataMap.value.get(1)).toEqual([{ version: 'new' }])
    expect(calls).toBe(3)
    scope.stop()
  })

  test('invalidated and disposed requests cannot repopulate stale caches', async () => {
    const scope = effectScope()
    const response = deferred<DataRecord[]>()
    const expanded = scope.run(() =>
      useTableExpand({
        data: ref([{ id: 1 }]),
        rowKey: row => row.id,
        onLoadData: () => response.promise,
      })
    )!
    const pending = expanded.expandRow(1)
    scope.stop()
    response.resolve([{ id: 'stale' }])
    await pending
    expect(expanded.expandDataMap.value.size).toBe(0)
    expect(expanded.loadingMap.value.size).toBe(0)
  })
})

describe('C_Table renderer and dynamic row contracts', () => {
  test('custom editors receive actual row/index and preserve null clearing', () => {
    const seen: unknown[][] = []
    let updated: unknown
    const config = computed(() => resolveConfig({ edit: { mode: 'cell' } }))
    const column = {
      key: 'name',
      title: 'Name',
      render: () => h('span', 'display'),
      editRender: (
        value: unknown,
        row: object,
        index: number,
        context: { onUpdate: (value: unknown) => void }
      ) => {
        seen.push([value, row, index])
        context.onUpdate(null)
        return h('input', { value })
      },
    }
    const manager = {
      editStates: {
        cellEdit: {
          isEditingCell: () => true,
          getEditingCellValue: () => null,
          updateEditingCellValue: (
            _key: unknown,
            _field: string,
            value: unknown
          ) => {
            updated = value
          },
          saveEditCell: async () => undefined,
          cancelEditCell: () => undefined,
          startEditCell: () => undefined,
        },
        rowEdit: {
          isEditingRow: () => false,
          getEditingRowData: () => undefined,
          updateEditingRowData: () => undefined,
        },
      },
    }
    const columns = useTableColumns({
      rawColumns: computed(() => [column]),
      config,
      columnWidth: 180,
      rowKey: row => row.id as number,
      tableManager: manager,
      actionsRenderer: () => null,
      editModeChecker: computed(() => createEditModeChecker(config.value)),
      showActionsColumn: computed(() => false),
    })
    const row = { id: 8, name: 'old' }
    const render = columns.computedColumns.value[0] as {
      render: (row: DataRecord, index: number) => VNode
    }
    render.render(row, 7)
    expect(seen).toEqual([[null, row, 7]])
    expect(updated).toBeNull()
  })

  test('dynamic rows inherit the main key and deep-copy nested source data', () => {
    const scope = effectScope()
    let changed: DataRecord[] = []
    const source = ref<DataRecord[]>([
      { uuid: 'one', meta: { name: 'original' } },
    ])
    const manager = scope.run(() =>
      useTableManager({
        data: () => source.value,
        rowKey: row => row.uuid as string,
        rowKeyField: 'uuid',
        config: computed(() =>
          resolveConfig({ dynamicRows: true, feedback: noFeedback })
        ),
        emit: (event, payload) => {
          if (event === 'update:data') changed = payload
        },
      })
    )!
    manager.stateManager.dynamicRows.add()
    expect(typeof changed[1].uuid).toBe('string')
    const dynamic = scope.run(() =>
      useDynamicRows(source, {
        rowKey: 'uuid',
        feedback: noFeedback,
        onRowChange: rows => {
          changed = rows
        },
      })
    )!
    dynamic.selectRow('one')
    dynamic.copyRow()
    ;(changed[1].meta as DataRecord).name = 'copied'
    expect((source.value[0].meta as DataRecord).name).toBe('original')
    scope.stop()
  })
})

describe('C_Table row action locks', () => {
  test('delete locks during confirmation and releases after failure for a retry', async () => {
    const confirmation = deferred<boolean>()
    let confirms = 0
    let calls = 0
    let errors = 0
    const actions = useTableActions({
      actions: computed(() => ({
        delete: async () => {
          calls++
          throw new Error('offline')
        },
      })),
      config: ref({
        editable: false,
        editMode: 'none',
        feedback: {
          confirm: () => {
            confirms++
            return confirmation.promise
          },
          error: () => {
            errors++
          },
        },
      }),
      tableManager: {
        editStates: {
          modalEdit: { startEdit: () => undefined },
          rowEdit: {
            isEditingRow: () => false,
            startEditRow: () => undefined,
            cancelEditRow: () => undefined,
            saveEditRow: async () => undefined,
          },
        },
      },
      rowKey: row => row.id as number,
    })
    const vnode = actions.renderActions({ id: 1 }, 0) as VNode
    const button = (vnode.children as { default: () => VNode[] }).default()[0]
    button.props!.onClick()
    button.props!.onClick()
    expect(confirms).toBe(1)
    confirmation.resolve(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(calls).toBe(1)
    expect(errors).toBe(1)
    button.props!.onClick()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(calls).toBe(2)
  })
})

test('C_Table does not execute a confirmation that resolves after its scope is disposed', async () => {
  const scope = effectScope()
  const confirmation = deferred<boolean>()
  let calls = 0
  const actions = scope.run(() =>
    useTableActions({
      actions: computed(() => ({
        delete: async () => {
          calls++
        },
      })),
      config: ref({
        editable: false,
        editMode: 'none',
        feedback: { confirm: () => confirmation.promise },
      }),
      tableManager: {
        editStates: {
          modalEdit: { startEdit: () => undefined },
          rowEdit: {
            isEditingRow: () => false,
            startEditRow: () => undefined,
            cancelEditRow: () => undefined,
            saveEditRow: async () => undefined,
          },
        },
      },
      rowKey: row => row.id as number,
    })
  )!
  const vnode = actions.renderActions({ id: 1 }, 0) as VNode
  ;(vnode.children as { default: () => VNode[] }).default()[0].props!.onClick()
  scope.stop()
  confirmation.resolve(true)
  await new Promise(resolve => setTimeout(resolve, 0))
  expect(calls).toBe(0)
})

test.each(['row', 'cell'] as const)(
  '%s edit failures report once and disposed validation stays silent',
  async mode => {
    const scope = effectScope()
    const messages: string[] = []
    const validation = deferred<void>()
    const data = [{ id: 1, name: '' }]
    const manager = scope.run(() =>
      useTableManager({
        data: () => data,
        rowKey: row => row.id as number,
        columns: () => [{ key: 'name', title: '姓名', required: true }],
        config: computed(() =>
          resolveConfig({
            edit: mode,
            feedback: { error: message => messages.push(message) },
          })
        ),
        emit: () => undefined,
      })
    )!
    manager.stateManager.edit.start(1, mode === 'cell' ? 'name' : undefined)
    await manager.stateManager.edit.save()
    await nextTick()
    expect(messages).toEqual(['姓名不能为空'])
    scope.stop()

    const pendingScope = effectScope()
    const pending = pendingScope.run(() =>
      useTableManager({
        data: () => [{ id: 1, name: 'before' }],
        rowKey: row => row.id as number,
        columns: () => [
          {
            key: 'name',
            title: '姓名',
            editProps: {
              rules: [{ asyncValidator: () => validation.promise }],
            },
          },
        ],
        config: computed(() =>
          resolveConfig({
            edit: mode,
            feedback: { error: message => messages.push(message) },
          })
        ),
        emit: () => undefined,
      })
    )!
    pending.stateManager.edit.start(1, mode === 'cell' ? 'name' : undefined)
    const save = pending.stateManager.edit.save()
    pendingScope.stop()
    validation.resolve()
    await save
    expect(messages).toHaveLength(1)
  }
)
