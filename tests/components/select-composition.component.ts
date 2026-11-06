import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NCascader, NSelect, NTreeSelect } from 'naive-ui'
import { defineComponent, h } from 'vue'
import C_Select from '../../src/components/C_Select/index.vue'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'

const options = [
  { value: false, label: '未启用' },
  { value: 0, label: '零' },
  { value: '0', label: '字符串零' },
]
type TagsModel = { tags: Array<string | number | boolean> }

test('bare multiple and tag attributes enable the standard Boolean prop behavior', () => {
  const Host = defineComponent({
    render: () =>
      // Vue passes an empty string for bare Boolean attributes before runtime casting.
      h(C_Select, {
        multiple: '',
        tag: '',
        modelValue: [0, '0'],
        options,
      } as never),
  })
  const wrapper = mount(Host)
  const select = wrapper.getComponent(NSelect)
  expect(select.props('multiple')).toBe(true)
  expect(select.props('tag')).toBe(true)
  expect(select.text()).toContain('+1')
  wrapper.unmount()
})

test('standalone multiple select preserves values, free tags and summary when selecting or clearing', async () => {
  const wrapper = mount(C_Select<string | number | boolean, true, true>, {
    props: {
      multiple: true,
      filterable: true,
      tag: true,
      options,
      modelValue: [false, 0, '0'],
    },
  })
  const select = wrapper.getComponent(NSelect)
  const native = select.props('options')!
  expect(select.text()).toContain('未启用')
  expect(select.text()).toContain('+2')
  expect(select.text()).not.toContain('字符串零')
  select.vm.$emit(
    'update:value',
    [native[0].value, native[1].value, '手工输入'],
    [native[0], native[1], { label: '手工输入', value: '手工输入' }]
  )
  expect(wrapper.emitted('update:modelValue')).toEqual([
    [[false, 0, '手工输入']],
  ])
  await wrapper.setProps({ modelValue: [false, 0, '手工输入'] })
  expect(select.props('options')).toBe(native)
  select.vm.$emit('update:value', null, null)
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
  await wrapper.setProps({ readonly: true, maxTagCount: 3 })
  expect(select.props('disabled')).toBe(true)
  expect(select.text()).toContain('手工输入')
  select.vm.$emit('update:value', [], [])
  expect(wrapper.emitted('update:modelValue')).toHaveLength(2)
  wrapper.unmount()
})

test('form and search reuse summary behavior and preserve caller tag-count overrides', async () => {
  const form = mount(C_Form<TagsModel>, {
    props: {
      options: [
        { type: 'select', prop: 'tags', attrs: { multiple: true, options } },
      ],
    },
  })
  const search = mount(C_FormSearch<TagsModel>, {
    props: {
      formItemList: [
        {
          type: 'select',
          prop: 'tags',
          list: options,
          attrs: { multiple: true, maxTagCount: 2 },
        },
      ],
      modelValue: { tags: [false, 0, '0'] },
    },
  })
  expect(form.vm.getModel().tags).toEqual([])
  const formSelect = form.getComponent(NSelect)
  const native = formSelect.props('options')!
  const selected = native.slice(0, 3)
  formSelect.vm.$emit(
    'update:value',
    selected.map(item => item.value),
    selected
  )
  await flushPromises()
  expect(formSelect.props('options')).toBe(native)
  expect(form.vm.getModel().tags).toEqual([false, 0, '0'])
  expect(formSelect.text()).toContain('+2')
  expect(search.getComponent(NSelect).text()).toContain('+1')
  form.unmount()
  search.unmount()
})

test('linked cascader forwards cached options with numeric zero and lazy treeSelect accepts native options', async () => {
  const staticOptions = [{ value: 1, label: '静态区域' }]
  const wrapper = mount(
    C_Form<{ category: string; area: number; parent: number }>,
    {
      props: {
        modelValue: { category: '华东', area: 0, parent: 0 },
        options: [
          { type: 'input', prop: 'category' },
          {
            type: 'cascader',
            prop: 'area',
            children: staticOptions,
            dependsOn: 'category',
            asyncOptions: async model => [
              { value: 0, label: `${String(model.category)}区域` },
            ],
          },
          {
            type: 'treeSelect',
            prop: 'parent',
            attrs: { options: [{ key: 0, label: '根部门' }] },
          },
        ],
      },
    }
  )
  await vi.waitFor(() => {
    expect(wrapper.getComponent(NCascader).text()).toContain('华东区域')
    expect(wrapper.getComponent(NTreeSelect).text()).toContain('根部门')
  })
  await wrapper.vm.setFieldValue('category', '华南')
  await vi.waitFor(() =>
    expect(wrapper.getComponent(NCascader).text()).toContain('华南区域')
  )
  expect(wrapper.vm.getModel().area).toBe(0)
  expect(wrapper.vm.getModel().parent).toBe(0)
  wrapper.unmount()
})
