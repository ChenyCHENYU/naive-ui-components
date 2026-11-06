import { expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NDatePicker, NTimePicker } from 'naive-ui'
import C_Date from '../../src/components/C_Date/index.vue'
import C_Time from '../../src/components/C_Time/index.vue'
import C_Form from '../../src/components/C_Form/index.vue'
import C_FormSearch from '../../src/components/C_FormSearch/index.vue'

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

test('smart date range respects configured formats and survives parent clear echo', async () => {
  const wrapper = mount(C_Date, {
    props: {
      mode: 'smart-range',
      valueFormat: 'yyyy年MM月dd日',
      modelValue: ['2026年11月06日', '2026年11月07日'],
    },
    attrs: { size: 'small', clearable: false },
  })
  const [start, end] = wrapper.findAllComponents(NDatePicker)
  const checkEnd = end.props('isDateDisabled') as (day: number) => boolean
  expect(start.props('size')).toBe('small')
  expect(end.props('clearable')).toBe(false)
  expect(checkEnd(new Date(2026, 10, 5).getTime())).toBe(true)
  expect(checkEnd(new Date(2026, 10, 6).getTime())).toBe(false)
  end.vm.$emit(
    'update:formattedValue',
    '2026年11月05日',
    new Date(2026, 10, 5).getTime()
  )
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()

  start.vm.$emit(
    'update:formattedValue',
    '2026年11月08日',
    new Date(2026, 10, 8).getTime()
  )
  expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  await wrapper.setProps({ modelValue: null })
  expect(start.props('formattedValue')).toBe('2026年11月08日')
  expect(end.props('formattedValue')).toBeNull()
  expect(end.props('disabled')).toBe(false)
  end.vm.$emit(
    'update:formattedValue',
    '2026年11月09日',
    new Date(2026, 10, 9).getTime()
  )
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    ['2026年11月08日', '2026年11月09日'],
  ])
  wrapper.unmount()
})

test('after-today limit permits times within the current local day', () => {
  const wrapper = mount(C_Date, {
    props: { mode: 'datetime', disabledAfterToday: true },
  })
  const check = wrapper.getComponent(NDatePicker).props('isDateDisabled') as (
    day: number
  ) => boolean
  const noon = new Date()
  noon.setHours(12, 0, 0, 0)
  expect(check(noon.getTime())).toBe(false)
  noon.setDate(noon.getDate() + 1)
  expect(check(noon.getTime())).toBe(true)
  wrapper.unmount()
})

test('formatted time uses strings and protects disabled or incomplete ranges', async () => {
  const wrapper = mount(C_Time, {
    props: {
      mode: 'range',
      valueMode: 'formatted',
      modelValue: null,
      attrs: { disabled: false },
    },
  })
  const [start, end] = wrapper.findAllComponents(NTimePicker)
  expect(end.props('disabled')).toBe(true)
  end.vm.$emit('update:value', new Date(2026, 10, 6, 9, 30).getTime())
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()

  start.vm.$emit('update:value', new Date(2026, 10, 6, 0, 0).getTime())
  expect(wrapper.emitted('update:modelValue')).toEqual([[['00:00', null]]])
  await wrapper.setProps({ modelValue: ['00:00', '09:30'] })
  const parsed = new Date(end.props('value') as number)
  expect([parsed.getHours(), parsed.getMinutes()]).toEqual([9, 30])
  await wrapper.setProps({ disabled: true })
  expect(start.get('input').element.disabled).toBe(true)
  expect(end.get('input').element.disabled).toBe(true)
  start.vm.$emit('update:value', null)
  expect(wrapper.emitted('update:modelValue')).toEqual([[['00:00', null]]])
  wrapper.unmount()
})

test('formatted time stays on the string channel in form and search fields', async () => {
  const form = mount(C_Form, {
    props: {
      options: [
        {
          type: 'timePicker',
          prop: 'quietStart',
          valueMode: 'formatted',
          attrs: { valueFormat: 'HH:mm' },
        },
      ],
      modelValue: { quietStart: '08:30' },
    },
  })
  const search = mount(C_FormSearch<{ quietStart: string | null }>, {
    props: {
      formItemList: [
        { type: 'time', prop: 'quietStart', valueMode: 'formatted' },
      ],
      modelValue: { quietStart: null },
    },
  })
  await vi.waitFor(() => {
    expect(form.findComponent(NTimePicker).exists()).toBe(true)
    expect(search.findComponent(NTimePicker).exists()).toBe(true)
  })
  expect(form.getComponent(NTimePicker).props('formattedValue')).toBe('08:30')
  expect(form.getComponent(NTimePicker).props('value')).toBeUndefined()
  expect(search.getComponent(NTimePicker).props('formattedValue')).toBeNull()
  form.getComponent(NTimePicker).vm.$emit('update:formattedValue', '00:00', 0)
  search.getComponent(NTimePicker).vm.$emit('update:formattedValue', '00:00', 0)
  await flushPromises()
  expect(form.emitted('update:modelValue')?.at(-1)).toEqual([
    { quietStart: '00:00' },
  ])
  expect(search.emitted('update:modelValue')?.at(-1)).toEqual([
    { quietStart: '00:00' },
  ])
  form.unmount()
  search.unmount()
})
