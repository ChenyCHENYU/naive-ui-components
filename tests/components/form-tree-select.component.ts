import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NTreeSelect, type TreeSelectOption } from 'naive-ui'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'
import type { FormOption } from '../../src/components/C_Form'
import type { SearchFormItem } from '../../src/components/C_FormSearch'

interface Model {
  department: number | null
  departments: number[]
}

const tree = (): TreeSelectOption[] => [
  {
    key: 10,
    label: '总部',
    children: [
      { key: 0, label: '研发' },
      { key: 1, label: '停用部门', disabled: true },
    ],
  },
]
const openTree = {
  show: true,
  to: false,
  virtualScroll: false,
  defaultExpandAll: true,
}
const settle = async () => {
  await vi.dynamicImportSettled()
  await flushPromises()
}

test('Form renders native tree keys including zero and follows controlled parent updates', async () => {
  const options: FormOption<Model>[] = [
    {
      type: 'treeSelect',
      prop: 'department',
      children: tree(),
      attrs: openTree,
    },
  ]
  const wrapper = mount(C_Form<Model>, {
    props: {
      options,
      modelValue: { department: 10, departments: [] },
      config: { showActions: false },
    },
  })
  await settle()
  const select = wrapper.getComponent(NTreeSelect)
  const leaf = select
    .findAll('.n-tree-node-content__text')
    .find(node => node.text() === '研发')!
  await leaf.trigger('click')
  await flushPromises()
  expect(wrapper.vm.getModel().department).toBe(0)
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({
    department: 0,
    departments: [],
  })
  expect(select.get('.n-base-selection-label').text()).toContain('研发')
  await wrapper.setProps({
    modelValue: { department: 10, departments: [] },
  })
  expect(select.props('value')).toBe(10)
  expect(select.get('.n-base-selection-label').text()).toContain('总部')
})

test('Form keeps async results above attrs.options above children without rewriting custom keys', async () => {
  const children = [
    { id: 0, name: '静态', nodes: [{ id: 2, name: '静态子项' }] },
  ]
  const nativeOptions = [
    { id: 0, name: '原生', nodes: [{ id: 2, name: '原生子项' }] },
  ]
  const loaded = [{ id: 0, name: '远程', nodes: [{ id: 2, name: '远程子项' }] }]
  let complete!: (rows: TreeSelectOption[]) => void
  const pending = new Promise<TreeSelectOption[]>(resolve => {
    complete = resolve
  })
  const asyncOptions = vi
    .fn()
    .mockReturnValueOnce(pending)
    .mockResolvedValueOnce([])
  const options: FormOption<Model>[] = [
    {
      type: 'treeSelect',
      prop: 'department',
      children,
      attrs: {
        keyField: 'id',
        labelField: 'name',
        childrenField: 'nodes',
        options: nativeOptions,
      },
      asyncOptions,
    },
  ]
  const original = JSON.stringify([children, nativeOptions, loaded])
  const wrapper = mount(C_Form<Model>, {
    props: {
      options,
      modelValue: { department: 0, departments: [] },
      config: { showActions: false },
    },
  })
  await settle()
  const select = wrapper.getComponent(NTreeSelect)
  expect(select.props('options')).toEqual(nativeOptions)
  expect(select.get('.n-base-selection-label').text()).toContain('原生')
  expect(select.props()).toMatchObject({
    keyField: 'id',
    labelField: 'name',
    childrenField: 'nodes',
    value: 0,
  })
  complete(loaded)
  await flushPromises()
  expect(select.props('options')).toEqual(loaded)
  expect(select.get('.n-base-selection-label').text()).toContain('远程')
  await wrapper.vm.reloadOptions('department')
  await flushPromises()
  expect(select.props('options')).toEqual([])
  expect(wrapper.vm.getModel().department).toBe(0)
  expect(JSON.stringify([children, nativeOptions, loaded])).toBe(original)
})

