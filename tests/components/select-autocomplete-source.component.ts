import { h } from 'vue'
import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NSelect, NAutoComplete } from 'naive-ui'
import C_Select from '../../src/components/C_Select/index.vue'
import C_AutoComplete from '../../src/components/C_AutoComplete/index.vue'
import type { OptionSource } from '../../src/core/optionSource'

interface Row {
  id: number | boolean
  name: string
  email: string
}
const zero: Row = { id: 0, name: 'Zero', email: 'zero@example.test' }
const disabled: Row = { id: false, name: 'False', email: 'false@example.test' }
const global = { stubs: { teleport: true } }

test('remote select keeps IDs, resolves initial labels and emits full rows for 0 and false', async () => {
  const source: OptionSource<Row, number | boolean> = {
    value: row => row.id,
    label: row => row.name,
    debounce: 0,
    request: vi.fn().mockResolvedValue({ rows: [disabled], total: 1 }),
    resolve: vi.fn().mockResolvedValue([zero]),
  }
  const wrapper = mount(C_Select, {
    attachTo: document.body,
    global,
    props: {
      source,
      modelValue: [0],
      multiple: true,
      show: true,
      virtualScroll: false,
    },
  })
  await flushPromises()
  expect(wrapper.text()).toContain('Zero')
  const option = wrapper
    .findAll('.n-base-select-option')
    .find(option => option.text() === 'False')!
  await option.trigger('click')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[0, false]])
  expect(wrapper.emitted('select')?.at(-1)).toEqual([[zero, disabled]])
  const select = wrapper.getComponent(NSelect)
  select.vm.$emit('search', 'find')
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  select.vm.$emit('update:value', null)
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
  expect(wrapper.emitted('select')?.at(-1)).toEqual([[]])
})

test('remote select exposes error/retry and explicit load more without losing existing options', async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ rows: [zero], total: 2 })
    .mockResolvedValueOnce({ rows: [disabled], total: 2 })
  const wrapper = mount(C_Select, {
    attachTo: document.body,
    global,
    props: {
      source: {
        value: (row: Row) => row.id,
        label: (row: Row) => row.name,
        request,
        pageSize: 1,
      },
      show: true,
      virtualScroll: false,
    },
  })
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('选项加载失败')
  await wrapper.get('.c-option-status button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Zero')
  await wrapper.get('.c-option-status button').trigger('click')
  await flushPromises()
  expect(request.mock.calls.map(([query]) => query.page)).toEqual([1, 1, 2])
  expect(wrapper.text()).toContain('False')
  expect(wrapper.text()).toContain('Zero')
})

test('autocomplete preserves free text on blur and clear without inventing a selected row', async () => {
  const wrapper = mount(C_AutoComplete, {
    attachTo: document.body,
    global,
    props: { options: ['Alpha', 'Beta'], clearable: true },
  })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await input.setValue('My own customer')
  await input.trigger('blur')
  expect(input.element.value).toBe('My own customer')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    'My own customer',
  ])
  expect(wrapper.emitted('select')).toBeUndefined()
  await input.setValue('')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
})

test('autocomplete uses native keyboard and IME guards, with local value as inserted text', async () => {
  const row = {
    value: 'Ada',
    label: 'Ada · customer',
    email: 'ada@example.test',
  }
  const wrapper = mount(C_AutoComplete, {
    attachTo: document.body,
    global,
    props: { options: [row] },
  })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await input.setValue('Ad')
  await flushPromises()
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('compositionstart')
  await input.trigger('keydown', { key: 'Enter', isComposing: true })
  expect(wrapper.emitted('select')).toBeUndefined()
  await input.trigger('compositionend')
  // Naive clears its composition guard in window.setTimeout(0), not a Promise job.
  // Waiting on the same timer queue preserves the real IME boundary deterministically.
  await new Promise<void>(resolve => window.setTimeout(resolve, 0))
  await flushPromises()
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('select')?.at(-1), wrapper.html()).toEqual([row])
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Ada'])
  expect(input.element.value).toBe('Ada')
})

test('autocomplete keeps duplicate labels selectable by identity and never emits numeric IDs as text', async () => {
  const first = { ...zero, name: 'Same' }
  const second = { ...disabled, name: 'Same' }
  const wrapper = mount(C_AutoComplete, {
    attachTo: document.body,
    global,
    props: {
      source: {
        value: (row: Row) => row.id,
        label: (row: Row) => row.name,
        debounce: 0,
        request: async () => ({ rows: [first, second], total: 2 }),
      },
    },
  })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await input.setValue('Sa')
  await flushPromises()
  expect(wrapper.getComponent(NAutoComplete).props('value')).toBe('Sa')
  expect(wrapper.getComponent(NAutoComplete).props('options')).toHaveLength(2)
  await input.trigger('keydown', { key: 'ArrowDown' })
  await input.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('select')?.at(-1)).toEqual([second])
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Same'])
  expect(
    wrapper
      .emitted('update:modelValue')
      ?.every(([value]) => typeof value === 'string')
  ).toBe(true)
})

test('autocomplete opens empty focused suggestions, preserves disabled items and permits fixed templates', async () => {
  const wrapper = mount(C_AutoComplete, {
    attachTo: document.body,
    global,
    props: {
      filterable: false,
      options: [{ value: 'blocked', disabled: true }, { value: 'template' }],
    },
  })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await flushPromises()
  expect(wrapper.find('.n-auto-complete-menu').exists()).toBe(true)
  await input.setValue('unrelated')
  expect(wrapper.getComponent(NAutoComplete).props('options')).toHaveLength(2)
  await input.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('select')?.at(-1)).toEqual([{ value: 'template' }])
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['template'])
})

