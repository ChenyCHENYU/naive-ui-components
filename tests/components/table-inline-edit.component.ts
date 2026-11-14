/** 常显输入复用真实表格和编辑控件；模型即时发布，不创建保存/取消草稿。 */
import { expect, test, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, KeepAlive, nextTick, shallowRef, ref } from 'vue'
import { NInput, NInputNumber, NDataTable } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import type {
  NormalTableColumn,
  TableColumn,
} from '../../src/components/C_Table/types'
import type { TableConfig } from '../../src/components/C_Table/composables/useTableConfig'

interface Row {
  id: string | number
  name: string
  quantity: number | null
  locked?: boolean
  children?: Row[]
}
const columns: TableColumn<Row>[] = [
  { key: 'name', title: '名称', editType: 'input', sorter: 'default' },
  { key: 'quantity', title: '数量', editType: 'number' },
]
const initial = (): Row[] => [
  { id: 0, name: 'A', quantity: 1 },
  { id: '0', name: 'B', quantity: 2 },
]
const harness = (cols = columns, overrides: TableConfig<Row> = {}) => {
  const rows = shallowRef(initial())
  const schema = shallowRef(cols)
  const config = shallowRef<TableConfig<Row>>({
    edit: 'inline',
    pagination: false,
    toolbar: { show: false },
    ...overrides,
  })
  const shown = ref(true)
  const Page = defineComponent({
    setup: () => () =>
      h(C_Table<Row>, {
        data: rows.value,
        columns: schema.value,
        config: config.value,
        'onUpdate:data': (value: Row[]) => {
          rows.value = value
        },
      }),
  })
  const Host = defineComponent({
    setup: () => () =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Page) : null) }),
  })
  return { rows, schema, config, shown, wrapper: mount(Host) }
}

test('inline renders every editable cell and merges same-tick updates without save actions or source mutation', async () => {
  const save = vi.fn()
  const { rows, wrapper } = harness(columns, {
    edit: { mode: 'inline', onSave: save },
  })
  const original = rows.value
  const names = wrapper
    .findAllComponents(NInput)
    .filter(input => input.props('placeholder') === '请输入名称')
  expect(names).toHaveLength(2)
  expect(wrapper.findAllComponents(NInputNumber)).toHaveLength(2)
  expect(wrapper.text()).not.toContain('操作')
  names[0].vm.$emit('update:value', '0.01000')
  wrapper.findAllComponents(NInputNumber)[0].vm.$emit('update:value', 0)
  names[1].vm.$emit('update:value', 'ND')
  wrapper.findAllComponents(NInputNumber)[1].vm.$emit('update:value', null)
  await nextTick()
  expect(rows.value).toEqual([
    { id: 0, name: '0.01000', quantity: 0 },
    { id: '0', name: 'ND', quantity: null },
  ])
  expect(original).toEqual(initial())
  expect(save).not.toHaveBeenCalled()
  expect(wrapper.getComponent(C_Table).emitted('save')).toBeUndefined()
  expect(wrapper.find('.cell-action-save').exists()).toBe(false)
  wrapper.unmount()
})

test('sorted inline cells retain source row identity and source-index permissions', async () => {
  const { rows, wrapper } = harness([
    {
      key: 'name',
      title: '名称',
      sorter: 'default',
      editable: (_row, index) => index === 1,
    },
  ])
  wrapper.getComponent(NDataTable).vm.$emit('update:sorter', {
    columnKey: 'name',
    order: 'descend',
    sorter: 'default',
  })
  await nextTick()
  expect(wrapper.findAllComponents(NInput)).toHaveLength(1)
  expect(wrapper.getComponent(NInput).props('value')).toBe('B')
  wrapper.getComponent(NInput).vm.$emit('update:value', 'sorted')
  await nextTick()
  expect(rows.value.map(row => row.name)).toEqual(['A', 'sorted'])
  wrapper.unmount()
})

test('inline custom render callbacks cannot bypass disabled, readonly or current row permission', async () => {
  const updates: Array<(value: unknown) => void> = []
  const cols: NormalTableColumn<Row>[] = [
    {
      key: 'name',
      title: '名称',
      editable: row => !row.locked,
      editProps: { disabled: true },
      editRender: (value, _row, _index, context) => {
        updates.push(context.onUpdate)
        return h('span', String(value))
      },
    },
  ]
  const { rows, schema, wrapper } = harness(cols)
  updates[0]('blocked')
  expect(rows.value[0].name).toBe('A')
  schema.value = [{ ...cols[0], editProps: { readonly: true } }]
  await nextTick()
  updates.at(-2)!('readonly')
  expect(rows.value[0].name).toBe('A')
  schema.value = [{ ...cols[0], editProps: {} }]
  await nextTick()
  const write = updates.at(-2)!
  rows.value[0].locked = true
  write('locked')
  expect(rows.value[0].name).toBe('A')
  wrapper.unmount()
})

