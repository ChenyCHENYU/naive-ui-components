import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import {
  NButton,
  NDatePicker,
  NForm,
  NInput,
  NInputNumber,
  NSelect,
} from 'naive-ui'
import FormSearchComponent from '../../src/components/C_FormSearch/index.vue'
import type { SearchFormParams } from '../../src/components/C_FormSearch/types'
import type {
  DictionaryOption,
  DictionarySource,
} from '../../src/core/dictionary'
import { DICTIONARY_PROVIDER_KEY } from '../../src/context'

const Search = FormSearchComponent<SearchFormParams>

test('presets update only editable configured conditions and never execute or forge an applied snapshot', async () => {
  const onSearch = vi.fn().mockResolvedValue(undefined)
  const wrapper = mount(Search, {
    props: {
      modelValue: {
        org: 'A',
        keyword: 'old',
        quantity: 2,
        enabled: true,
        hidden: 'secret',
        locked: 'stay',
        pageNum: 7,
      },
      formItemList: [
        { type: 'input', prop: 'org', fixed: true },
        { type: 'input', prop: 'keyword' },
        { type: 'number', prop: 'quantity' },
        {
          type: 'select',
          prop: 'enabled',
          list: [
            { value: false, label: 'No' },
            { value: true, label: 'Yes' },
          ],
        },
        { type: 'input', prop: 'hidden', show: false },
        { type: 'input', prop: 'locked', readonly: true },
      ],
      config: { onSearch },
    },
  })
  expect(
    wrapper.vm.applyPreset({
      org: 'B',
      keyword: 'new',
      quantity: 0,
      enabled: false,
      hidden: 'wrong',
      locked: 'wrong',
      pageNum: 99,
      extra: 'wrong',
    })
  ).toBe(true)
  await flushPromises()
  expect(wrapper.vm.formParams).toEqual({
    org: 'A',
    keyword: 'new',
    quantity: 0,
    enabled: false,
    hidden: 'secret',
    locked: 'stay',
    pageNum: 7,
  })
  expect(onSearch).not.toHaveBeenCalled()
  expect(wrapper.vm.appliedParams).toBeNull()
  expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  expect(
    wrapper.vm.applyPreset({ keyword: 'new', quantity: 0, enabled: false })
  ).toBe(true)
  await flushPromises()
  expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(wrapper.vm.appliedParams?.quantity).toBe(0)
  wrapper.unmount()
  expect(wrapper.vm.applyPreset({ keyword: 'late' })).toBe(false)
})

test('an explicit false task result does not advance the successful query snapshot', async () => {
  const onSearch = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce(false)
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: 'first' },
      formItemList: [{ type: 'input', prop: 'keyword' }],
      config: { onSearch },
    },
  })
  expect(await wrapper.vm.searchFn()).toBe(true)
  await wrapper.get('input').setValue('second')
  expect(await wrapper.vm.searchFn()).toBe(false)
  expect(wrapper.vm.appliedParams).toEqual({ keyword: 'first' })
  expect(wrapper.emitted('applied')).toHaveLength(1)
  wrapper.unmount()
})
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}
afterEach(() => vi.unstubAllGlobals())

test('successful requests apply their isolated snapshot while later draft changes stay editable', async () => {
  const request = deferred<void>()
  const onSearch = vi.fn((params: SearchFormParams) => {
    params.keyword = 'callback mutation'
    return request.promise
  })
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: 'requested' },
      formItemList: [{ type: 'input', prop: 'keyword' }],
      config: { onSearch },
    },
  })
  expect(wrapper.vm.appliedParams).toBeNull()
  const pending = wrapper.vm.searchFn()
  await flushPromises()
  expect(wrapper.emitted('applied')).toBeUndefined()
  await wrapper.get('input').setValue('new draft')
  request.resolve()
  expect(await pending).toBe(true)
  expect(wrapper.vm.appliedParams).toEqual({ keyword: 'requested' })
  expect(wrapper.vm.formParams).toEqual({ keyword: 'new draft' })
  expect(wrapper.vm.hasUnappliedChanges).toBe(true)
  expect(wrapper.emitted('applied')).toEqual([[{ keyword: 'requested' }]])
  wrapper.vm.cleanFn()
  expect(wrapper.vm.appliedParams).toEqual({ keyword: 'requested' })
  expect(wrapper.vm.formParams.keyword).toBe('')
  wrapper.unmount()
})

