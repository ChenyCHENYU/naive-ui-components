import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import { NButton, NPagination, NModal } from 'naive-ui'
import C_DataPicker from '../../src/components/C_DataPicker/index.vue'
import PickerPanel from '../../src/components/C_DataPicker/PickerPanel.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import C_Tree from '../../src/components/C_Tree/index.vue'
import type { DataPickerSourceInput } from '../../src/components/C_DataPicker/types'
import type { TableInstance } from '../../src/components/C_Table/types'

interface Entity {
  id: number
  name: string
  enabled: boolean
}
interface Filters {
  factory?: string
  category?: string
  name?: string
}
const records: Entity[] = [
  { id: 0, name: '零', enabled: true },
  { id: 1, name: '一', enabled: false },
  { id: 2, name: '二', enabled: true },
  { id: 3, name: '三', enabled: true },
]
const columns = [{ key: 'name', title: '名称' }]
const source = (): DataPickerSourceInput<Entity, Filters> => ({
  rowKey: 'id',
  label: row => row.name,
  request: vi.fn(async query => ({
    rows: records.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize
    ),
    total: records.length,
  })),
  resolve: vi.fn(async values =>
    records.filter(row => values.includes(row.id))
  ),
})
const table = (wrapper: ReturnType<typeof mount>) =>
  wrapper.getComponent(C_Table).vm as unknown as TableInstance<Entity>
const button = (wrapper: ReturnType<typeof mount>, text: string) => {
  const found = wrapper
    .findAllComponents(NButton)
    .find(item => item.text() === text)
  if (!found) throw new Error(`Missing button ${text}`)
  return found
}
const open = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('.c-data-picker__open').trigger('click')
  await flushPromises()
}

test.each([true, false])(
  'query submissions preserve only the owned navigation field (navigation=%s)',
  async navigated => {
    const adapter = source()
    let submit!: (filters: Filters) => void
    const wrapper = mount(C_DataPicker<Entity, Filters>, {
      props: {
        source: adapter,
        columns,
        initialValues: { name: 'initial', category: 'initial' },
        fixedFilters: { factory: 'A' },
        ...(navigated
          ? {
              navigation: {
                field: 'category' as const,
                options: [{ key: 'steel', label: '钢材' }],
              },
            }
          : {}),
      },
      slots: {
        query: ({
          submit: submitQuery,
        }: {
          submit: (filters: Filters) => void
        }) => {
          submit = submitQuery
          return null
        },
      },
    })
    await open(wrapper)
    if (navigated) {
      wrapper
        .getComponent(C_Tree)
        .vm.$emit('node-select', { key: 'steel', label: '钢材' }, ['steel'])
      await flushPromises()
    }
    submit({ name: 'new', factory: 'B' })
    await flushPromises()
    expect(vi.mocked(adapter.request).mock.lastCall?.[0].filters).toStrictEqual(
      navigated
        ? { name: 'new', category: 'steel', factory: 'A' }
        : { name: 'new', factory: 'A' }
    )

    submit({ category: undefined })
    await flushPromises()
    expect(vi.mocked(adapter.request).mock.lastCall?.[0].filters).toStrictEqual(
      {
        category: undefined,
        factory: 'A',
      }
    )
    submit({ category: 'alloy' })
    await flushPromises()
    expect(vi.mocked(adapter.request).mock.lastCall?.[0].filters).toStrictEqual(
      {
        category: 'alloy',
        factory: 'A',
      }
    )
    wrapper.unmount()
  }
)

test('page selection, imperative APIs and confirmation share eligibility and the cross-page cap', async () => {
  const adapter = source()
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      multiple: true,
      maxSelection: 2,
      pageSize: 2,
      rowCheckable: row => row.enabled,
    },
  })
  await open(wrapper)
  expect(table(wrapper).selectRow(1)).toBe(false)
  table(wrapper).selectRow(0)
  await flushPromises()
  wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
  await flushPromises()
  table(wrapper).selectAll()
  await flushPromises()
  expect(table(wrapper).getSelectedRows()).toEqual([records[2]])
  await button(wrapper, '确定').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toEqual([[[0, 2]]])
  expect(wrapper.emitted('select')).toEqual([[[records[0], records[2]]]])
  expect(adapter.resolve).toHaveBeenCalledWith([0, 2], expect.any(AbortSignal))
})

