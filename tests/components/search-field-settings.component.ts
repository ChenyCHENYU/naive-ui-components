import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NCascader, NInput, NTreeSelect } from 'naive-ui'
import Search from '../../src/components/C_FormSearch/index.vue'
import type {
  SearchFormItem,
  SearchConfig,
  SearchFormParams,
} from '../../src/components/C_FormSearch/types'
import Settings from '../../src/components/C_FormSearch/SearchFieldSettings.vue'
import { serializeSearch } from '../../src/components/C_FormSearch/serializeSearch'

const DynamicSearch = Search<SearchFormParams>
const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  localStorage.clear()
})
const fields: SearchFormItem<typeof model>[] = [
  { type: 'input', prop: 'tenant', label: 'Tenant', fixed: true },
  { type: 'input', prop: 'keyword', label: 'Keyword' },
  { type: 'input', prop: 'extra', label: 'Extra' },
  { type: 'input', prop: 'secret', label: 'Secret', show: false },
]
const model = { tenant: 't1', keyword: 'old', extra: 'kept', secret: 'context' }
const ModelSearch = Search<typeof model>

async function settings(wrapper: ReturnType<typeof mount>) {
  await vi.waitFor(() =>
    expect(wrapper.findComponent(Settings).exists()).toBe(true)
  )
  return wrapper.getComponent(Settings)
}

test('field preferences cannot reveal business-hidden fields, hide fixed conditions or mutate drafts', async () => {
  const onSearch = vi.fn()
  const wrapper = mount(ModelSearch, {
    props: {
      modelValue: model,
      formItemList: fields,
      config: {
        requireValue: false,
        fieldSettings: {
          defaultVisibleKeys: ['keyword'],
          lockedKeys: ['secret'],
        },
        onSearch,
      },
    },
  })
  wrappers.push(wrapper)
  const control = await settings(wrapper)
  expect(wrapper.findAllComponents(NInput)).toHaveLength(2)
  expect(control.props('fields').map(field => field.key)).toEqual([
    'tenant',
    'keyword',
    'extra',
  ])
  control.vm.$emit('update', ['extra', 'secret', 'unknown'])
  await flushPromises()
  expect(wrapper.vm.visibleFields).toEqual(['tenant', 'extra'])
  expect(wrapper.vm.formParams).toEqual(model)
  expect(wrapper.vm.hiddenActiveCount).toBe(2)
  expect(await wrapper.vm.searchFn()).toBe(true)
  expect(onSearch).toHaveBeenCalledWith(model)
  expect(
    serializeSearch(model, fields, {
      scope: 'active',
      visibleFields: wrapper.vm.visibleFields,
    })
  ).toEqual({ tenant: 't1', extra: 'kept' })
})

test('controlled visibility waits for its owner, scopes storage and ignores unknown or obsolete keys', async () => {
  const wrapper = mount(ModelSearch, {
    props: {
      modelValue: model,
      formItemList: fields,
      visibleFields: ['keyword'],
      config: { fieldSettings: true },
    },
  })
  wrappers.push(wrapper)
  ;(await settings(wrapper)).vm.$emit('update', ['extra'])
  await flushPromises()
  expect(wrapper.vm.visibleFields).toEqual(['tenant', 'keyword'])
  expect(wrapper.emitted('update:visibleFields')?.at(-1)).toEqual([
    ['tenant', 'extra'],
  ])
  await wrapper.setProps({ visibleFields: ['extra'] })
  expect(wrapper.vm.visibleFields).toEqual(['tenant', 'extra'])
})

