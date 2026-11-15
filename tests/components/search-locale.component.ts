import { flushPromises, mount } from '@vue/test-utils'
import { NSelect } from 'naive-ui'
import { expect, test, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import FormSearchComponent from '../../src/components/C_FormSearch/index.vue'
import type {
  SearchFormItem,
  SearchFormParams,
} from '../../src/components/C_FormSearch/types'
import type { ComponentLocale } from '../../src/core/contracts'
import { COMPONENT_LOCALE_KEY } from '../../src/context'

const Search = FormSearchComponent<SearchFormParams>
const fields: SearchFormItem[] = [
  { type: 'select', prop: 'status', list: [] },
  {
    type: 'select',
    prop: 'remote',
    source: {
      request: async () => ({ rows: [], total: 0 }),
      value: () => 1,
      label: () => 'One',
    },
  },
  { type: 'select', prop: 'custom', placeholder: 'Business choice', list: [] },
  { type: 'select', prop: 'empty', placeholder: '', list: [] },
]

test('static and remote search select defaults follow local locale without replacing explicit text', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const wrapper = mount(Search, {
    props: { formItemList: fields, config: { locale } },
  })
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.findAllComponents(NSelect)).toHaveLength(4)
  )
  const placeholders = () =>
    wrapper
      .findAllComponents(NSelect)
      .map(select => select.props('placeholder'))
  expect(placeholders()).toEqual([
    'Please select',
    'Please select',
    'Business choice',
    'Please select',
  ])
  locale.locale = 'zh-CN'
  await nextTick()
  expect(placeholders()).toEqual([
    '请选择',
    '请选择',
    'Business choice',
    '请选择',
  ])
  locale.messages = { 'search.selectPlaceholder': 'Choose a record' }
  await nextTick()
  expect(placeholders()).toEqual([
    'Choose a record',
    'Choose a record',
    'Business choice',
    'Choose a record',
  ])
  expect(fields[0].placeholder).toBeUndefined()
  expect(fields[3].placeholder).toBe('')
})

test('search placeholder uses application locale and preserves local and application isolation', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const first = mount(Search, {
    props: { formItemList: [fields[0]] },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: locale } },
  })
  const second = mount(Search, {
    props: { formItemList: [fields[0]] },
  })
  expect(first.getComponent(NSelect).props('placeholder')).toBe('Please select')
  expect(second.getComponent(NSelect).props('placeholder')).toBe('请选择')
  await first.setProps({ config: { locale: { locale: 'zh-CN' } } })
  expect(first.getComponent(NSelect).props('placeholder')).toBe('请选择')
  await first.setProps({ config: {} })
  locale.t = key => `translated:${key}`
  await nextTick()
  expect(first.getComponent(NSelect).props('placeholder')).toBe(
    'translated:search.selectPlaceholder'
  )
  expect(second.getComponent(NSelect).props('placeholder')).toBe('请选择')
})

test('search history clear text follows locale and still clears only its history', async () => {
  const locale = reactive<ComponentLocale>({ locale: 'en-US' })
  const wrapper = mount(Search, {
    props: {
      modelValue: { keyword: 'draft' },
      formItemList: [{ type: 'input', prop: 'keyword', hisList: ['previous'] }],
      config: { locale },
    },
  })
  await wrapper.get('input').trigger('focus')
  expect(wrapper.get('.clear-all').text()).toBe('Clear history')
  locale.locale = 'zh-CN'
  await nextTick()
  expect(wrapper.get('.clear-all').text()).toBe('清空历史记录')
  await wrapper.get('.clear-all').trigger('click')
  expect(wrapper.find('.input-history').exists()).toBe(false)
  expect(wrapper.vm.formParams.keyword).toBe('draft')
  expect(wrapper.emitted('search')).toBeUndefined()
})
