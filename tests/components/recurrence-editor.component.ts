import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import C_RecurrenceEditor from '../../src/components/C_RecurrenceEditor/index.vue'
import {
  formatRecurrenceRule,
  parseRecurrenceRule,
} from '../../src/components/C_RecurrenceEditor/rule'

test('supported RFC 5545 recurrence rules are canonical and unsupported rules do not silently lose data', () => {
  const rules = [
    'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=10',
    'FREQ=MONTHLY;BYDAY=-1FR;UNTIL=20280229',
    'FREQ=MONTHLY;BYMONTHDAY=31',
    'FREQ=YEARLY',
  ]
  for (const rule of rules) {
    expect(
      formatRecurrenceRule(parseRecurrenceRule(`RRULE:${rule.toLowerCase()}`))
    ).toBe(rule)
  }
  expect(formatRecurrenceRule(parseRecurrenceRule(''))).toBe('')
  for (const rule of [
    'FREQ=MONTHLY;BYDAY=MO;BYSETPOS=-1',
    'FREQ=WEEKLY;BYDAY=-1MO',
    'FREQ=DAILY;UNTIL=20270229',
    'FREQ=DAILY;UNTIL=20280229T090000Z',
    'FREQ=DAILY;COUNT=2;UNTIL=20280229',
    'FREQ=DAILY;INTERVAL=0',
  ])
    expect(() => parseRecurrenceRule(rule)).toThrow(RangeError)
})

test('the controlled editor emits independent drafts and removes frequency-specific fields when the frequency changes', async () => {
  const rule = parseRecurrenceRule('FREQ=MONTHLY;BYDAY=-1FR;COUNT=10')
  const wrapper = mount(C_RecurrenceEditor, { props: { modelValue: rule } })
  const frequency = wrapper.findAll('select')[0]
  expect(frequency?.element.value).toBe('monthly')
  await frequency?.setValue('weekly')
  const next = wrapper.emitted('update:modelValue')?.[0]?.[0]
  expect(next).toEqual({
    frequency: 'weekly',
    interval: undefined,
    end: { type: 'count', count: 10 },
  })
  expect(rule?.monthPattern).toEqual({
    type: 'weekday',
    ordinal: -1,
    day: 'FR',
  })
  await wrapper.setProps({
    modelValue: { frequency: 'weekly', weekdays: ['MO'] },
  })
  const checkboxes = wrapper.findAll<HTMLInputElement>('input[type="checkbox"]')
  expect(checkboxes[0]?.element.checked).toBe(true)
  await checkboxes[2]?.setValue(true)
  expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual({
    frequency: 'weekly',
    weekdays: ['MO', 'WE'],
  })
})