test('request failure preserves the last applied query and permits retry', async () => {
  const feedback = { error: vi.fn() }
  const onSearch = vi
    .fn()
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(undefined)
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: 'first' },
      formItemList: [{ type: 'input', prop: 'keyword' }],
      config: { onSearch, feedback },
    },
  })
  expect(await wrapper.vm.searchFn()).toBe(true)
  await wrapper.get('input').setValue('second')
  expect(await wrapper.vm.searchFn()).toBe(false)
  expect(wrapper.vm.appliedParams).toEqual({ keyword: 'first' })
  expect(wrapper.emitted('applied')).toHaveLength(1)
  expect(feedback.error).toHaveBeenCalledTimes(1)
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(wrapper.vm.appliedParams).toEqual({ keyword: 'second' })
  wrapper.unmount()
})

test('fixed scope remains locked and reset-safe, and a late response cannot apply after scope replacement', async () => {
  const request = deferred<void>()
  const wrapper = mount(Search, {
    props: {
      modelValue: { tenant: '001', keyword: 'first' },
      formItemList: [
        { type: 'input', prop: 'tenant', fixed: true, defaultValue: 'wrong' },
        { type: 'input', prop: 'keyword' },
      ],
      config: { onSearch: () => request.promise },
    },
  })
  const [tenant] = wrapper.findAllComponents(NInput)
  tenant.vm.$emit('update:value', 'unsafe')
  expect(wrapper.vm.formParams.tenant).toBe('001')
  wrapper.vm.cleanFn()
  expect(wrapper.vm.formParams.tenant).toBe('001')
  await wrapper.get('input:not([disabled])').setValue('request')
  const pending = wrapper.vm.searchFn()
  await flushPromises()
  await wrapper.setProps({
    modelValue: { tenant: '002', keyword: 'new scope' },
  })
  request.resolve()
  expect(await pending).toBe(false)
  expect(wrapper.vm.appliedParams).toBeNull()
  expect(wrapper.emitted('applied')).toBeUndefined()
  wrapper.unmount()
})

test('schema option updates preserve a local draft without producing echo loops or clearing applied state', async () => {
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: 'old', enabled: false },
      config: { onSearch: () => undefined },
      formItemList: [
        { type: 'input', prop: 'keyword' },
        {
          type: 'select',
          prop: 'enabled',
          list: [{ label: '停用', value: false }],
        },
      ],
    },
  })
  await wrapper.get('input').setValue('draft')
  expect(await wrapper.vm.searchFn()).toBe(true)
  const updates = wrapper.emitted('update:modelValue')?.length
  await wrapper.setProps({
    formItemList: [
      { type: 'input', prop: 'keyword', label: '搜索词' },
      {
        type: 'select',
        prop: 'enabled',
        list: [{ label: '新标签', value: false }],
      },
    ],
  })
  await nextTick()
  expect(wrapper.vm.formParams.keyword).toBe('draft')
  expect(wrapper.vm.appliedParams).toEqual({ keyword: 'draft', enabled: false })
  expect(wrapper.getComponent(NSelect).text()).toContain('新标签')
  expect(wrapper.emitted('update:modelValue')?.length).toBe(updates)
  wrapper.unmount()
})

test('new numeric, partial range and formatted date/month controls preserve model and clearing types', async () => {
  const wrapper = mount(Search, {
    props: {
      modelValue: { count: 0, bounds: null, date: null, month: null },
      formItemList: [
        { type: 'number', prop: 'count', label: '数量', defaultValue: 0 },
        { type: 'number-range', prop: 'bounds', label: '数量范围' },
        { type: 'date', prop: 'date', valueMode: 'formatted' },
        { type: 'month', prop: 'month', valueMode: 'formatted' },
      ],
      config: { density: 'compact' },
    },
  })
  const numbers = wrapper.findAllComponents(NInputNumber)
  expect(numbers).toHaveLength(3)
  expect(numbers[0].props('value')).toBe(0)
  expect(numbers[0].props('showButton')).toBe(false)
  numbers[1].vm.$emit('update:value', 0)
  expect(wrapper.vm.formParams.bounds).toEqual([0, null])
  numbers[2].vm.$emit('update:value', 10)
  expect(wrapper.vm.formParams.bounds).toEqual([0, 10])
  await vi.waitFor(() =>
    expect(wrapper.findAllComponents(NDatePicker)).toHaveLength(2)
  )
  const dates = wrapper.findAllComponents(NDatePicker)
  expect(dates.map(date => date.props('type'))).toEqual(['date', 'month'])
  dates[0].vm.$emit('update:formattedValue', '2026-10-28', null)
  dates[1].vm.$emit('update:formattedValue', '2026-10', null)
  expect(wrapper.vm.formParams.date).toBe('2026-10-28')
  expect(wrapper.vm.formParams.month).toBe('2026-10')
  dates[0].vm.$emit('update:formattedValue', null, null)
  expect(wrapper.vm.formParams.date).toBeNull()
  wrapper.vm.cleanFn()
  expect(wrapper.vm.formParams).toEqual({
    count: 0,
    bounds: null,
    date: null,
    month: null,
  })
  wrapper.unmount()
})