test('uncontrolled storage is explicit, scoped, versioned and resilient to malformed records', async () => {
  const config = {
    fieldSettings: {
      persistKey: 'prefs',
      scope: 'a',
      defaultVisibleKeys: ['keyword'],
    },
  } satisfies SearchConfig<typeof model>
  const wrapper = mount(ModelSearch, {
    props: { modelValue: model, formItemList: fields, config },
  })
  wrappers.push(wrapper)
  ;(await settings(wrapper)).vm.$emit('update', ['extra'])
  await flushPromises()
  await wrapper.setProps({
    config: { fieldSettings: { ...config.fieldSettings, scope: 'b' } },
  })
  await flushPromises()
  expect(wrapper.vm.visibleFields).toEqual(['tenant', 'keyword'])
  await wrapper.setProps({ config })
  await flushPromises()
  expect(wrapper.vm.visibleFields).toEqual(['tenant', 'extra'])
  await wrapper.setProps({
    config: { fieldSettings: { ...config.fieldSettings, version: 2 } },
  })
  await flushPromises()
  expect(wrapper.vm.visibleFields).toEqual(['tenant', 'keyword'])
  localStorage.setItem('c-search-fields:["prefs","broken"]', '{')
  await wrapper.setProps({
    config: { fieldSettings: { ...config.fieldSettings, scope: 'broken' } },
  })
  await flushPromises()
  expect(wrapper.vm.visibleFields).toEqual(['tenant', 'keyword'])
})

test('tree and cascader fields use leaf keys and preserve multiple/readonly/reset contracts', async () => {
  const wrapper = mount(DynamicSearch, {
    props: {
      modelValue: { tree: [0], branch: 'leaf' },
      formItemList: [
        {
          type: 'treeSelect',
          prop: 'tree',
          attrs: { multiple: true },
          list: [{ key: 0, label: 'Zero' }],
        },
        {
          type: 'cascader',
          prop: 'branch',
          readonly: true,
          list: [{ value: 'leaf', label: 'Leaf' }],
        },
      ],
    },
  })
  wrappers.push(wrapper)
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NTreeSelect).exists()).toBe(true)
  )
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NCascader).exists()).toBe(true)
  )
  expect(wrapper.getComponent(NTreeSelect).props('value')).toEqual([0])
  wrapper.getComponent(NTreeSelect).vm.$emit('update:value', null)
  wrapper.getComponent(NCascader).vm.$emit('update:value', 'other')
  await flushPromises()
  expect(wrapper.vm.formParams).toEqual({ tree: [], branch: 'leaf' })
  wrapper.vm.cleanFn()
  expect(wrapper.vm.formParams).toEqual({ tree: [], branch: null })
})

test('hierarchy options retain failure feedback, retry, key mapping and guarded readonly updates', async () => {
  const retry = vi.fn()
  const wrapper = mount(DynamicSearch, {
    props: {
      modelValue: { region: 0 },
      formItemList: [
        {
          type: 'treeSelect',
          prop: 'region',
          readonly: true,
          attrs: { keyField: 'id', labelField: 'name', childrenField: 'nodes' },
          list: [{ id: 0, name: 'Root' }],
          optionsState: { error: new Error('offline'), retry },
        },
      ],
    },
  })
  wrappers.push(wrapper)
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NTreeSelect).exists()).toBe(true)
  )
  const tree = wrapper.getComponent(NTreeSelect)
  expect(tree.props('keyField')).toBe('id')
  expect(tree.props('labelField')).toBe('name')
  expect(tree.props('value')).toBe(0)
  expect(wrapper.get('[role="alert"]').text()).toContain('选项加载失败')
  await wrapper.get('[role="alert"] button').trigger('click')
  expect(retry).toHaveBeenCalledOnce()
  tree.vm.$emit('update:value', 2)
  expect(wrapper.vm.formParams).toEqual({ region: 0 })
})

test('preferences stay disabled by default and metadata changes cannot resurrect hidden fields', async () => {
  const wrapper = mount(ModelSearch, {
    props: { modelValue: model, formItemList: fields, visibleFields: [] },
  })
  wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.findComponent(Settings).exists()).toBe(false)
  expect(wrapper.findAllComponents(NInput)).toHaveLength(3)
  expect(localStorage.length).toBe(0)
  await wrapper.setProps({
    visibleFields: undefined,
    config: { fieldSettings: true },
  })
  ;(await settings(wrapper)).vm.$emit('update', ['tenant', 'extra'])
  await flushPromises()
  await wrapper.setProps({
    formItemList: fields.map(field =>
      field.prop === 'extra' ? { ...field, show: false } : field
    ),
  })
  await flushPromises()
  expect(wrapper.vm.visibleFields).toEqual(['tenant'])
  expect(wrapper.vm.formParams.extra).toBe('kept')
})