test('Form forwards native cascade, child strategy and disabled-node rules', async () => {
  const options: FormOption<Model>[] = [
    {
      type: 'treeSelect',
      prop: 'departments',
      children: tree(),
      attrs: {
        ...openTree,
        multiple: true,
        checkable: true,
        cascade: true,
        checkStrategy: 'child',
      },
    },
  ]
  const wrapper = mount(C_Form<Model>, {
    props: {
      options,
      modelValue: { department: null, departments: [] },
      config: { showActions: false },
    },
  })
  await settle()
  const select = wrapper.getComponent(NTreeSelect)
  await select.findAll('.n-checkbox')[0]!.trigger('click')
  await flushPromises()
  expect(wrapper.vm.getModel().departments).toEqual([0])
  await select.findAll('.n-checkbox').at(-1)!.trigger('click')
  expect(wrapper.vm.getModel().departments).toEqual([0])
  await wrapper.setProps({ config: { readonly: true, showActions: false } })
  expect(select.props('disabled')).toBe(true)
  select.vm.$emit('update:value', [10])
  expect(wrapper.vm.getModel().departments).toEqual([0])
})

test('legacy value tree options remain usable through the native keyField', async () => {
  const options: FormOption<Model>[] = [
    {
      type: 'treeSelect',
      prop: 'department',
      children: [{ value: 0, label: '旧选项' }],
      attrs: { keyField: 'value' },
    },
  ]
  const wrapper = mount(C_Form<Model>, {
    props: {
      options,
      modelValue: { department: 0, departments: [] },
      config: { showActions: false },
    },
  })
  await settle()
  expect(wrapper.getComponent(NTreeSelect).props('value')).toBe(0)
  expect(wrapper.get('.n-base-selection-label').text()).toContain('旧选项')
})

test('Search preserves native options precedence, custom mappings and controlled zero values', async () => {
  const fields = [
    {
      type: 'treeSelect',
      prop: 'department',
      list: [{ id: 0, name: '列表' }],
      attrs: {
        keyField: 'id',
        labelField: 'name',
        options: [{ id: 0, name: '原生' }],
      },
    },
  ] satisfies SearchFormItem<Model>[]
  const wrapper = mount(C_FormSearch<Model>, {
    props: {
      formItemList: fields,
      modelValue: { department: 0, departments: [] },
    },
  })
  await settle()
  const select = wrapper.getComponent(NTreeSelect)
  expect(select.props('value')).toBe(0)
  expect(select.get('.n-base-selection-label').text()).toContain('原生')
  await wrapper.setProps({
    formItemList: [
      { ...fields[0], attrs: { keyField: 'id', labelField: 'name' } },
    ],
  })
  expect(select.get('.n-base-selection-label').text()).toContain('列表')
  await wrapper.setProps({ modelValue: { department: null, departments: [] } })
  expect(select.props('value')).toBeNull()
})

test('Search keeps native parent-child checking and fixed-field protection', async () => {
  const fields = [
    {
      type: 'treeSelect',
      prop: 'departments',
      list: tree(),
      attrs: {
        ...openTree,
        multiple: true,
        checkable: true,
        cascade: true,
        checkStrategy: 'child',
      },
    },
  ] satisfies SearchFormItem<Model>[]
  const wrapper = mount(C_FormSearch<Model>, {
    props: {
      formItemList: fields,
      modelValue: { department: null, departments: [] },
    },
  })
  await settle()
  const select = wrapper.getComponent(NTreeSelect)
  await select.findAll('.n-checkbox')[0]!.trigger('click')
  await flushPromises()
  expect(wrapper.vm.formParams.departments).toEqual([0])
  await wrapper.setProps({ formItemList: [{ ...fields[0], fixed: true }] })
  expect(select.props('disabled')).toBe(true)
  select.vm.$emit('update:value', [])
  expect(wrapper.vm.formParams.departments).toEqual([0])
})
