import { expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { NButton, NPagination } from 'naive-ui'
import UserPicker from '../../src/components/C_UserPicker/index.vue'
import DataPicker from '../../src/components/C_DataPicker/index.vue'
import Tree from '../../src/components/C_Tree/index.vue'
import Table from '../../src/components/C_Table/index.vue'
import type { TableInstance } from '../../src/components/C_Table/types'
import type { UserPickerSource } from '../../src/components/C_UserPicker/types'

interface Person {
  id: number
  userNo: string
  name: string
  department: string
  active: boolean
}
interface Filters {
  departmentId?: number
}
interface Department {
  id: number
  name: string
  children?: Department[]
}
const people: Person[] = [
  { id: 0, userNo: 'B', name: '同名', department: '研发', active: true },
  { id: 1, userNo: 'A', name: '同名', department: '产品', active: true },
  { id: 2, userNo: 'C', name: '第三人', department: '研发', active: true },
  { id: 3, userNo: 'D', name: '停用人', department: '研发', active: false },
]
const source = (): UserPickerSource<Person, string, Filters> => ({
  rowKey: 'id',
  value: row => row.userNo,
  label: row => row.name,
  request: vi.fn(async query => ({
    rows: people.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize
    ),
    total: people.length,
  })),
  resolve: vi.fn(async values =>
    people.filter(row => values.includes(row.userNo))
  ),
})
const settle = async () => {
  await flushPromises()
  await flushPromises()
}
const findButton = (wrapper: ReturnType<typeof mount>, label: string) => {
  const button = wrapper
    .findAllComponents(NButton)
    .find(
      item => item.attributes('aria-label') === label || item.text() === label
    )
  if (!button) throw new Error(`Missing button ${label}`)
  return button
}
const table = (wrapper: ReturnType<typeof mount>) =>
  wrapper.getComponent(Table).vm as unknown as TableInstance<Person>

test('inline organization is a candidate filter, including key zero; outer confirmation owns commit', async () => {
  const adapter = source()
  const wrapper = mount(UserPicker<Person, Filters, Department, true, string>, {
    props: {
      source: adapter,
      multiple: true,
      modelValue: [],
      presentation: 'inline',
      showActions: false,
      pageSize: 2,
      organization: {
        data: [{ id: 0, name: '研发中心' }],
        field: 'departmentId',
      },
      fields: { code: 'userNo', department: 'department' },
    },
  })
  await settle()
  expect(wrapper.find('.c-data-picker__open').exists()).toBe(false)
  expect(wrapper.find('.c-data-picker__footer').exists()).toBe(false)
  wrapper
    .getComponent(Tree)
    .vm.$emit('node-select', { id: 0, name: '研发中心' }, [0])
  await settle()
  expect(adapter.request).toHaveBeenLastCalledWith(
    expect.objectContaining({ filters: { departmentId: 0 }, page: 1 })
  )
  expect(table(wrapper).getSelectedRows()).toEqual([])
  table(wrapper).selectRow(0)
  await settle()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(await wrapper.vm.confirm()).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([[['B']]])
  expect(wrapper.emitted('select')).toEqual([[[people[0]]]])
  wrapper.unmount()
})

test('choice order survives page restoration, can be changed, and cancellation never commits a draft', async () => {
  const wrapper = mount(UserPicker<Person, Filters, Department, true, string>, {
    props: {
      source: source(),
      multiple: true,
      modelValue: [],
      presentation: 'inline',
      pageSize: 2,
      selectionOrder: true,
      fields: { code: 'userNo', department: 'department' },
    },
  })
  await settle()
  table(wrapper).selectRow(1)
  await settle()
  table(wrapper).selectRow(0)
  await settle()
  wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
  await settle()
  table(wrapper).selectRow(2)
  await settle()
  wrapper.getComponent(NPagination).vm.$emit('update:page', 1)
  await settle()
  expect(
    wrapper
      .findAll('.c-user-picker__selected-list strong')
      .map(item => item.text())
  ).toEqual(['同名', '同名', '第三人'])
  expect(
    wrapper
      .findAll('.c-user-picker__selected-list small')
      .map(item => item.text())
  ).toEqual(['A · 产品', 'B · 研发', 'C · 研发'])
  await findButton(wrapper, '下移 同名').trigger('click')
  await settle()
  expect(await wrapper.vm.confirm()).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([[['B', 'A', 'C']]])
  wrapper.vm.open()
  await settle()
  table(wrapper).selectRow(1)
  await settle()
  wrapper.vm.close()
  expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  expect(wrapper.emitted('cancel')).toHaveLength(1)
  wrapper.unmount()
})

