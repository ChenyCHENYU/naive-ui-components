import { expect, test } from 'vitest'
import { mount } from '@vue/test-utils'
import { NDatePicker, NTimePicker } from 'naive-ui'
import C_Date from '../../src/components/C_Date/index.vue'
import C_Time from '../../src/components/C_Time/index.vue'

test('default date mode keeps standard and legacy bindings in their original event order', async () => {
  const events: string[] = []
  const wrapper = mount(C_Date, {
    props: {
      mode: undefined,
      'onUpdate:modelValue': () => events.push('model'),
      'onUpdate:singleDate': () => events.push('legacy'),
      onChange: () => events.push('change'),
    },
  })
  const picker = wrapper.getComponent(NDatePicker)
  expect(picker.props('type')).toBe('date')
  picker.vm.$emit('update:formattedValue', '2026-10-20')
  expect(wrapper.emitted('update:modelValue')).toEqual([['2026-10-20']])
  expect(wrapper.emitted('update:singleDate')).toEqual([['2026-10-20']])
  expect(events).toEqual(['model', 'legacy', 'change'])
  wrapper.unmount()
})

test('date mode changes retain controlled model shapes and legacy range updates', async () => {
  const wrapper = mount(C_Date, {
    props: { mode: 'daterange', modelValue: ['2026-10-20', '2026-10-21'] },
  })
  expect(wrapper.getComponent(NDatePicker).props('formattedValue')).toEqual([
    '2026-10-20',
    '2026-10-21',
  ])
  wrapper
    .getComponent(NDatePicker)
    .vm.$emit('update:formattedValue', ['2026-10-22', '2026-10-23'])
  expect(wrapper.emitted('update:dateRange')).toEqual([
    [['2026-10-22', '2026-10-23']],
  ])
  await wrapper.setProps({ mode: 'date', modelValue: '2026-10-24' })
  expect(wrapper.getComponent(NDatePicker).props('formattedValue')).toBe(
    '2026-10-24'
  )
  wrapper.unmount()
})

test('default time mode remains a range and changing to single emits a scalar', async () => {
  const wrapper = mount(C_Time, { props: { mode: undefined } })
  expect(wrapper.findAllComponents(NTimePicker)).toHaveLength(2)
  const [start, end] = wrapper.findAllComponents(NTimePicker)
  start.vm.$emit('update:value', 100)
  end.vm.$emit('update:value', 200)
  expect(wrapper.emitted('update:modelValue')).toEqual([
    [[100, null]],
    [[100, 200]],
  ])
  await wrapper.setProps({ mode: 'single', modelValue: 300 })
  expect(wrapper.findAllComponents(NTimePicker)).toHaveLength(1)
  expect(wrapper.getComponent(NTimePicker).props('value')).toBe(300)
  wrapper.getComponent(NTimePicker).vm.$emit('update:value', 400)
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([400])
  wrapper.unmount()
})