test('external source replacement, removal and column removal reject retained inline callbacks', async () => {
  const updates: Array<(value: unknown) => void> = []
  const cols: TableColumn<Row>[] = [
    {
      key: 'name',
      title: '名称',
      editRender: (value, _row, _index, { onUpdate }) => {
        updates.push(onUpdate)
        return h('span', String(value))
      },
    },
  ]
  const { rows, schema, wrapper } = harness(cols)
  const old = updates[0]
  rows.value = [{ id: 0, name: 'replacement', quantity: null }]
  await nextTick()
  old('late')
  expect(rows.value[0].name).toBe('replacement')
  const removed = updates.at(-1)!
  const row = rows.value[0]
  rows.value = []
  await nextTick()
  rows.value = [row]
  await nextTick()
  removed('resurrected')
  expect(rows.value[0].name).toBe('replacement')
  const hidden = updates.at(-1)!
  schema.value = []
  await nextTick()
  hidden('removed-column')
  expect(rows.value[0].name).toBe('replacement')
  wrapper.unmount()
})

test('same-tick permission changes guard later fields against the current working model', async () => {
  const updates = new Map<string, (value: unknown) => void>()
  const capture =
    (field: string): NormalTableColumn<Row>['editRender'] =>
    (value, row, _index, { onUpdate }) => {
      if (row.id === 0) updates.set(field, onUpdate)
      return h('span', String(value))
    }
  const { rows, wrapper } = harness([
    { key: 'locked', title: '锁定', editRender: capture('locked') },
    {
      key: 'name',
      title: '名称',
      editable: row => !row.locked,
      editRender: capture('name'),
    },
  ])
  updates.get('locked')!(true)
  updates.get('name')!('must-not-write')
  await nextTick()
  expect(rows.value[0]).toEqual({ id: 0, name: 'A', quantity: 1, locked: true })
  wrapper.unmount()
})

test.each(['child-first', 'parent-first'] as const)(
  'tree inline updates retain both branches in one tick (%s)',
  async order => {
    const updates = new Map<string | number, (value: unknown) => void>()
    const { rows, wrapper } = harness(
      [
        {
          key: 'name',
          title: '名称',
          editRender: (value, row, _index, { onUpdate }) => {
            updates.set(row.id, onUpdate)
            return h('span', String(value))
          },
        },
      ],
      { tree: { defaultExpandAll: true } }
    )
    rows.value = [
      {
        id: 0,
        name: 'parent',
        quantity: 1,
        children: [{ id: 'child', name: 'child', quantity: 2 }],
      },
    ]
    await nextTick()
    if (order === 'child-first') {
      updates.get('child')!('updated-child')
      updates.get(0)!('updated-parent')
    } else {
      updates.get(0)!('updated-parent')
      updates.get('child')!('updated-child')
    }
    await nextTick()
    expect(rows.value[0].name).toBe('updated-parent')
    expect(rows.value[0].children?.[0].name).toBe('updated-child')
    wrapper.unmount()
  }
)

test('explicit business edit callbacks remain visible in inline mode', async () => {
  const edit = vi.fn()
  const { wrapper } = harness(columns, { actions: { edit } })
  await wrapper.get('button[aria-label="编辑"]').trigger('click')
  expect(edit).toHaveBeenCalledOnce()
  expect(wrapper.find('.cell-action-save').exists()).toBe(false)
  wrapper.unmount()
})

test('inline does not keep an unacknowledged model as a hidden draft after the tick', async () => {
  const rows = initial()
  const wrapper = mount(C_Table<Row>, {
    props: {
      data: rows,
      columns,
      config: { edit: 'inline', pagination: false, toolbar: { show: false } },
    },
  })
  const name = wrapper
    .findAllComponents(NInput)
    .find(input => input.props('placeholder') === '请输入名称')!
  name.vm.$emit('update:value', 'ignored-by-parent')
  await nextTick()
  wrapper.findAllComponents(NInputNumber)[0].vm.$emit('update:value', 0)
  expect(wrapper.emitted('update:data')?.at(-1)?.[0]).toEqual([
    { id: 0, name: 'A', quantity: 0 },
    rows[1],
  ])
  expect(rows).toEqual(initial())
  wrapper.unmount()
})

test('cached inline pages reject old callbacks after reactivation and accept fresh edits', async () => {
  const updates: Array<(value: unknown) => void> = []
  const { rows, shown, wrapper } = harness([
    {
      key: 'name',
      title: '名称',
      editRender: (value, _row, _index, { onUpdate }) => {
        updates.push(onUpdate)
        return h('span', String(value))
      },
    },
  ])
  const old = updates[0]
  shown.value = false
  await nextTick()
  old('inactive')
  shown.value = true
  await nextTick()
  old('old-session')
  expect(rows.value[0].name).toBe('A')
  updates.at(-2)!('fresh')
  await nextTick()
  expect(rows.value[0].name).toBe('fresh')
  const disposed = updates.at(-2)!
  wrapper.unmount()
  disposed('unmounted')
  expect(rows.value[0].name).toBe('fresh')
})

test('inline keeps explicit business actions and switches back to save/cancel cell editing', async () => {
  const { config, rows, wrapper } = harness(columns, {
    actions: { render: () => h('button', '业务处理') },
  })
  expect(wrapper.text()).toContain('业务处理')
  const stale = wrapper.getComponent(NInput).props('onUpdate:value')
  config.value = { ...config.value, edit: 'cell' }
  await nextTick()
  expect(wrapper.findAllComponents(NInput)).toHaveLength(0)
  if (typeof stale === 'function')
    Reflect.apply(stale, undefined, ['old-inline'])
  expect(rows.value[0].name).toBe('A')
  await wrapper.find('.cell-edit-icon').trigger('click')
  expect(wrapper.find('.cell-action-save').exists()).toBe(true)
  wrapper.unmount()
})
