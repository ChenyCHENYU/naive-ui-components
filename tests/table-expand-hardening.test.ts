import { expect, test } from 'bun:test'
import { effectScope, nextTick, ref, type VNode } from 'vue'
import { useTableExpand } from '../src/components/C_Table/composables/useTableExpand'
import type { UseTableExpandReturn } from '../src/components/C_Table/types'

type Row = { id: number; disabled?: boolean }
const deferred = () => {
  let resolve!: (rows: Row[]) => void
  const promise = new Promise<Row[]>(accept => {
    resolve = accept
  })
  return { promise, resolve }
}
const childTable = (state: UseTableExpandReturn<Row, Row>, parent: Row) => {
  const column = state.getTableColumns([{ type: 'expand' }])[0] as {
    renderExpand: (row: Row) => VNode
  }
  const view = column.renderExpand(parent)
  const table = (view.children as VNode[])[1]
  return table.props as {
    columns: Array<{ type?: string; disabled?: (row: Row) => boolean }>
    onUpdateCheckedRowKeys: (keys: number[]) => void
  }
}

test('pending expandAll cannot restore removed keys after dataset refresh', async () => {
  const scope = effectScope()
  const rows = ref<Row[]>([{ id: 1 }])
  const load = deferred()
  const events: unknown[] = []
  const state = scope.run(() =>
    useTableExpand<Row, Row>({
      data: rows,
      rowKey: row => row.id,
      onLoadData: () => load.promise,
      onExpandChange: keys => events.push([...keys]),
    })
  )!
  const pending = state.expandAll()
  rows.value = [{ id: 2 }]
  await nextTick()
  expect(state.expandedKeys.value).toEqual([])
  load.resolve([{ id: 101 }])
  await pending
  expect(state.expandedKeys.value).toEqual([])
  expect(state.expandDataMap.value.size).toBe(0)
  expect(events).toEqual([])
  scope.stop()
})

test('unmount invalidates pending batch expansion and its completion event', async () => {
  const scope = effectScope()
  const load = deferred()
  const events: unknown[] = []
  const state = scope.run(() =>
    useTableExpand<Row, Row>({
      data: ref([{ id: 1 }]),
      rowKey: row => row.id,
      onLoadData: () => load.promise,
      onExpandChange: keys => events.push(keys),
    })
  )!
  const pending = state.expandAll()
  scope.stop()
  load.resolve([{ id: 101 }])
  await pending
  expect(state.expandDataMap.value.size).toBe(0)
  expect(events).toEqual([])
})

test('child selection filters invalid, disabled and duplicate keys and respects parent maximum', async () => {
  const scope = effectScope()
  const selection: { keys: unknown[]; children: unknown[] }[] = []
  const childEvents: unknown[] = []
  const state = scope.run(() =>
    useTableExpand<Row, Row>({
      data: ref([{ id: 1 }, { id: 2 }]),
      rowKey: row => row.id,
      childRowKey: row => row.id,
      enableSelection: true,
      maxSelection: 1,
      enableChildSelection: true,
      enableParentChildLink: true,
      parentChildLinkMode: 'loose',
      childRowCheckable: row => !row.disabled,
      onLoadData: () => [{ id: 101 }, { id: 102, disabled: true }],
      onSelectionChange: (keys, _rows, children) =>
        selection.push({
          keys: [...keys],
          children: [...(children?.get(1) ?? [])],
        }),
      onChildSelectionChange: (_key, keys) => childEvents.push([...keys]),
    })
  )!
  state.handleSelectionChange([2])
  await state.expandRow(1)
  const table = childTable(state, { id: 1 })
  expect(table.columns[0].disabled?.({ id: 102, disabled: true })).toBe(true)
  expect(table.columns[0].disabled?.({ id: 101 })).toBe(false)
  table.onUpdateCheckedRowKeys([101, 102, 101, 999])
  expect(state.childSelections.value.get(1)).toEqual([101])
  expect(state.checkedKeys.value).toEqual([2])
  expect(childEvents).toEqual([[101]])
  expect(selection.at(-1)).toEqual({ keys: [2], children: [101] })
  state.clearAllSelections()
  expect(selection.at(-1)).toEqual({ keys: [], children: [] })
  state.handleSelectionChange([2])
  expect(selection.at(-1)).toEqual({ keys: [2], children: [] })
  scope.stop()
})

test.each([false, true])(
  'strict linkage counts selectable children; parent disabled=%s',
  async disabled => {
    const scope = effectScope()
    const events: unknown[] = []
    const state = scope.run(() =>
      useTableExpand<Row, Row>({
        data: ref([{ id: 1, disabled }]),
        rowKey: row => row.id,
        childRowKey: row => row.id,
        enableSelection: true,
        enableChildSelection: true,
        enableParentChildLink: true,
        parentChildLinkMode: 'strict',
        rowCheckable: row => !row.disabled,
        childRowCheckable: row => !row.disabled,
        onLoadData: () => [{ id: 101 }, { id: 102, disabled: true }],
        onSelectionChange: keys => events.push([...keys]),
      })
    )!
    await state.expandRow(1)
    const table = childTable(state, { id: 1 })
    table.onUpdateCheckedRowKeys([101])
    expect(state.checkedKeys.value).toEqual(disabled ? [] : [1])
    expect(events.at(-1)).toEqual(disabled ? [] : [1])
    table.onUpdateCheckedRowKeys([])
    expect(state.checkedKeys.value).toEqual([])
    expect(events.at(-1)).toEqual([])
    scope.stop()
  }
)