test('fixed conditions override submitted filters and deep context changes cancel candidate and echo ownership', async () => {
  const fixed = reactive<Filters>({ factory: 'A' })
  let finish!: (value: { rows: Entity[]; total: number }) => void
  const pending = new Promise<{ rows: Entity[]; total: number }>(resolve => {
    finish = resolve
  })
  const adapter = source()
  adapter.request = vi.fn(query =>
    query.filters?.factory === 'A'
      ? pending
      : Promise.resolve({ rows: [records[2]], total: 1 })
  )
  // Invoke the actual typed query slot callback, without modifying internal state.
  let submit!: (filters: Filters) => void
  const current = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      fixedFilters: fixed,
      initialValues: { name: '' },
    },
    slots: {
      query: ({ submit: onSubmit }) => {
        submit = onSubmit
        return null
      },
    },
  })
  await open(current)
  submit({ factory: 'FORGED', name: 'ore' })
  await flushPromises()
  const [call] = vi.mocked(adapter.request).mock.calls.at(-1)!
  expect(call.filters).toEqual({ factory: 'A', name: 'ore' })
  fixed.factory = 'B'
  await flushPromises()
  expect(call.signal.aborted).toBe(true)
  expect(current.findComponent(C_Table).exists()).toBe(false)
  finish({ rows: [records[0]], total: 1 })
  await open(current)
  expect(table(current).getSelectedRows()).toEqual([])
  expect(current.getComponent({ name: 'C_Table' }).props('data')).toEqual([
    records[2],
  ])
})

test('tree navigation changes only its filter and returns to the first page', async () => {
  const adapter = source()
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      pageSize: 1,
      fixedFilters: { factory: 'A' },
      navigation: {
        field: 'category',
        options: [{ key: 'metal', label: '金属' }],
      },
    },
  })
  await open(wrapper)
  wrapper.getComponent(NPagination).vm.$emit('update:page', 2)
  await flushPromises()
  await wrapper
    .getComponent(C_Tree)
    .get('.n-tree-node-content')
    .trigger('click')
  await flushPromises()
  expect(adapter.request).toHaveBeenLastCalledWith(
    expect.objectContaining({
      page: 1,
      filters: { factory: 'A', category: 'metal' },
    })
  )
  await button(wrapper, '全部分类').trigger('click')
  await flushPromises()
  expect(adapter.request).toHaveBeenLastCalledWith(
    expect.objectContaining({ page: 1, filters: { factory: 'A' } })
  )
})

test('popover search and full modal preserve one draft and keyboard escape cancels it', async () => {
  const adapter = { ...source(), debounce: 0 }
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      multiple: true,
      presentation: 'popover',
    },
    attachTo: document.body,
  })
  const input = wrapper.get('.c-data-picker__trigger input')
  await input.trigger('focus')
  await flushPromises()
  await input.setValue('金属')
  await input.trigger('keydown', { key: 'Enter' })
  await flushPromises()
  expect(adapter.request).toHaveBeenLastCalledWith(
    expect.objectContaining({ search: '金属' })
  )
  table(wrapper).selectRow(2)
  await flushPromises()
  await wrapper.get('.c-data-picker__more').trigger('click')
  await flushPromises()
  expect(wrapper.getComponent(NModal).props('show')).toBe(true)
  expect(table(wrapper).getSelectedRows()).toEqual([records[2]])
  await button(wrapper, '取消').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('select')).toBeUndefined()
  const reopened = wrapper.get('.c-data-picker__trigger input')
  await reopened.trigger('focus')
  await flushPromises()
  await reopened.trigger('keydown', { key: 'Escape' })
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
})

