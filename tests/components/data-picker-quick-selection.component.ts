import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import { NButton, NPopover, NDataTable } from 'naive-ui'
import Picker from '../../src/components/C_DataPicker/index.vue'
import Panel from '../../src/components/C_DataPicker/PickerPanel.vue'
import type {
  DataPickerProps,
  DataPickerSourceInput,
} from '../../src/components/C_DataPicker/types'

interface Row {
  id: number
  name: string
  enabled: boolean
}
const rows: Row[] = [
  { id: 0, name: '零', enabled: true },
  { id: 1, name: '禁选', enabled: false },
  { id: 2, name: '二', enabled: true },
]
const source = (): DataPickerSourceInput<Row> => ({
  rowKey: 'id',
  label: row => row.name,
  request: vi.fn(async () => ({ rows, total: rows.length })),
  resolve: vi.fn(async values => rows.filter(row => values.includes(row.id))),
})
const setup = (props: Partial<DataPickerProps<Row>> = {}) =>
  mount(Picker<Row>, {
    props: {
      source: source(),
      columns: [{ key: 'name', title: '名称' }],
      presentation: 'popover',
      rowCheckable: row => row.enabled,
      ...props,
    },
    attachTo: document.body,
  })
const open = async (wrapper: ReturnType<typeof setup>) => {
  wrapper.get<HTMLInputElement>('.c-data-picker__trigger input').element.focus()
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.getComponent(Panel).findAll('tbody tr')).toHaveLength(3)
  )
}
const confirm = (wrapper: ReturnType<typeof setup>) =>
  wrapper.findAllComponents(NButton).find(button => button.text() === '确定')!

test('single selection keeps the existing confirmation by default', async () => {
  const normal = setup()
  await open(normal)
  await normal
    .getComponent(Panel)
    .findAll('tbody tr')[0]
    .get('.n-radio')
    .trigger('click')
  expect(normal.emitted('update:modelValue')).toBeUndefined()
  await confirm(normal).trigger('click')
  await flushPromises()
  expect(normal.emitted('update:modelValue')).toEqual([[0]])
  normal.unmount()
})

test.each([false, true])(
  'quick selection confirms once (radio=%s)',
  async radio => {
    const adapter = source()
    const wrapper = setup({ source: adapter, commitOnSelect: true })
    await open(wrapper)
    await wrapper.getComponent(Panel).findAll('tbody tr')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    const row = wrapper.getComponent(Panel).findAll('tbody tr')[2]
    await (radio ? row.get('.n-radio') : row).trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
    expect(adapter.resolve).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('cancel')).toBeUndefined()
    expect(document.activeElement).toBe(
      wrapper.get('.c-data-picker__trigger input').element
    )
    wrapper.unmount()
  }
)

test('candidate arrows skip disabled rows; Enter selects a draft and Escape restores focus', async () => {
  const wrapper = setup()
  await open(wrapper)
  const scroll = vi.spyOn(wrapper.getComponent(NDataTable).vm, 'scrollTo')
  const input = wrapper.get('.c-data-picker__trigger input')
  expect(
    wrapper.getComponent(Panel).findAll('input[type="text"]')
  ).toHaveLength(0)
  await input.trigger('keydown', { key: 'ArrowDown' })
  await flushPromises()
  const first = wrapper.getComponent(Panel).findAll('tbody tr')[0]
  expect(document.activeElement).toBe(first.element)
  await first.trigger('keydown', { key: 'ArrowDown' })
  await flushPromises()
  const last = wrapper.getComponent(Panel).findAll('tbody tr')[2]
  expect(document.activeElement).toBe(last.element)
  expect(scroll).not.toHaveBeenCalled()
  await last.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(
    last.get<HTMLInputElement>('input[type="radio"]').element.checked
  ).toBe(true)
  await last.trigger('keydown', { key: 'Escape' })
  await flushPromises()
  expect(document.activeElement).toBe(input.element)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  wrapper.unmount()
})

test.each([true, false])(
  'pending confirmation cannot publish after cancellation/scope change (cancel=%s)',
  async cancel => {
    let finish!: (rows: readonly Row[]) => void
    const adapter = source()
    adapter.resolve = vi.fn(
      () =>
        new Promise<readonly Row[]>(resolve => {
          finish = resolve
        })
    )
    const wrapper = setup({ source: adapter, commitOnSelect: true, scope: 'A' })
    await open(wrapper)
    await wrapper.getComponent(Panel).findAll('tbody tr')[0].trigger('click')
    await wrapper.getComponent(Panel).findAll('tbody tr')[2].trigger('click')
    expect(adapter.resolve).toHaveBeenCalledTimes(1)
    if (cancel)
      await wrapper
        .get('.c-data-picker__trigger input')
        .trigger('keydown', { key: 'Escape' })
    else await wrapper.setProps({ scope: 'B' })
    finish([rows[0]])
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  }
)

test('popup options reach the surface; custom query and full modal retain their own search', async () => {
  const wrapper = setup({
    popup: {
      width: 'trigger',
      maxHeight: 180,
      placement: 'top-start',
      to: false,
    },
  })
  await open(wrapper)
  expect(wrapper.getComponent(NPopover).props()).toMatchObject({
    width: 'trigger',
    placement: 'top-start',
    to: false,
  })
  expect(wrapper.getComponent(NDataTable).props('maxHeight')).toBe(180)
  await wrapper.get('.c-data-picker__more').trigger('click')
  await flushPromises()
  expect(
    wrapper
      .getComponent(Panel)
      .find('input[aria-label="搜索候选数据"]')
      .exists()
  ).toBe(true)
  wrapper.unmount()
  const custom = mount(Picker<Row>, {
    props: { source: source(), columns: [], presentation: 'popover' },
    slots: { query: () => h('input', { 'aria-label': '业务筛选' }) },
    attachTo: document.body,
  })
  custom.get<HTMLInputElement>('.c-data-picker__trigger input').element.focus()
  await flushPromises()
  expect(
    custom.getComponent(Panel).find('[aria-label="业务筛选"]').exists()
  ).toBe(true)
  custom.unmount()
})