test('custom slots and renderers use a guarded update channel including fixed and readonly fields', async () => {
  const wrapper = mount(Search, {
    props: {
      modelValue: { custom: 'first', fixed: false },
      formItemList: [
        { type: 'custom', prop: 'custom', slot: 'lookup', defaultValue: '' },
        {
          type: 'custom',
          prop: 'fixed',
          fixed: true,
          defaultValue: false,
          render: context =>
            h(
              'button',
              {
                class: 'fixed-update',
                type: 'button',
                onClick: () => context.updateValue(true),
              },
              String(context.value)
            ),
        },
      ],
    },
    slots: {
      lookup: ({ value, updateValue }) =>
        h(
          'button',
          {
            class: 'custom-update',
            type: 'button',
            onClick: () => updateValue('second'),
          },
          String(value)
        ),
    },
  })
  await wrapper.get('.custom-update').trigger('click')
  expect(wrapper.vm.formParams.custom).toBe('second')
  await wrapper.get('.fixed-update').trigger('click')
  expect(wrapper.vm.formParams.fixed).toBe(false)
  await wrapper.setProps({
    formItemList: [
      {
        type: 'custom',
        prop: 'custom',
        slot: 'lookup',
        readonly: true,
        defaultValue: '',
      },
    ],
  })
  await wrapper.get('.custom-update').trigger('click')
  expect(wrapper.vm.formParams.custom).toBe('second')
  wrapper.unmount()
})

test('dictionary options are shared, preserve boolean codes and update without replacing the draft', async () => {
  const request = deferred<readonly DictionaryOption[]>()
  let options: readonly DictionaryOption[] = []
  let listener: (() => void) | undefined
  const unsubscribe = vi.fn()
  const source: DictionarySource = {
    getOptions: () => options,
    load: vi.fn(() =>
      request.promise.then(value => {
        options = value
        return value
      })
    ),
    subscribe: callback => {
      listener = callback
      return unsubscribe
    },
  }
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: '', enabled: false },
      formItemList: [
        { type: 'input', prop: 'keyword' },
        { type: 'select', prop: 'enabled', dictionary: 'enabled' },
      ],
    },
    global: {
      provide: {
        [DICTIONARY_PROVIDER_KEY as symbol]: { getDictionary: () => source },
      },
    },
  })
  await wrapper.get('input').setValue('draft')
  request.resolve([
    { label: '停用', value: false },
    { label: '启用', value: true },
  ])
  await flushPromises()
  const select = wrapper.getComponent(NSelect)
  expect(select.text()).toContain('停用')
  expect(wrapper.vm.formParams.keyword).toBe('draft')
  const next = select.props('options')![1]
  select.vm.$emit('update:value', next.value, next)
  expect(wrapper.vm.formParams.enabled).toBe(true)
  options = [{ label: '可用', value: true }]
  listener?.()
  await nextTick()
  expect(select.text()).toContain('可用')
  expect(wrapper.vm.formParams.keyword).toBe('draft')
  wrapper.unmount()
  expect(unsubscribe).toHaveBeenCalled()
})

test('explicit select options take precedence without fetching an unused dictionary', async () => {
  const source: DictionarySource = {
    getOptions: () => [],
    load: vi.fn(async () => []),
  }
  const wrapper = mount(Search, {
    props: {
      modelValue: { enabled: false },
      formItemList: [
        {
          type: 'select',
          prop: 'enabled',
          dictionary: source,
          list: [{ label: '本地', value: false }],
        },
      ],
    },
  })
  await flushPromises()
  expect(wrapper.getComponent(NSelect).text()).toContain('本地')
  expect(source.load).not.toHaveBeenCalled()
  wrapper.unmount()
})

test('folded and hidden active conditions remain counted, including zero and false', async () => {
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: '', zero: 0, enabled: false, hidden: 'scope' },
      formItemList: [
        { type: 'input', prop: 'keyword' },
        { type: 'number', prop: 'zero' },
        { type: 'select', prop: 'enabled' },
        { type: 'input', prop: 'hidden', show: false, fixed: true },
      ],
      config: { foldThreshold: 1 },
    },
  })
  expect(wrapper.vm.hiddenActiveCount).toBe(3)
  expect(wrapper.get('[role="status"]').text()).toContain('3 项隐藏条件生效')
  wrapper.vm.changeFoldState()
  await nextTick()
  expect(wrapper.vm.hiddenActiveCount).toBe(1)
  wrapper.vm.cleanFn()
  expect(wrapper.vm.formParams.hidden).toBe('scope')
  wrapper.unmount()
})

