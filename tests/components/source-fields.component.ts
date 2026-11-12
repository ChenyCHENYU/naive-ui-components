import { flushPromises, mount } from '@vue/test-utils'
import { NAutoComplete, NSelect } from 'naive-ui'
import { defineComponent, h, ref } from 'vue'
import { expect, test, vi } from 'vitest'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'
import {
  createAutoCompleteField,
  createSelectField,
} from '../../src/components/C_Form/fieldRenderers'
import type { FormOption } from '../../src/components/C_Form/types'
import type { SearchFormItem } from '../../src/components/C_FormSearch/types'
import type { OptionSource } from '../../src/core/optionSource'

interface Location {
  id: number
  code: string
  address: string
}
interface Model {
  warehouse: string
  location: number | null
  text: string
  address: string
}
const rows: Location[] = [{ id: 0, code: '库位零', address: 'A区' }]

function createSource(): OptionSource<Location, number, { warehouse: string }> {
  return {
    debounce: 0,
    minChars: 1,
    request: vi.fn(async () => ({ rows, total: rows.length })),
    value: row => row.id,
    label: row => row.code,
    resolve: async () => rows,
  }
}

test.each(['form', 'search'] as const)(
  '%s 的字段来源接收搜索及模型依赖，自动补全文本可直接清空',
  async kind => {
    const source = createSource()
    const legacyLoader = vi.fn(async () => [])
    const model = ref<Model>({
      warehouse: 'A',
      location: null,
      text: '',
      address: '',
    })
    const fields: FormOption<Model>[] = [
      { type: 'input', prop: 'warehouse' },
      {
        type: 'select',
        prop: 'location',
        asyncOptions: legacyLoader,
        source: values => ({
          ...source,
          filters: { warehouse: values.warehouse },
        }),
      },
      { type: 'autocomplete', prop: 'text', source },
    ]
    const searchFields: SearchFormItem<Model>[] = [
      { type: 'input', prop: 'warehouse' },
      {
        type: 'select',
        prop: 'location',
        source: values => ({
          ...source,
          filters: { warehouse: values.warehouse },
        }),
      },
      { type: 'autocomplete', prop: 'text', source },
    ]
    const wrapper = mount(
      defineComponent(
        () => () =>
          kind === 'form'
            ? h(C_Form<Model>, {
                modelValue: model.value,
                'onUpdate:modelValue': value => {
                  model.value = value
                },
                options: fields,
              })
            : h(C_FormSearch<Model>, {
                modelValue: model.value,
                'onUpdate:modelValue': value => {
                  model.value = value
                },
                formItemList: searchFields,
              })
      )
    )
    await vi.waitFor(() =>
      expect(wrapper.findComponent(NSelect).exists()).toBe(true)
    )
    const select = wrapper.getComponent(NSelect)
    select.vm.$emit('update:show', true)
    select.vm.$emit('search', '零')
    await vi.waitFor(() =>
      expect(source.request).toHaveBeenCalledWith(
        expect.objectContaining({ search: '零', filters: { warehouse: 'A' } })
      )
    )
    expect(legacyLoader).not.toHaveBeenCalled()
    model.value.warehouse = 'B'
    await vi.waitFor(() =>
      expect(source.request).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: '零', filters: { warehouse: 'B' } })
      )
    )
    await vi.waitFor(() =>
      expect(wrapper.findComponent(NAutoComplete).exists()).toBe(true)
    )
    const input = wrapper.getComponent(NAutoComplete)
    input.vm.$emit('update:value', '自由备注')
    await flushPromises()
    expect(model.value.text).toBe('自由备注')
    input.vm.$emit('update:value', null)
    await flushPromises()
    expect(model.value.text).toBe('')
  }
)

test('表单来源助手从原始记录回填多个字段并在清空时交付 null', async () => {
  const source = createSource()
  const model = ref<Model>({
    warehouse: 'A',
    location: null,
    text: '',
    address: '',
  })
  const onSelect = vi.fn((row: Location | null) => {
    model.value.address = row?.address ?? ''
  })
  const renderers = {
    location: createSelectField({ source, clearable: true, onSelect }),
    text: createAutoCompleteField({
      source,
      onSelect: row => {
        model.value.address = row.address
      },
      'onUpdate:modelValue': value => {
        if (!value) model.value.address = ''
      },
    }),
  }
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(C_Form<Model>, {
          modelValue: model.value,
          'onUpdate:modelValue': value => {
            model.value = value
          },
          options: [
            { type: 'location', prop: 'location' },
            { type: 'text', prop: 'text' },
          ],
          renderers,
        })
    )
  )
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NSelect).exists()).toBe(true)
  )
  const select = wrapper.getComponent(NSelect)
  select.vm.$emit('update:show', true)
  select.vm.$emit('search', '零')
  await vi.waitFor(() => expect(select.props('options')).toHaveLength(1))
  const option = select.props('options')![0]
  select.vm.$emit('update:value', 0, option)
  await flushPromises()
  expect(onSelect).toHaveBeenLastCalledWith(rows[0])
  expect(model.value).toMatchObject({ location: 0, address: 'A区' })
  select.vm.$emit('update:value', null, null)
  await flushPromises()
  expect(onSelect).toHaveBeenLastCalledWith(null)
  expect(model.value).toMatchObject({ location: null, address: '' })
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NAutoComplete).exists()).toBe(true)
  )
  const autocomplete = wrapper.getComponent(NAutoComplete)
  autocomplete.vm.$emit('update:value', '库')
  await vi.waitFor(() => expect(autocomplete.props('options')).toHaveLength(1))
  const suggestion = autocomplete.props('options')![0]
  if (typeof suggestion === 'string') throw new Error('预期完整候选项')
  autocomplete.vm.$emit('select', suggestion.value)
  autocomplete.vm.$emit('update:value', suggestion.label)
  await flushPromises()
  expect(model.value).toMatchObject({ text: '库位零', address: 'A区' })
  autocomplete.vm.$emit('update:value', null)
  await flushPromises()
  expect(model.value).toMatchObject({ text: '', address: '' })
})

test('已有 select 观察者继续接收解码值，并保留完整 option 第二参数', async () => {
  const observer = vi.fn()
  const option = { value: 0, label: '零', address: 'A区' }
  const wrapper = mount(C_Form<{ location: number | null }>, {
    props: {
      modelValue: { location: null },
      options: [
        {
          type: 'select',
          prop: 'location',
          children: [option],
          attrs: { 'onUpdate:value': observer },
        },
      ],
    },
  })
  const native = wrapper.getComponent(NSelect)
  const selected = native.props('options')![0]
  native.vm.$emit('update:value', 0, selected)
  expect(observer).toHaveBeenCalledExactlyOnceWith(0, selected)
  expect(wrapper.vm.getModel().location).toBe(0)
})
