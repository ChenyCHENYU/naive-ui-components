import { flushPromises, mount } from '@vue/test-utils'
import { NPopover, NSelect } from 'naive-ui'
import { expect, test } from 'vitest'
import C_Cascade from '../../src/components/C_Cascade/index.vue'
import C_City from '../../src/components/C_City/index.vue'

test('locked cascade keeps its value and re-enables descendants only after a valid parent', async () => {
  const parent = {
    label: '华东',
    value: 0,
    children: [{ label: '杭州', value: 1 }],
  }
  const wrapper = mount(C_Cascade, {
    props: { data: [parent], readonly: true },
  })
  const [primary, secondary] = wrapper.findAllComponents(NSelect)
  expect(primary.props('disabled')).toBe(true)
  primary.vm.$emit('update:value', 0, parent)
  expect(wrapper.emitted('change')).toBeUndefined()

  await wrapper.setProps({ readonly: false })
  expect(primary.props('disabled')).toBe(false)
  expect(secondary.props('disabled')).toBe(true)
  primary.vm.$emit('update:value', 0, parent)
  await flushPromises()
  expect(secondary.props('disabled')).toBe(false)
  expect(secondary.props('options')).toEqual([{ label: '杭州', value: 1 }])
  expect(wrapper.emitted('change')).toEqual([
    [{ primary: { label: '华东', value: 0 }, secondary: null, tertiary: null }],
  ])
  wrapper.unmount()
})

test('city picker closes and keeps its selected label when the field becomes disabled', async () => {
  const wrapper = mount(C_City, {
    props: { modelValue: '杭州' },
    global: { stubs: { teleport: true } },
  })
  const trigger = wrapper.get('button[aria-label="选择城市"]')
  await trigger.trigger('click')
  expect(wrapper.getComponent(NPopover).props('show')).toBe(true)
  await wrapper.setProps({ disabled: true })
  expect(trigger.attributes('disabled')).toBeDefined()
  expect(wrapper.getComponent(NPopover).props('show')).toBe(false)
  expect(trigger.text()).toBe('杭州')
  expect(wrapper.emitted('change')).toBeUndefined()
  wrapper.unmount()
})