test('autocomplete composes suffix and empty feedback, paginates without changing the free text', async () => {
  const request = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ rows: [zero], total: 2 })
    .mockResolvedValueOnce({ rows: [disabled], total: 2 })
  const wrapper = mount(C_AutoComplete, {
    attachTo: document.body,
    global,
    props: {
      source: {
        value: (row: Row) => row.id,
        label: (row: Row) => row.name,
        request,
        pageSize: 1,
      },
    },
    slots: { suffix: () => 'custom suffix' },
  })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await flushPromises()
  expect(wrapper.text()).toContain('选项加载失败')
  expect(wrapper.get('.n-input__suffix').text()).toContain('custom suffix')
  await wrapper.get('.n-input__suffix .c-option-status button').trigger('click')
  await flushPromises()
  expect(wrapper.find('.n-auto-complete-menu').exists()).toBe(true)
  await wrapper.get('.n-input__suffix .c-option-status button').trigger('click')
  await flushPromises()
  expect(request.mock.calls.map(([query]) => query.page)).toEqual([1, 1, 2])
  expect(wrapper.getComponent(NAutoComplete).props('options')).toHaveLength(2)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  await input.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('select')?.at(-1)).toEqual([zero])
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Zero'])
})

test('autocomplete respects explicit native getShow and minimum query lengths', async () => {
  const request = vi.fn().mockResolvedValue({ rows: [], total: 0 })
  const wrapper = mount(C_AutoComplete, {
    attachTo: document.body,
    global,
    props: {
      source: {
        value: (row: Row) => row.id,
        label: (row: Row) => row.name,
        request,
        minChars: 2,
        debounce: 0,
      },
    },
  })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await flushPromises()
  expect(wrapper.text()).toContain('2')
  expect(request).not.toHaveBeenCalled()
  await input.setValue('aa')
  await flushPromises()
  expect(request).toHaveBeenCalledTimes(1)
  expect(wrapper.text()).toContain('暂无')
  await wrapper.setProps({ getShow: () => false })
  expect(wrapper.find('.n-auto-complete-menu').exists()).toBe(false)
})

test('closed select exposes initial echo failure and retries it inside the opened action slot', async () => {
  const resolve = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([zero])
  const request = vi.fn().mockResolvedValue({ rows: [], total: 0 })
  const wrapper = mount(C_Select, {
    attachTo: document.body,
    global,
    props: {
      modelValue: 0,
      source: {
        value: (row: Row) => row.id,
        label: (row: Row) => row.name,
        resolve,
        request,
      },
    },
    slots: { action: () => 'custom action' },
  })
  await flushPromises()
  expect(request).not.toHaveBeenCalled()
  expect(wrapper.getComponent(NSelect).props('status')).toBe('error')
  await wrapper.setProps({ show: true })
  await flushPromises()
  expect(wrapper.get('.n-base-select-menu__action').text()).toContain(
    'custom action'
  )
  await wrapper.get('.c-option-status button').trigger('click')
  await flushPromises()
  expect(resolve).toHaveBeenCalledTimes(2)
  expect(request).toHaveBeenCalledTimes(1)
  expect(wrapper.text()).toContain('Zero')
  expect(wrapper.getComponent(NSelect).props('status')).toBeUndefined()
})

test('source-free select preserves externally managed native remote search', async () => {
  const onSearch = vi.fn()
  const wrapper = mount(C_Select, {
    props: {
      remote: true,
      filterable: true,
      onSearch,
      options: [{ value: 0, label: 'Zero' }],
    },
  })
  const select = wrapper.getComponent(NSelect)
  expect(select.props('remote')).toBe(true)
  select.vm.$emit('search', 'zero')
  expect(onSearch).toHaveBeenCalledExactlyOnceWith('zero')
  expect(wrapper.find('.c-option-status').exists()).toBe(false)
})

test('autocomplete renders complete numeric-identity records without inserting secondary details into text', async () => {
  const first = { ...zero, name: 'Same' }
  const second = { ...disabled, name: 'Same' }
  const renderLabel = vi.fn((row: Row) =>
    h('span', { class: 'customer-suggestion' }, [
      h('strong', row.name),
      h('small', row.email),
    ])
  )
  const wrapper = mount(C_AutoComplete<Row>, {
    attachTo: document.body,
    global,
    attrs: { menuProps: { virtualScroll: false } },
    props: {
      renderLabel,
      source: {
        value: (row: Row) => row.id,
        label: (row: Row) => row.name,
        request: async () => ({ rows: [first, second], total: 2 }),
      },
    },
  })
  const input = wrapper.get('input')
  await input.trigger('focus')
  await flushPromises()
  expect(
    wrapper.findAll('.customer-suggestion small').map(node => node.text())
  ).toEqual([first.email, second.email])
  expect(renderLabel).toHaveBeenCalledWith(first)
  expect(renderLabel).toHaveBeenCalledWith(second)
  await input.trigger('keydown', { key: 'Enter' })
  expect(wrapper.emitted('select')?.at(-1)).toEqual([first])
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Same'])
  expect(input.element.value).toBe('Same')
})
