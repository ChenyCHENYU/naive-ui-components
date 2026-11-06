import { expect, test } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { NTimePicker } from 'naive-ui'
import C_Time from '../../src/components/C_Time/index.vue'

const clock = (minute: number, second = 0) =>
  new Date(2026, 10, 7, 9, minute, second).getTime()

test.each([
  { format: 'HH:mm:ss' },
  { format: 'HH:mm', attrs: { format: 'HH:mm:ss' } },
])(
  'real time panel and keyboard agree for explicit seconds: %j',
  async props => {
    const wrapper = mount(C_Time, {
      props: {
        ...props,
        mode: 'range',
        minuteStep: 1,
        enableTimeRestriction: true,
        modelValue: [clock(30, 10), clock(30, 15)],
        endTimeProps: { show: true },
      },
      global: { stubs: { teleport: true } },
    })
    await flushPromises()
    const end = wrapper.findAllComponents(NTimePicker)[1]
    const columns = wrapper.findAll('.n-time-picker-col')
    expect(columns).toHaveLength(3)
    const minute = columns[1].findAll('.n-time-picker-col__item')[30]
    expect(minute.classes()).not.toContain('n-time-picker-col__item--disabled')
    const seconds = columns[2].findAll('.n-time-picker-col__item')
    expect(seconds[10].classes()).toContain('n-time-picker-col__item--disabled')
    await seconds[20].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      [clock(30, 10), clock(30, 20)],
    ])
    await end.get('input').setValue('09:30:25')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      [clock(30, 10), clock(30, 25)],
    ])
    await end.get('input').setValue('09:30:10')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      [clock(30, 10), null],
    ])
  }
)

test('minute-only panel and typed input keep the same strict range restriction', async () => {
  const wrapper = mount(C_Time, {
    props: {
      mode: 'range',
      minuteStep: 1,
      enableTimeRestriction: true,
      modelValue: [clock(30, 10), clock(31, 20)],
      endTimeProps: { show: true },
    },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  const end = wrapper.findAllComponents(NTimePicker)[1]
  const columns = wrapper.findAll('.n-time-picker-col')
  expect(columns).toHaveLength(2)
  const minutes = columns[1].findAll('.n-time-picker-col__item')
  expect(minutes[30].classes()).toContain('n-time-picker-col__item--disabled')
  expect(minutes[31].classes()).not.toContain(
    'n-time-picker-col__item--disabled'
  )
  await end.get('input').setValue('09:30')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    [clock(30, 10), null],
  ])
  await end.get('input').setValue('09:31')
  const model = wrapper.emitted('update:modelValue')?.at(-1)?.[0]
  expect(Array.isArray(model)).toBe(true)
  const selectedEnd = new Date((model as [number, number])[1])
  expect([selectedEnd.getHours(), selectedEnd.getMinutes()]).toEqual([9, 31])
})

test.each([{ useMinutes: false }, { format: 'HH' }])(
  'hour-only clicks and typing cannot retain a hidden later minute: %j',
  async props => {
    const start = clock(0)
    const wrapper = mount(C_Time, {
      props: {
        ...props,
        mode: 'range',
        enableTimeRestriction: true,
        modelValue: [start, clock(30) + 3600000],
        endTimeProps: { show: true },
      },
      global: { stubs: { teleport: true } },
    })
    await flushPromises()
    const columns = wrapper.findAll('.n-time-picker-col')
    expect(columns).toHaveLength(1)
    const hours = columns[0].findAll('.n-time-picker-col__item')
    expect(hours[9].classes()).toContain('n-time-picker-col__item--disabled')
    expect(hours[10].classes()).not.toContain(
      'n-time-picker-col__item--disabled'
    )
    await hours[9].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    const end = wrapper.findAllComponents(NTimePicker)[1]
    await end.get('input').setValue('09')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      [start, null],
    ])
    await end.get('input').setValue('10')
    const model = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as [
      number,
      number,
    ]
    expect(new Date(model[1]).getHours()).toBe(10)
  }
)

test('hour and second fields ignore hidden minutes for both selection and typing', async () => {
  const start = clock(10, 10)
  const wrapper = mount(C_Time, {
    props: {
      mode: 'range',
      format: 'HH:ss',
      minuteStep: 1,
      enableTimeRestriction: true,
      modelValue: [start, clock(20, 15)],
      endTimeProps: { show: true },
    },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  const columns = wrapper.findAll('.n-time-picker-col')
  expect(columns).toHaveLength(2)
  const seconds = columns[1].findAll('.n-time-picker-col__item')
  expect(seconds[10].classes()).toContain('n-time-picker-col__item--disabled')
  await seconds[20].trigger('click')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    [start, clock(20, 20)],
  ])
  const end = wrapper.findAllComponents(NTimePicker)[1]
  await end.get('input').setValue('09:25')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
    [start, clock(0, 25)],
  ])
  await end.get('input').setValue('09:10')
  expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[start, null]])
})

test('hidden generated steps do not block confirmation, while explicit native restrictions remain', async () => {
  const wrapper = mount(C_Time, {
    props: {
      mode: 'range',
      format: 'HH',
      enableTimeRestriction: true,
      modelValue: [clock(0), clock(15) + 3600000],
      endTimeProps: { show: true },
    },
    global: { stubs: { teleport: true } },
  })
  await flushPromises()
  const confirm = () => wrapper.get('.n-time-picker-actions__confirm')
  expect(confirm().attributes('disabled')).toBeUndefined()
  await wrapper.setProps({ endTimeProps: { show: true, minutes: [0, 30] } })
  expect(confirm().attributes('disabled')).toBeDefined()
})