test('grid layout responds to the panel container and clamps spans without remounting controls', async () => {
  const observed: Array<{
    callback: ResizeObserverCallback
    element?: Element
    disconnect: () => void
  }> = []
  vi.stubGlobal(
    'ResizeObserver',
    class {
      entry: (typeof observed)[number]
      constructor(callback: ResizeObserverCallback) {
        this.entry = { callback, disconnect: vi.fn() }
        observed.push(this.entry)
      }
      observe(element: Element) {
        this.entry.element = element
      }
      unobserve() {}
      disconnect() {
        this.entry.disconnect()
      }
    }
  )
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: '', range: null },
      formItemList: [
        { type: 'input', prop: 'keyword', label: '名称' },
        {
          type: 'number-range',
          prop: 'range',
          span: 2,
          minWidth: 300,
          label: '范围',
        },
      ],
      config: {
        density: 'compact',
        layout: 'grid',
        fieldMinWidth: 200,
        columns: 4,
        labelPlacement: 'left',
        labelWidth: 80,
      },
    },
  })
  const observer = observed.find(
    entry => entry.element === wrapper.get('.form-search-layout').element
  )!
  const resize = async (width: number) => {
    observer.callback(
      [{ contentRect: { width } } as ResizeObserverEntry],
      {} as ResizeObserver
    )
    await nextTick()
  }
  const { uid } = wrapper.getComponent(NInput).vm.$
  await resize(900)
  expect(wrapper.get('form').attributes('style')).toContain(
    'repeat(4, minmax(0, 1fr))'
  )
  expect(
    wrapper.findAll('.form-search-item-box')[1].attributes('style')
  ).toContain('span 2')
  expect(wrapper.getComponent(NForm).props('labelPlacement')).toBe('left')
  expect(wrapper.getComponent(NForm).props('labelWidth')).toBe(80)
  await resize(280)
  expect(wrapper.get('form').attributes('style')).toContain(
    'repeat(1, minmax(0, 1fr))'
  )
  expect(
    wrapper.findAll('.form-search-item-box')[1].attributes('style')
  ).toContain('span 1')
  expect(wrapper.getComponent(NInput).vm.$.uid).toBe(uid)
  wrapper.unmount()
  expect(observer.disconnect).toHaveBeenCalled()
})

test('legacy event-only search dispatches without fabricating a successful applied result', async () => {
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: 'query' },
      formItemList: [{ type: 'input', prop: 'keyword' }],
    },
  })
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(wrapper.emitted('search')).toEqual([[{ keyword: 'query' }]])
  expect(wrapper.vm.appliedParams).toBeNull()
  expect(wrapper.emitted('applied')).toBeUndefined()
  wrapper.unmount()
})

test('fixed context changes away and back still invalidate an earlier in-flight search', async () => {
  const request = deferred<void>()
  const wrapper = mount(Search, {
    props: {
      modelValue: { tenant: 'A', keyword: 'query' },
      formItemList: [
        { type: 'input', prop: 'tenant', fixed: true },
        { type: 'input', prop: 'keyword' },
      ],
      config: { onSearch: () => request.promise },
    },
  })
  const pending = wrapper.vm.searchFn()
  await flushPromises()
  await wrapper.setProps({ modelValue: { tenant: 'B', keyword: 'other' } })
  await wrapper.setProps({ modelValue: { tenant: 'A', keyword: 'query' } })
  request.resolve()
  expect(await pending).toBe(false)
  expect(wrapper.vm.appliedParams).toBeNull()
  wrapper.unmount()
})

test('dictionary failures stay local and can be retried through the native selector empty state', async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce([{ label: '停用', value: false }])
  const source: DictionarySource = { getOptions: () => [], load }
  const wrapper = mount(Search, {
    props: {
      modelValue: { enabled: false },
      formItemList: [
        {
          type: 'select',
          prop: 'enabled',
          dictionary: source,
          attrs: { show: true },
        },
      ],
    },
  })
  await flushPromises()
  const select = wrapper.getComponent(NSelect)
  expect(select.props('status')).toBe('error')
  const retry = wrapper
    .findAllComponents(NButton)
    .find(button => button.text() === '重试')
  expect(retry).toBeDefined()
  await retry!.trigger('click')
  await flushPromises()
  expect(load).toHaveBeenCalledTimes(2)
  expect(select.props('status')).toBeUndefined()
  expect(wrapper.vm.formParams.enabled).toBe(false)
  wrapper.unmount()
})
