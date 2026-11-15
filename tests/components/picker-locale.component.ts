import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { expect, test, vi } from 'vitest'
import DataPicker from '../../src/components/C_DataPicker/index.vue'
import UserPicker from '../../src/components/C_UserPicker/index.vue'
import Tree from '../../src/components/C_Tree/index.vue'
import { COMPONENT_LOCALE_KEY } from '../../src/context'
import { useComponentLocale } from '../../src/composables/useComponentLocale'
import type { ComponentLocale } from '../../src/core/contracts'
import type { DataPickerSourceInput } from '../../src/components/C_DataPicker/types'

interface Person {
  id: string
  name: string
}
interface Filters {
  department?: string
}
interface Department {
  id: string
  name: string
}
const source = {
  rowKey: 'id',
  label: person => person.name,
  request: async () => ({ rows: [], total: 0 }),
} satisfies DataPickerSourceInput<Person, Filters>

test('picker category tree inherits local locale and messages without changing another application', async () => {
  const application = reactive<ComponentLocale>({ locale: 'zh-CN' })
  const wrapper = mount(DataPicker<Person, Filters>, {
    props: {
      source,
      columns: [],
      presentation: 'inline',
      locale: {
        locale: 'en-US',
        messages: { 'tree.expandAll': 'Expand categories' },
      },
      navigation: {
        field: 'department',
        options: [{ key: 'engineering', label: 'Engineering' }],
      },
    },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: application } },
  })
  const outside = mount(Tree, {
    props: { data: [], addable: false, refreshable: false },
    global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: application } },
  })
  await wrapper.get('.c-data-picker__open').trigger('click')
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.findComponent(Tree).exists()).toBe(true)
  )
  const tree = wrapper.getComponent(Tree)
  expect(tree.get('input').attributes('aria-label')).toBe('Search tree nodes')
  expect(tree.text()).toContain('Expand categories')
  expect(wrapper.text()).toContain('All categories')
  expect(outside.get('input').attributes('aria-label')).toBe('搜索树节点')
  await wrapper.setProps({ locale: { locale: 'zh-CN' } })
  expect(tree.get('input').attributes('aria-label')).toBe('搜索树节点')
  expect(tree.text()).toContain('展开全部')
  await wrapper.setProps({ locale: undefined })
  application.locale = 'en-US'
  await nextTick()
  expect(tree.get('input').attributes('aria-label')).toBe('Search tree nodes')
  expect(outside.get('input').attributes('aria-label')).toBe(
    'Search tree nodes'
  )
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
})

test('user picker organization tree preserves translator priority across local and application updates', async () => {
  const application = reactive<ComponentLocale>({
    locale: 'zh-CN',
    t: key => `application:${key}`,
  })
  const wrapper = mount(
    UserPicker<Person, Filters, Department, false, string>,
    {
      props: {
        source,
        presentation: 'inline',
        locale: {
          locale: 'en-US',
          messages: { 'tree.search': 'Message fallback' },
          t: key => `local:${key}`,
        },
        organization: {
          field: 'department',
          data: [{ id: 'engineering', name: 'Engineering' }],
        },
      },
      global: { provide: { [COMPONENT_LOCALE_KEY as symbol]: application } },
    }
  )
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.findComponent(Tree).exists()).toBe(true)
  )
  const tree = wrapper.getComponent(Tree)
  expect(tree.get('input').attributes('aria-label')).toBe('local:tree.search')
  await wrapper.setProps({
    locale: { messages: { 'tree.search': 'Message fallback' } },
  })
  expect(tree.get('input').attributes('aria-label')).toBe(
    'application:tree.search'
  )
  application.t = undefined
  await nextTick()
  expect(tree.get('input').attributes('aria-label')).toBe('Message fallback')
  expect(application.messages).toBeUndefined()
})

test('forwarding picker locale preserves a nested component message override', async () => {
  const NestedField = defineComponent({
    setup() {
      const { t } = useComponentLocale({
        messages: { 'common.confirm': 'Nested confirmation' },
      })
      return () => h('span', { class: 'nested-field' }, t('common.confirm'))
    },
  })
  const wrapper = mount(DataPicker<Person, Filters>, {
    props: {
      source,
      columns: [],
      presentation: 'inline',
      locale: { messages: { 'common.confirm': 'Picker confirmation' } },
    },
    slots: { query: () => h(NestedField) },
  })
  await wrapper.get('.c-data-picker__open').trigger('click')
  await flushPromises()
  expect(wrapper.get('.nested-field').text()).toBe('Nested confirmation')
  expect(wrapper.get('.c-data-picker__footer').text()).toContain(
    'Picker confirmation'
  )
})

test('category tree responds to message keys being added and removed at both locale levels', async () => {
  const localMessages = reactive<Record<string, string>>({})
  const applicationMessages = reactive<Record<string, string>>({})
  const wrapper = mount(DataPicker<Person, Filters>, {
    props: {
      source,
      columns: [],
      presentation: 'inline',
      locale: { locale: 'en-US', messages: localMessages },
      navigation: {
        field: 'department',
        options: [{ key: 'engineering', label: 'Engineering' }],
      },
    },
    global: {
      provide: {
        [COMPONENT_LOCALE_KEY as symbol]: {
          locale: 'zh-CN',
          messages: applicationMessages,
        },
      },
    },
  })
  await wrapper.get('.c-data-picker__open').trigger('click')
  await flushPromises()
  await vi.waitFor(() =>
    expect(wrapper.findComponent(Tree).exists()).toBe(true)
  )
  const label = () =>
    wrapper.getComponent(Tree).get('input').attributes('aria-label')
  expect(label()).toBe('Search tree nodes')
  applicationMessages['tree.search'] = 'Application search'
  await nextTick()
  expect(label()).toBe('Application search')
  localMessages['tree.search'] = 'Local search'
  await nextTick()
  expect(label()).toBe('Local search')
  delete localMessages['tree.search']
  await nextTick()
  expect(label()).toBe('Application search')
  delete applicationMessages['tree.search']
  await nextTick()
  expect(label()).toBe('Search tree nodes')
})
