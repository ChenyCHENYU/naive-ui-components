import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { h, ref, type Ref } from 'vue'
import { NDataTable, type DataTableColumn } from 'naive-ui'
import C_Table from '../../src/components/C_Table/index.vue'
import C_Density from '../../src/components/C_Density/index.vue'
import {
  TABLE_GLOBAL_CONFIG_KEY,
  mergeGlobalConfig,
  type TableGlobalConfig,
} from '../../src/components/C_Table/composables/useTableGlobalConfig'
import * as light from '../../src/context'
import { flattenTableColumns } from '../../src/components/C_Table/helpers'
import type {
  DataRecord,
  TableColumn,
} from '../../src/components/C_Table/types'

const columns: TableColumn[] = [
  Object.freeze({ key: 'code', title: '单号' }),
  Object.freeze({ key: 'state', title: '状态' }),
  Object.freeze({ key: 'amount', title: '数量' }),
]
Object.freeze(columns)
const data = [{ id: 1, code: 'DN-001', state: '待下达', amount: 12 }]
const storedKey = (scope: string, table = 'orders') =>
  `c_table_cols_${JSON.stringify([scope, table])}`
const leaves = (wrapper: VueWrapper) =>
  flattenTableColumns(
    wrapper.getComponent(NDataTable).props('columns') as DataTableColumn[]
  )
const leaf = (wrapper: VueWrapper, key: string) =>
  leaves(wrapper).find(column => 'key' in column && column.key === key)!
const keys = (wrapper: VueWrapper) =>
  leaves(wrapper).map(column => ('key' in column ? column.key : undefined))
const resize = (wrapper: VueWrapper, width: number) => {
  const callback = wrapper
    .getComponent(NDataTable)
    .props('onUnstableColumnResize')!
  callback(
    width,
    width,
    leaf(wrapper, 'code') as Parameters<typeof callback>[2],
    () => 80
  )
}
function scoped(
  scope: Ref<string | undefined>,
  density = false,
  persist = true,
  rows = data
) {
  const globals: TableGlobalConfig = {
    get persistPrefix() {
      return scope.value
    },
  }
  const content = () =>
    h(C_Table<DataRecord>, {
      data: rows,
      columns,
      rowNumber: false,
      config: {
        toolbar: { show: true },
        pagination: false,
        ...(persist ? { persistKey: 'orders' } : {}),
        ...(rows.length > 100
          ? { virtualScroll: true, display: { maxHeight: 200 } }
          : {}),
      },
    })
  return mount(
    {
      render: () =>
        density
          ? h(C_Density, { density: 'compact' }, { default: content })
          : content(),
    },
    {
      global: { provide: { [TABLE_GLOBAL_CONFIG_KEY as symbol]: globals } },
    }
  )
}
afterEach(() => vi.useRealTimers())

test.each([false, true])(
  'pending A width commits to A and B restores defaults on the same instance, density=%s',
  async density => {
    vi.useFakeTimers()
    const scope = ref<string | undefined>('tenant-a/user-a')
    const wrapper = scoped(scope, density)
    const other = scoped(ref('tenant-a/user-b'))
    await flushPromises()
    const initial = leaf(wrapper, 'code').width
    const componentUid = wrapper.getComponent(C_Table).vm.$.uid
    const nativeUid = wrapper.getComponent(NDataTable).vm.$.uid
    await wrapper.get('.column-settings-btn').trigger('click')
    await flushPromises()
    wrapper.getComponent({ name: 'ColumnSettings' }).vm.$emit(
      'change',
      columns.map(column =>
        column.key === 'state' ? { ...column, visible: false } : column
      )
    )
    await flushPromises()
    resize(wrapper, 142)
    await flushPromises()
    expect(leaf(wrapper, 'code').width).toBe(142)
    scope.value = 'tenant-a/user-b'
    await flushPromises()
    expect(wrapper.getComponent(C_Table).vm.$.uid).toBe(componentUid)
    expect(wrapper.getComponent(NDataTable).vm.$.uid).not.toBe(nativeUid)
    expect(keys(wrapper)).toEqual(['code', 'state', 'amount'])
    expect(leaf(wrapper, 'code')).toMatchObject({
      width: initial,
      minWidth: 80,
      ellipsis: { tooltip: true },
    })
    expect(localStorage.getItem(storedKey('tenant-a/user-b'))).toBeNull()
    await vi.advanceTimersByTimeAsync(200)
    expect(localStorage.getItem(storedKey('tenant-a/user-b'))).toBeNull()
    expect(
      JSON.parse(localStorage.getItem(storedKey('tenant-a/user-a'))!).columns
    ).toContainEqual({ key: 'code', width: 142 })
    expect(keys(other)).toEqual(['code', 'state', 'amount'])
    expect(leaf(other, 'code').width).toBe(initial)
    scope.value = 'tenant-a/user-a'
    await flushPromises()
    expect(leaf(wrapper, 'code').width).toBe(142)
    expect(keys(wrapper)).toEqual(['code', 'amount'])
    expect(columns).toEqual([
      { key: 'code', title: '单号' },
      { key: 'state', title: '状态' },
      { key: 'amount', title: '数量' },
    ])
  }
)