test('stored recent and favorite choices are scoped, bounded and revalidated before selection', async () => {
  const adapter = source()
  const history = {
    storageKey: 'material',
    scope: 'user-A:factory-A',
    maxItems: 1,
    favorites: true,
  }
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      multiple: true,
      history,
      rowCheckable: row => row.enabled,
    },
  })
  await open(wrapper)
  table(wrapper).selectRow(0)
  table(wrapper).selectRow(2)
  await flushPromises()
  const writes = vi.spyOn(Storage.prototype, 'setItem')
  await button(wrapper, '收藏当前选择').trigger('click')
  expect(writes).toHaveBeenCalledTimes(1)
  const remove = wrapper
    .getComponent(PickerPanel)
    .get('button[aria-label="取消收藏 零"]')
  await remove.trigger('click')
  expect(table(wrapper).getSelectedRows()).toEqual([records[0], records[2]])
  await button(wrapper, '收藏当前选择').trigger('click')
  await button(wrapper, '确定').trigger('click')
  await flushPromises()
  expect(localStorage.length).toBe(1)
  const stored = JSON.parse(localStorage.getItem(localStorage.key(0)!)!)
  expect(stored.recent).toEqual([{ value: 0, label: '零' }])
  expect(stored.favorites).toEqual([{ value: 0, label: '零' }])
  adapter.resolve = vi.fn(async () => [{ ...records[0], enabled: false }])
  await wrapper.setProps({ source: { ...adapter } })
  await open(wrapper)
  await button(wrapper, '零').trigger('click')
  await flushPromises()
  expect(table(wrapper).getSelectedRows()).toEqual([])
  expect(
    wrapper.getComponent(PickerPanel).get('[role=alert]').text()
  ).toContain('失效')
  await wrapper.setProps({ history: { ...history, scope: '' } })
  await open(wrapper)
  expect(
    wrapper.getComponent(PickerPanel).find('.c-data-picker__history').exists()
  ).toBe(false)
  expect(localStorage.length).toBe(1)
  await wrapper.setProps({ history: { ...history, scope: 'user-B' } })
  await open(wrapper)
  expect(
    wrapper.getComponent(PickerPanel).find('.c-data-picker__history').text()
  ).not.toContain('零')
})

test('enhanced confirmation rejects duplicate resolved identities and preserves the open draft', async () => {
  const adapter = source()
  adapter.resolve = async () => [records[0], { ...records[0] }]
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      rowCheckable: row => row.enabled,
    },
  })
  await open(wrapper)
  table(wrapper).selectRow(0)
  await flushPromises()
  await button(wrapper, '确定').trigger('click')
  await flushPromises()
  expect(wrapper.getComponent(PickerPanel).find('[role=alert]').exists()).toBe(
    true
  )
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(table(wrapper).getSelectedRows()).toEqual([records[0]])
})

test('fixed scope changes cancel pending echo and confirmation without leaking prior entity labels', async () => {
  const fixed = reactive<Filters>({ factory: 'A' })
  let finishLabel!: (rows: Entity[]) => void
  let finishChoice!: (rows: Entity[]) => void
  const label = new Promise<Entity[]>(resolve => {
    finishLabel = resolve
  })
  const choice = new Promise<Entity[]>(resolve => {
    finishChoice = resolve
  })
  const signals: AbortSignal[] = []
  const adapter = source()
  adapter.resolve = vi.fn(async (_values, signal) => {
    signals.push(signal)
    if (signals.length === 1) return label
    if (signals.length === 3) return choice
    return [{ ...records[0], name: fixed.factory! }]
  })
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      fixedFilters: fixed,
      modelValue: 0,
      rowCheckable: row => row.enabled,
    },
  })
  fixed.factory = 'B'
  await flushPromises()
  expect(signals[0].aborted).toBe(true)
  finishLabel([{ ...records[0], name: 'A' }])
  await flushPromises()
  expect(wrapper.get('.c-data-picker__open').text()).toBe('B')
  await open(wrapper)
  await button(wrapper, '确定').trigger('click')
  expect(signals).toHaveLength(3)
  fixed.factory = 'C'
  await flushPromises()
  expect(signals[2].aborted).toBe(true)
  finishChoice([{ ...records[0], name: 'B' }])
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.get('.c-data-picker__open').text()).toBe('C')
})

