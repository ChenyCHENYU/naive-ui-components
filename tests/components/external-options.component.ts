import { expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import {
  NSelect,
  NRadioGroup,
  NRadio,
  NCheckboxGroup,
  NCheckbox,
  NCascader,
} from 'naive-ui'
import C_Form from '../../src/components/C_Form/index.vue'
import C_Table from '../../src/components/C_Table/index.vue'
import type { FormOption, FormRecord } from '../../src/components/C_Form/types'

test('controlled external state never fetches and leaves validation feedback visible', async () => {
  const retry = vi.fn().mockRejectedValue(new Error('still offline'))
  const fields: FormOption[] = [
    {
      prop: 'kind',
      type: 'select',
      label: '类别',
      required: true,
      rules: [{ required: true, message: '请选择类别' }],
      children: [],
      optionsState: { loading: false, error: new Error('offline'), retry },
    },
  ]
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      options: fields,
      modelValue: { kind: null },
      config: { showActions: false },
    },
  })
  await flushPromises()
  expect(retry).not.toHaveBeenCalled()
  expect(wrapper.get('[role="alert"]').text()).toContain('选项加载失败')
  await expect(wrapper.vm.validate()).rejects.toBeDefined()
  expect(wrapper.text()).toContain('请选择类别')
  const select = wrapper.getComponent(NSelect).element
  const button = wrapper.get('.c-form-option-retry')
  await button.trigger('click')
  await flushPromises()
  expect(retry).toHaveBeenCalledOnce()
  await wrapper.setProps({
    options: [
      { ...fields[0], optionsState: { loading: true, error: null, retry } },
    ],
  })
  expect(wrapper.getComponent(NSelect).element).toBe(select)
  expect(wrapper.getComponent(NSelect).props('loading')).toBe(true)
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(wrapper.text()).toContain('请选择类别')
  expect(wrapper.vm.getModel().kind).toBeNull()
  wrapper.unmount()
})

test('ordinary form selections preserve boolean and string values without a data plugin', async () => {
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      modelValue: { enabled: false },
      config: { showActions: false },
      options: [
        {
          prop: 'enabled',
          type: 'select',
          children: [
            { value: false, label: '停用' },
            { value: 'false', label: '文本' },
            { value: 0, label: '零' },
          ],
        },
      ],
    },
  })
  const select = wrapper.getComponent(NSelect)
  expect(select.text()).toContain('停用')
  const options = select.props('options')!
  select.vm.$emit('update:value', options[1].value, options[1])
  expect(wrapper.vm.getModel().enabled).toBe('false')
  select.vm.$emit('update:value', options[2].value, options[2])
  expect(wrapper.vm.getModel().enabled).toBe(0)
  select.vm.$emit('update:value', options[0].value, options[0])
  expect(wrapper.vm.getModel().enabled).toBe(false)
  wrapper.unmount()
})

test('ordinary table select editors decode boolean values through editProps options', async () => {
  const wrapper = mount(C_Table<Record<string, unknown>>, {
    props: {
      data: [{ id: 1, enabled: false }],
      config: { toolbar: { show: false }, pagination: false, edit: 'cell' },
      columns: [
        {
          key: 'enabled',
          title: '启用',
          editType: 'select',
          editProps: {
            options: [
              { value: false, label: '停用' },
              { value: 'false', label: '文本' },
            ],
          },
        },
      ],
    },
  })
  await flushPromises()
  await wrapper.get('.cell-edit-icon').trigger('click')
  await flushPromises()
  const select = wrapper.getComponent(NSelect)
  expect(select.text()).toContain('停用')
  const options = select.props('options')!
  select.vm.$emit('update:value', options[1].value, options[1])
  await wrapper.get('.cell-action-save').trigger('click')
  await flushPromises()
  expect(wrapper.emitted('update:data')?.at(-1)?.[0]).toEqual([
    { id: 1, enabled: 'false' },
  ])
  wrapper.unmount()
})

test('radio and checkbox boolean options preserve raw models while cascader options remain untouched', async () => {
  const options = [
    { value: false, label: '停用' },
    { value: 'false', label: '文本' },
  ]
  const tree = [
    { value: 'root', label: '根', children: [{ value: 'leaf', label: '叶' }] },
  ]
  const wrapper = mount(C_Form<FormRecord>, {
    props: {
      config: { showActions: false },
      modelValue: { radio: false, checks: [false], tree: 'leaf' },
      options: [
        { prop: 'radio', type: 'radio', children: options },
        { prop: 'checks', type: 'checkbox', children: options },
        { prop: 'tree', type: 'cascader', attrs: { options: tree } },
      ],
    },
  })
  await vi.waitFor(() =>
    expect(wrapper.findComponent(NCascader).exists()).toBe(true)
  )
  const radio = wrapper.getComponent(NRadioGroup)
  const radios = wrapper.findAllComponents(NRadio)
  radio.vm.$emit('update:value', radios[1].props('value'), new Event('change'))
  expect(wrapper.vm.getModel().radio).toBe('false')
  radio.vm.$emit('update:value', radios[0].props('value'), new Event('change'))
  expect(wrapper.vm.getModel().radio).toBe(false)
  const checks = wrapper.getComponent(NCheckboxGroup)
  const checkboxes = wrapper.findAllComponents(NCheckbox)
  checks.vm.$emit(
    'update:value',
    checkboxes.map(item => item.props('value'))
  )
  expect(wrapper.vm.getModel().checks).toEqual([false, 'false'])
  expect(wrapper.getComponent(NCascader).props('options')).toEqual(tree)
  expect(wrapper.vm.getModel().tree).toBe('leaf')
  wrapper.unmount()
})
