import { expect, test } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import C_Form from '../../src/components/C_Form/index.vue'
import { useDynamicFormState } from '../../src/components/C_Form/composables/useDynamicFormState'
import type { FormRecord } from '../../src/components/C_Form/types'

test('controller visibility drives real form fields and retains their values when toggled', async () => {
  const form = useDynamicFormState()
  form.initialize([
    { type: 'input', prop: 'name', placeholder: '姓名' },
    { type: 'input', prop: 'secret', placeholder: '内部信息', show: false },
  ])
  form.addField({ prop: 'comment', placeholder: '备注', visible: false })
  const Host = defineComponent({
    setup: () => () =>
      h(C_Form<FormRecord>, {
        options: form.allFields.value,
        modelValue: { name: 'Grace', secret: '内部内容', comment: '保留备注' },
        config: { showActions: false },
      }),
  })
  const wrapper = mount(Host)
  await flushPromises()

  expect(wrapper.find('input[placeholder="内部信息"]').exists()).toBe(false)
  expect(wrapper.find('input[placeholder="备注"]').exists()).toBe(false)
  expect(
    wrapper.get<HTMLInputElement>('input[placeholder="姓名"]').element.value
  ).toBe('Grace')

  form.toggleFieldVisibility('name')
  await flushPromises()
  expect(wrapper.findAll('input')).toHaveLength(0)

  form.toggleFieldVisibility('name')
  form.toggleFieldVisibility('comment')
  await flushPromises()
  expect(
    wrapper.get<HTMLInputElement>('input[placeholder="姓名"]').element.value
  ).toBe('Grace')
  expect(
    wrapper.get<HTMLInputElement>('input[placeholder="备注"]').element.value
  ).toBe('保留备注')

  form.toggleAllVisibility()
  await flushPromises()
  expect(wrapper.findAll('input')).toHaveLength(3)
  expect(
    wrapper.get<HTMLInputElement>('input[placeholder="内部信息"]').element.value
  ).toBe('内部内容')
  form.toggleAllVisibility()
  await flushPromises()
  expect(wrapper.findAll('input')).toHaveLength(0)
})