test('same user in another tenant never reads the original or legacy table preferences', async () => {
  const seed = JSON.stringify({
    columns: [
      { key: 'code', width: 240 },
      { key: 'state', visible: false },
    ],
  })
  localStorage.setItem('c_table_cols_orders', seed)
  localStorage.setItem(storedKey('tenant-a/user-a'), seed)
  const scope = ref<string | undefined>('tenant-b/user-a')
  const wrapper = scoped(scope)
  await flushPromises()
  expect(keys(wrapper)).toEqual(['code', 'state', 'amount'])
  expect(leaf(wrapper, 'code').width).not.toBe(240)
  scope.value = 'tenant-a/user-a'
  await flushPromises()
  expect(keys(wrapper)).toEqual(['code', 'amount'])
  expect(leaf(wrapper, 'code').width).toBe(240)
})

test.each([undefined, '', '  '])(
  'an explicitly unresolved scope disables reads and writes: %j',
  async unresolved => {
    vi.useFakeTimers()
    localStorage.setItem(
      'c_table_cols_orders',
      JSON.stringify({ columns: [{ key: 'code', width: 240 }] })
    )
    const read = vi.spyOn(Storage.prototype, 'getItem')
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const scope = ref<string | undefined>(unresolved)
    const wrapper = scoped(scope)
    await flushPromises()
    const initial = leaf(wrapper, 'code').width
    expect(initial).not.toBe(240)
    resize(wrapper, 142)
    await vi.advanceTimersByTimeAsync(200)
    await flushPromises()
    expect(
      read.mock.calls.filter(([key]) => key.startsWith('c_table_cols_'))
    ).toEqual([])
    expect(
      write.mock.calls.filter(([key]) => key.startsWith('c_table_cols_'))
    ).toEqual([])
    scope.value = 'tenant-b/user-b'
    await flushPromises()
    expect(leaf(wrapper, 'code').width).toBe(initial)
  }
)

test('missing table id keeps storage disabled and still resets ephemeral A widths on B', async () => {
  vi.useFakeTimers()
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const scope = ref<string | undefined>('tenant-a/user-a')
  const wrapper = scoped(scope, false, false)
  await flushPromises()
  const initial = leaf(wrapper, 'code').width
  resize(wrapper, 142)
  await vi.advanceTimersByTimeAsync(200)
  await flushPromises()
  expect(leaf(wrapper, 'code').width).toBe(142)
  scope.value = 'tenant-b/user-b'
  await flushPromises()
  expect(leaf(wrapper, 'code').width).toBe(initial)
  expect(
    write.mock.calls.filter(([key]) => key.startsWith('c_table_cols_'))
  ).toEqual([])
})

test('no global prefix retains the legacy table key', async () => {
  localStorage.setItem(
    'c_table_cols_orders',
    JSON.stringify({ columns: [{ key: 'code', width: 240 }] })
  )
  const wrapper = mount(C_Table<DataRecord>, {
    props: {
      columns,
      rowNumber: false,
      data,
      config: { persistKey: 'orders', pagination: false },
    },
  })
  await flushPromises()
  expect(leaf(wrapper, 'code').width).toBe(240)
})

test('switching preference scopes does not rescan untouched offscreen values', async () => {
  let reads = 0
  const rows = Array.from({ length: 1000 }, (_, index) => ({
    id: index,
    code: 'DN-001',
    get state() {
      if (index === 999) reads++
      return '待下达'
    },
    amount: 12,
  }))
  const scope = ref<string | undefined>('tenant-a/user-a')
  const wrapper = scoped(scope, false, true, rows)
  await flushPromises()
  const initial = reads
  expect(initial).toBeGreaterThan(0)
  resize(wrapper, 142)
  await flushPromises()
  scope.value = 'tenant-b/user-b'
  await flushPromises()
  scope.value = 'tenant-a/user-a'
  await flushPromises()
  expect(reads).toBe(initial)
})

test('the light configuration entry and previous C_Table export share the same symbol', async () => {
  const heavy = await import('../../src/components/C_Table/index')
  expect(light.TABLE_GLOBAL_CONFIG_KEY).toBe(TABLE_GLOBAL_CONFIG_KEY)
  expect(heavy.TABLE_GLOBAL_CONFIG_KEY).toBe(TABLE_GLOBAL_CONFIG_KEY)
})

test('reset clears only the active account key and preserves another account saved preferences', async () => {
  vi.useFakeTimers()
  const savedB = JSON.stringify({ columns: [{ key: 'code', width: 200 }] })
  localStorage.setItem(storedKey('tenant-a/user-b'), savedB)
  const wrapper = scoped(ref('tenant-a/user-a'))
  await flushPromises()
  resize(wrapper, 142)
  await vi.advanceTimersByTimeAsync(150)
  await flushPromises()
  expect(localStorage.getItem(storedKey('tenant-a/user-a'))).not.toBeNull()
  await wrapper.get('.column-settings-btn').trigger('click')
  await flushPromises()
  wrapper.getComponent({ name: 'ColumnSettings' }).vm.$emit('reset')
  await flushPromises()
  expect(localStorage.getItem(storedKey('tenant-a/user-a'))).toBeNull()
  expect(localStorage.getItem(storedKey('tenant-a/user-b'))).toBe(savedB)
})

test('scope and table id remain distinct opaque tuple members', () => {
  const first = mergeGlobalConfig({ persistKey: 'c' }, { persistPrefix: 'a:b' })
  const second = mergeGlobalConfig(
    { persistKey: 'b:c' },
    { persistPrefix: 'a' }
  )
  expect(first.persistKey).not.toBe(second.persistKey)
  expect(
    mergeGlobalConfig({ persistKey: 'orders' }, { persistPrefix: ' user-a ' })
      .persistKey
  ).toBe(JSON.stringify([' user-a ', 'orders']))
  expect(
    mergeGlobalConfig({}, { persistPrefix: 'user-a' }).persistKey
  ).toBeUndefined()
})
