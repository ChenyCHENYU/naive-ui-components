import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import {
  C_ResourceSchedule,
  type ResourceScheduleRange,
} from '../../src/components/C_ResourceSchedule'
import {
  buildScheduleLanes,
  getScheduleTicks,
} from '../../src/components/C_ResourceSchedule/layout'

const origin = Date.UTC(2026, 2, 7, 11)
const hour = 60 * 60 * 1000
const time = (from: number) => origin + from * hour
const range: ResourceScheduleRange = [time(0), time(6)]
const resources = [
  {
    key: 'dock-a',
    label: 'Dock A',
    workingWindows: [[time(-2), time(4)]] as const,
  },
  { key: 'dock-b', label: 'Dock B' },
]
const booking = (
  key: string | number,
  resourceKey: string,
  start: number,
  end: number
) => ({
  key,
  resourceKey,
  label: String(key),
  start: time(start),
  end: time(end),
})
const bookings = [
  booking('adjacent', 'dock-a', 3, 4),
  booking('long', 'dock-a', -1, 3),
  booking('nested', 'dock-a', 1, 2),
  booking(0, 'dock-b', 1, 2),
  booking('outside', 'dock-a', 6, 7),
  booking('unknown', 'archived-dock', 1, 3),
  booking('invalid', 'dock-b', 2, 2),
]

test('clips day-boundary bookings and marks overlaps separately per resource', () => {
  const [first, second] = buildScheduleLanes(resources, bookings, range)
  expect(first.trackCount).toBe(2)
  expect(
    first.bookings.map(item => [item.booking.key, item.track, item.conflict])
  ).toEqual([
    ['long', 0, true],
    ['nested', 1, true],
    ['adjacent', 0, false],
  ])
  expect(first.bookings[0]).toMatchObject({ offset: 0, width: 50 })
  expect(first.workingWindows[0].end).toBe(time(4))
  expect(
    second.bookings.map(item => [item.booking.key, item.conflict])
  ).toEqual([[0, false]])
  expect(bookings[1].start).toBe(time(-1))
  expect(getScheduleTicks(range, 80)).toHaveLength(24)
  expect(getScheduleTicks(range, 3).map(item => item.time)).toEqual([
    time(0),
    time(3),
    time(6),
  ])
})

test('presents selected details and emits controlled range moves without writing bookings', async () => {
  const wrapper = mount(C_ResourceSchedule, {
    props: {
      resources,
      bookings,
      range,
      modelValue: null,
      navigation: true,
      timeZone: 'Asia/Shanghai',
      locale: { locale: 'en-US' },
    },
  })
  expect(wrapper.text()).toContain('Asia/Shanghai')
  const buttons = wrapper.findAll('button.c-resource-schedule__booking')
  expect(buttons).toHaveLength(4)
  expect(buttons[0].attributes('aria-label')).toContain('Conflicting booking')
  await buttons[3].trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([[0]])
  expect(wrapper.emitted('select')).toEqual([[bookings[3]]])
  expect(buttons[3].attributes('aria-pressed')).toBe('false')
  await wrapper.setProps({ modelValue: 0 })
  expect(buttons[3].attributes('aria-pressed')).toBe('true')
  expect(wrapper.get('.c-resource-schedule__detail').text()).toContain('Dock B')
  const next = wrapper
    .findAll('button')
    .find(button => button.text() === 'Next period')!
  await next.trigger('click')
  expect(wrapper.emitted('update:range')).toEqual([[[time(6), time(12)]]])
  expect(wrapper.findAll('button.c-resource-schedule__booking')).toHaveLength(4)
  await wrapper.setProps({ range: [time(6), time(12)] })
  expect(wrapper.findAll('button.c-resource-schedule__booking')).toHaveLength(1)
  expect(wrapper.find('.c-resource-schedule__detail').exists()).toBe(false)
  wrapper.unmount()
})

test('renders invalid or empty input without mutating state', async () => {
  const wrapper = mount(C_ResourceSchedule, {
    props: {
      resources: [],
      bookings,
      range: [NaN, Infinity],
      locale: { locale: 'en-US' },
    },
  })
  expect(wrapper.get('[role="status"]').text()).toBe(
    'Choose a valid time range'
  )
  await wrapper.setProps({ range })
  expect(wrapper.get('[role="status"]').text()).toBe('No resources to display')
  await wrapper.setProps({ resources, timeZone: 'unknown/zone' })
  expect(wrapper.text()).toContain('UTC')
  expect(wrapper.emitted('update:range')).toBeUndefined()
  wrapper.unmount()
})