test('disabled reasons gate selection and confirmation rechecks current records', async () => {
  let allowed = true
  const adapter = source()
  adapter.resolve = vi.fn(async values =>
    people
      .filter(row => values.includes(row.userNo))
      .map(row => ({ ...row, active: allowed && row.active }))
  )
  const wrapper = mount(UserPicker<Person, Filters, Department, true, string>, {
    props: {
      source: adapter,
      multiple: true,
      presentation: 'inline',
      showActions: false,
      pageSize: 4,
      disabledReason: row => (row.active ? undefined : '已停用'),
    },
  })
  await settle()
  expect(table(wrapper).selectRow(3)).toBe(false)
  table(wrapper).selectRow(0)
  await settle()
  allowed = false
  expect(await wrapper.vm.confirm()).toBe(false)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(
    wrapper.getComponent(DataPicker).find('[role="alert"]').text()
  ).toContain('失效')
  expect(wrapper.find('.c-data-picker__panel').exists()).toBe(true)
  wrapper.unmount()
})

test('scope replacement aborts pending work and inline remains usable with fresh ownership', async () => {
  const calls: Array<{
    scope: string | number | undefined
    signal: AbortSignal
    finish: (value: { rows: Person[]; total: number }) => void
  }> = []
  const adapter = source()
  adapter.request = query =>
    new Promise(resolve =>
      calls.push({ scope: query.scope, signal: query.signal, finish: resolve })
    )
  const wrapper = mount(UserPicker<Person, Filters, Department, true, string>, {
    props: {
      source: adapter,
      multiple: true,
      presentation: 'inline',
      scope: 'A',
      modelValue: [],
    },
  })
  await settle()
  expect(calls).toHaveLength(1)
  await wrapper.setProps({ scope: 'B' })
  await settle()
  expect(calls[0].signal.aborted).toBe(true)
  expect(calls.at(-1)?.scope).toBe('B')
  calls[0].finish({ rows: [people[0]], total: 1 })
  calls.at(-1)!.finish({ rows: [people[2]], total: 1 })
  await settle()
  expect(table(wrapper).getSelectedRows()).toEqual([])
  expect(wrapper.getComponent(Table).vm.$.props.data).toEqual([people[2]])
  table(wrapper).selectRow(2)
  await settle()
  expect(await wrapper.vm.confirm()).toBe(true)
  expect(adapter.resolve).toHaveBeenLastCalledWith(
    ['C'],
    expect.any(AbortSignal),
    { scope: 'B' }
  )
  expect(wrapper.emitted('update:modelValue')).toEqual([[['C']]])
  wrapper.unmount()
})

test('missing saved identities remain removable and confirmation never trusts stale cached rows', async () => {
  let removed = false
  const adapter: UserPickerSource<Person, number> = {
    rowKey: 'id',
    label: row => row.name,
    request: async () => ({ rows: people, total: people.length }),
    resolve: async values =>
      removed ? [] : people.filter(row => values.includes(row.id)),
  }
  const wrapper = mount(UserPicker<Person, Record<string, unknown>, Department, true, number>, {
    props: {
      source: adapter,
      multiple: true,
      modelValue: [0, 99],
      presentation: 'inline',
      showActions: false,
    },
  })
  await settle()
  expect(wrapper.findAll('.c-user-picker__selected-list li')).toHaveLength(2)
  expect(await wrapper.vm.confirm()).toBe(false)
  await findButton(wrapper, '移除 99').trigger('click')
  await settle()
  removed = true
  expect(await wrapper.vm.confirm()).toBe(false)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  removed = false
  expect(await wrapper.vm.confirm()).toBe(true)
  expect(wrapper.emitted('update:modelValue')).toEqual([[[0]]])
  wrapper.unmount()
})

test('pending confirmation respects a newly required nonempty selection', async () => {
  let finish!: (rows: readonly Person[]) => void
  const adapter = source()
  adapter.resolve = () => new Promise(resolve => { finish = resolve })
  const wrapper = mount(UserPicker<Person, Filters, Department, true, string>, {
    props: {
      source: adapter,
      multiple: true,
      presentation: 'inline',
      showActions: false,
    },
  })
  await settle()
  const pending = wrapper.vm.confirm()
  await settle()
  await wrapper.setProps({ requireSelection: true })
  finish([])
  expect(await pending).toBe(false)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.find('.c-data-picker__panel').exists()).toBe(true)
  wrapper.unmount()
})

test('inline filter replacement opens a fresh session while equivalent configs preserve the draft', async () => {
  const adapter = source()
  const wrapper = mount(UserPicker<Person, Filters, Department, true, string>, {
    props: {
      source: adapter,
      multiple: true,
      presentation: 'inline',
      fixedFilters: { departmentId: 0 },
    },
  })
  await settle()
  table(wrapper).selectRow(0)
  await settle()
  await wrapper.setProps({ fixedFilters: { departmentId: 0 } })
  await settle()
  expect(table(wrapper).getSelectedRows()).toEqual([people[0]])
  await wrapper.setProps({ fixedFilters: { departmentId: 1 } })
  await settle()
  expect(table(wrapper).getSelectedRows()).toEqual([])
  expect(adapter.request).toHaveBeenLastCalledWith(
    expect.objectContaining({ filters: { departmentId: 1 } })
  )
  await wrapper.setProps({
    fixedFilters: undefined,
    initialValues: { departmentId: 2 },
  })
  await settle()
  expect(adapter.request).toHaveBeenLastCalledWith(
    expect.objectContaining({ filters: { departmentId: 2 } })
  )
  wrapper.unmount()
})