test('opt-in closed tags remove one identity, preserve unresolved values and respect readonly', async () => {
  const wrapper = setup({
    multiple: true,
    modelValue: [0, 2, 99],
    maxTagCount: 1,
  })
  await flushPromises()
  expect(wrapper.findAll('.c-data-picker__value-tag')).toHaveLength(1)
  expect(wrapper.get('.c-data-picker__tag-count').text()).toBe('+2')
  const input = wrapper.get<HTMLInputElement>('.c-data-picker__trigger input')
  input.element.focus()
  await flushPromises()
  expect(wrapper.find('.c-data-picker__value-tag').exists()).toBe(false)
  expect(document.activeElement).toBe(input.element)
  await input.trigger('keydown', { key: 'Escape' })
  await flushPromises()
  expect(wrapper.get('.c-data-picker__trigger input').element).toBe(
    input.element
  )
  await wrapper.get('.c-data-picker__value-tag .n-base-close').trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([[[2, 99]]])
  expect(wrapper.emitted('select')).toEqual([[[rows[2]]]])
  await wrapper.setProps({ readonly: true })
  expect(wrapper.find('.c-data-picker__value-tag .n-base-close').exists()).toBe(
    false
  )
  wrapper.unmount()
})

test('a custom popover trigger retains the default search field', async () => {
  const wrapper = mount(Picker<Row>, {
    props: { source: source(), columns: [], presentation: 'popover' },
    slots: { trigger: ({ open }) => h('button', { onClick: open }, '选择') },
    attachTo: document.body,
  })
  await wrapper.get('button').trigger('click')
  await flushPromises()
  expect(
    wrapper
      .getComponent(Panel)
      .find('input[aria-label="搜索候选数据"]')
      .exists()
  ).toBe(true)
  wrapper.unmount()
})

test('failed eligibility keeps the draft open and retrying the same row revalidates', async () => {
  let valid = false
  const adapter = source()
  adapter.resolve = vi.fn(async () => (valid ? [rows[2]] : []))
  const wrapper = setup({ source: adapter, commitOnSelect: true })
  await open(wrapper)
  await wrapper.getComponent(Panel).findAll('tbody tr')[2].trigger('click')
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.getComponent(Panel).get('[role="alert"]').text()).toContain(
    '已失效'
  )
  valid = true
  await wrapper.getComponent(Panel).findAll('tbody tr')[2].trigger('click')
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  expect(adapter.resolve).toHaveBeenCalledTimes(2)
  wrapper.unmount()
})

test('nested cell actions remain independent of immediate row selection', async () => {
  const clicked = vi.fn()
  const wrapper = setup({
    commitOnSelect: true,
    columns: [
      {
        key: 'name',
        title: '名称',
        render: row => h('button', { onClick: clicked }, row.name),
      },
    ],
  })
  await open(wrapper)
  await wrapper
    .getComponent(Panel)
    .findAll('tbody tr')[0]
    .get('button')
    .trigger('click')
  expect(clicked).toHaveBeenCalledOnce()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  wrapper.unmount()
})

test('ArrowUp starts at the last candidate and keyboard confirmation respects composition', async () => {
  const wrapper = setup({ commitOnSelect: true })
  await open(wrapper)
  const input = wrapper.get('.c-data-picker__trigger input')
  await input.trigger('keydown', { key: 'ArrowUp', isComposing: true })
  expect(document.activeElement).toBe(input.element)
  await input.trigger('keydown', { key: 'ArrowUp' })
  await flushPromises()
  const last = wrapper.getComponent(Panel).findAll('tbody tr')[2]
  expect(document.activeElement).toBe(last.element)
  await last.trigger('keydown', { key: 'Enter' })
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
  wrapper.unmount()
})

test.each(['modal', 'multiple'] as const)(
  'immediate selection leaves %s confirmation unchanged',
  async mode => {
    const wrapper = setup({
      presentation: mode === 'modal' ? 'modal' : 'popover',
      multiple: mode === 'multiple',
      commitOnSelect: true,
    })
    if (mode === 'modal') {
      await wrapper.get('.c-data-picker__open').trigger('click')
      await flushPromises()
    } else await open(wrapper)
    const candidate = wrapper.getComponent(Panel).findAll('tbody tr')[0]
    await candidate
      .get(mode === 'modal' ? '.n-radio' : '.n-checkbox')
      .trigger('click')
    await flushPromises()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  }
)

test('when every candidate is disabled the empty navigation target stays in the panel', async () => {
  const wrapper = setup({ rowCheckable: () => false })
  await open(wrapper)
  await wrapper
    .get('.c-data-picker__trigger input')
    .trigger('keydown', { key: 'ArrowDown' })
  await flushPromises()
  expect(document.activeElement).toBe(
    wrapper.getComponent(Panel).get('.c-data-picker__content').element
  )
  await wrapper
    .getComponent(Panel)
    .get('.c-data-picker__content')
    .trigger('keydown', { key: 'Escape' })
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  wrapper.unmount()
})
