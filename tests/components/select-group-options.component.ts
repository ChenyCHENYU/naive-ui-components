import { afterEach, expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NSelect } from 'naive-ui'
import C_Select from '../../src/components/C_Select/index.vue'
import type { SelectOptionNode } from '../../src/components/C_Select'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
})

test('grouped boolean and numeric leaves retain the complete original record and selected order', () => {
  const zero = { label: 'Zero', value: 0, code: 'zero' }
  const no = { label: 'No', value: false, code: 'false' }
  const groups: SelectOptionNode<number | boolean>[] = [
    { type: 'group', label: 'System', children: [zero, no] },
  ]
  const wrapper = mount(C_Select, {
    props: { options: groups, multiple: true, modelValue: [0, false] },
  })
  wrappers.push(wrapper)
  const select = wrapper.getComponent(NSelect)
  const group = select.props('options')![0]
  const children = group.children as Array<{ value: string | number }>
  expect(select.props('value')).toEqual([0, children[1].value])
  expect(children[1].value).not.toBe(false)
  select.vm.$emit(
    'update:value',
    [children[1].value, 0],
    [children[1], children[0]]
  )
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[false, 0]])
  expect(wrapper.emitted('select')?.at(-1)).toEqual([[no, zero]])
  expect(groups[0]).toEqual({
    type: 'group',
    label: 'System',
    children: [zero, no],
  })
})

test('native group select returns the raw leaf; clear and readonly retain their original contracts', async () => {
  const leaf = { label: 'No', value: false, payload: { id: 7 } }
  const wrapper = mount(C_Select, {
    props: {
      options: [{ type: 'group', label: 'Group', children: [leaf] }],
      modelValue: false,
    },
  })
  wrappers.push(wrapper)
  const select = wrapper.getComponent(NSelect)
  const children = select.props('options')![0].children as Array<{
    value: string
  }>
  select.vm.$emit('update:value', children[0].value, children[0])
  expect(wrapper.emitted('select')?.at(-1)).toEqual([leaf])
  select.vm.$emit('update:value', null, null)
  expect(wrapper.emitted('select')?.at(-1)).toEqual([null])
  await wrapper.setProps({ readonly: true })
  select.vm.$emit('update:value', children[0].value, children[0])
  expect(wrapper.emitted('select')).toHaveLength(2)
})

test('real native group menu selects a boolean leaf through pointer interaction', async () => {
  const leaf = { value: false, label: 'Disabled', code: 'off' }
  const wrapper = mount(C_Select, {
    attachTo: document.body,
    props: {
      show: true,
      virtualScroll: false,
      options: [{ type: 'group', label: 'System', children: [leaf] }],
    },
    global: { stubs: { Teleport: true } },
  })
  wrappers.push(wrapper)
  await flushPromises()
  const option = wrapper
    .findAll('.n-base-select-option')
    .find(item => item.text() === 'Disabled')!
  await option.trigger('click')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  expect(wrapper.emitted('select')?.at(-1)).toEqual([leaf])
})

test('local duplicate values retain the existing first-record selection contract', () => {
  const first = { value: 0, label: 'First' }
  const duplicate = { value: 0, label: 'Second' }
  const wrapper = mount(C_Select, { props: { options: [first, duplicate] } })
  wrappers.push(wrapper)
  wrapper.getComponent(NSelect).vm.$emit('update:value', 0, duplicate)
  expect(wrapper.emitted('select')?.at(-1)).toEqual([first])
})
