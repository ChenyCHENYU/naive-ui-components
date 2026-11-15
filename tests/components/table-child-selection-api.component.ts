import { afterEach, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { effectScope, reactive, type EffectScope } from 'vue'
import { useTableManager } from '../../src/components/C_Table/composables/useTableManager'
import C_Table from '../../src/components/C_Table/index.vue'

const scopes: EffectScope[] = []
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()))

async function fixture() {
  const scope = effectScope()
  scopes.push(scope)
  const events: unknown[][] = []
  const config = reactive({
    editable: false,
    editMode: 'row',
    showRowActions: false,
    modalTitle: '',
    modalWidth: 500,
    expandable: true,
    enableSelection: true,
    enableChildSelection: true,
    enableParentChildLink: true,
    parentChildLinkMode: 'loose' as const,
    maxSelection: 1,
    childRowCheckable: (row: { disabled?: boolean }) => !row.disabled,
    onLoadExpandData: () => [{ id: 101 }, { id: 102, disabled: true }],
  })
  const rows = [{ id: 1 }, { id: 2 }]
  const manager = scope.run(() =>
    useTableManager({
      config,
      data: () => rows,
      rowKey: row => Number(row.id),
      emit: (...args) => events.push(args),
    })
  )!
  await manager.expandState.expandRow(1)
  events.length = 0
  return { ...manager, config, events }
}

test('public child selection shares eligibility, parent linkage and complete event rows', async () => {
  const table = await fixture()
  const api = table.stateManager.childSelection
  api.selectAll(1)
  expect(table.expandState.childSelections.value.get(1)).toEqual([101])
  expect(table.checkedKeys.value).toEqual([1])
  expect(
    table.events.filter(event => event[0] === 'child-selection-change')
  ).toEqual([['child-selection-change', 1, [101], [{ id: 101 }]]])
  const eventCount = table.events.length
  api.select(1, 101)
  api.selectAll(1)
  expect(table.events).toHaveLength(eventCount)
  api.unselect(1, 101)
  expect(table.checkedKeys.value).toEqual([])
  expect(api.getSelected(1)).toEqual([])
  api.select(1, 101)
  expect(table.events.at(-1)).toEqual([
    'child-selection-change',
    1,
    [101],
    [{ id: 101 }],
  ])
  api.clear(1)
  expect(table.checkedKeys.value).toEqual([])
  expect(table.events.at(-1)).toEqual(['child-selection-change', 1, [], []])
})

test('public child methods reject unknown and disabled keys and honor the feature gate', async () => {
  const table = await fixture()
  const api = table.stateManager.childSelection
  api.select(999, 101)
  api.select(1, 999)
  api.select(1, 102)
  api.unselect(999, 101)
  api.selectAll(999)
  api.clear(999)
  expect([...table.expandState.childSelections.value]).toEqual([[1, []]])
  expect(table.events).toEqual([])
  table.config.enableChildSelection = false
  api.select(1, 101)
  api.selectAll(1)
  expect([...table.expandState.childSelections.value]).toEqual([[1, []]])
  expect(table.events).toEqual([])
})

test('public child selection preserves parent maximum while notifying the changed child snapshot', async () => {
  const table = await fixture()
  table.expandState.handleSelectionChange([2])
  table.events.length = 0
  table.stateManager.childSelection.selectAll(1)
  expect(table.checkedKeys.value).toEqual([2])
  const selection = table.events.find(event => event[0] === 'selection-change')
  expect(selection?.[1]).toEqual([2])
  expect(selection?.[3]).toEqual(new Map([[1, [101]]]))
  expect(table.stateManager.childSelection.getSelected(1)).toEqual([
    { id: 101 },
  ])
})

test('the mounted table exposes the same child selection contract', async () => {
  type Row = { id: number; disabled?: boolean }
  const wrapper = mount(C_Table<Row, Row>, {
    props: {
      data: [{ id: 1 }],
      columns: [{ type: 'expand' }, { key: 'id', title: 'ID' }],
      config: {
        toolbar: { show: false },
        pagination: false,
        expand: {
          onLoadData: () => [{ id: 101 }, { id: 102, disabled: true }],
        },
        selection: {
          enabled: true,
          childSelection: {
            enabled: true,
            childRowCheckable: row => !row.disabled,
          },
          parentChildLink: { enabled: true, mode: 'loose' },
        },
      },
    },
  })
  await wrapper.vm.expandRow(1)
  await flushPromises()
  wrapper.vm.selectAllChildren(1)
  expect(wrapper.vm.getChildSelectedRows(1)).toEqual([{ id: 101 }])
  expect(wrapper.emitted('child-selection-change')).toEqual([
    [1, [101], [{ id: 101 }]],
  ])
  expect(wrapper.emitted('selection-change')?.at(-1)?.[0]).toEqual([1])
})