test('a disabled echoed entity remains readable but cannot bypass any selection entry', async () => {
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: source(),
      columns,
      modelValue: 1,
      rowCheckable: () => false,
      requireSelection: true,
    },
  })
  await flushPromises()
  expect(wrapper.get('.c-data-picker__open').text()).toBe('一')
  await open(wrapper)
  expect(table(wrapper).getSelectedRows()).toEqual([])
  expect(table(wrapper).selectRow(1)).toBe(false)
  table(wrapper).selectAll()
  await flushPromises()
  expect(button(wrapper, '确定').attributes('disabled')).toBeDefined()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
})

test('popover closes while restoring focus and reopens when the same focused input is clicked', async () => {
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: source(),
      columns,
      presentation: 'popover',
    },
    attachTo: document.body,
  })
  const input = wrapper.get<HTMLInputElement>('.c-data-picker__trigger input')
  input.element.focus()
  await flushPromises()
  const id = input.attributes('aria-controls')!
  expect(document.getElementById(id)?.getAttribute('role')).toBe('dialog')
  await button(wrapper, '取消').trigger('click')
  await flushPromises()
  expect(document.activeElement).toBe(input.element)
  expect(input.attributes('aria-expanded')).toBe('false')
  await input.trigger('click')
  await flushPromises()
  expect(input.attributes('aria-expanded')).toBe('true')
  table(wrapper).selectRow(2)
  await flushPromises()
  await button(wrapper, '确定').trigger('click')
  await flushPromises()
  expect(input.attributes('aria-expanded')).toBe('false')
  expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  await input.trigger('click')
  await flushPromises()
  expect(input.attributes('aria-expanded')).toBe('true')
})

test('shortening a quick search below minChars aborts the pending request and immediately removes stale candidates', async () => {
  let finish!: (value: { rows: Entity[]; total: number }) => void
  const pending = new Promise<{ rows: Entity[]; total: number }>(resolve => {
    finish = resolve
  })
  const adapter = { ...source(), minChars: 2, debounce: 0 }
  adapter.request = vi.fn(() => pending)
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      presentation: 'popover',
    },
  })
  const input = wrapper.get('.c-data-picker__trigger input')
  await input.trigger('focus')
  await flushPromises()
  expect(adapter.request).not.toHaveBeenCalled()
  await input.setValue('ab')
  await input.trigger('keydown', { key: 'Enter' })
  await flushPromises()
  const query = vi.mocked(adapter.request).mock.calls[0][0]
  await input.setValue('a')
  await flushPromises()
  expect(query.signal.aborted).toBe(true)
  finish({ rows: [records[0]], total: 1 })
  await flushPromises()
  expect(wrapper.getComponent({ name: 'C_Table' }).props('data')).toEqual([])
})

test('full selection submits the current short search after the quick-search timer has finished', async () => {
  const adapter = { ...source(), minChars: 2, debounce: 0 }
  const wrapper = mount(C_DataPicker<Entity, Filters>, {
    props: {
      source: adapter,
      columns,
      presentation: 'popover',
    },
  })
  const input = wrapper.get('.c-data-picker__trigger input')
  await input.trigger('focus')
  await input.setValue('ab')
  await input.trigger('keydown', { key: 'Enter' })
  await flushPromises()
  await input.setValue('a')
  await new Promise(resolve => setTimeout(resolve, 5))
  await wrapper.get('.c-data-picker__more').trigger('click')
  await flushPromises()
  expect(adapter.request).toHaveBeenLastCalledWith(
    expect.objectContaining({ search: 'a' })
  )
  const count = vi.mocked(adapter.request).mock.calls.length
  await button(wrapper, '取消').trigger('click')
  await flushPromises()
  await wrapper.get('.c-data-picker__more').trigger('click')
  await flushPromises()
  expect(vi.mocked(adapter.request).mock.calls.length).toBe(count + 1)
})
