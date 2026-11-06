import { expect, test } from 'bun:test'
import { useTimeSelection } from '../src/components/C_Time/composables/useTimeSelection'

const clock = (minute: number, second = 0) =>
  new Date(2026, 10, 7, 9, minute, second).getTime()

test.each([
  { format: 'HH:mm:ss', useSeconds: false },
  { format: 'HH:mm', useSeconds: true },
  { format: 'HH:mm', attrs: { format: 'HH:mm:ss' } },
  { format: 'HH:mm', endTimeProps: { format: 'HH:mm:ss' } },
])(
  'visible seconds allow a later second within the starting minute: %j',
  props => {
    const time = useTimeSelection(
      {
        ...props,
        mode: 'range',
        enableTimeRestriction: true,
        modelValue: [clock(30, 10), null],
      },
      () => {}
    )
    expect(time.isEndMinuteDisabled(30, 9)).toBe(false)
    expect(time.isEndMinuteDisabled(29, 9)).toBe(true)
    expect(time.isEndSecondDisabled(10, 30, 9)).toBe(true)
    expect(time.isEndSecondDisabled(20, 30, 9)).toBe(false)
    time.handleEndTimeChange(clock(30, 20))
    expect(time.endTime.value).toBe(clock(30, 20))
    time.handleEndTimeChange(clock(30, 10))
    expect(time.endTime.value).toBeNull()
  }
)

test('hidden seconds cannot bypass minute precision through emitted timestamps or start edits', () => {
  const time = useTimeSelection(
    {
      mode: 'range',
      format: 'HH:mm:ss',
      useSeconds: true,
      endTimeProps: { format: 'HH:mm' },
      enableTimeRestriction: true,
      modelValue: [clock(30, 10), null],
    },
    () => {}
  )
  expect(time.isEndMinuteDisabled(30, 9)).toBe(true)
  expect(time.isEndSecondDisabled(10, 30, 9)).toBe(false)
  time.handleEndTimeChange(clock(30, 20))
  expect(time.endTime.value).toBeNull()
  time.handleEndTimeChange(clock(31, 20))
  expect(time.endTime.value).toBe(clock(31, 20))
  time.handleStartTimeChange(clock(31, 10))
  expect(time.endTime.value).toBeNull()
})

test('display precision does not change formatted value contracts or unrestricted ranges', () => {
  const changes: unknown[] = []
  const time = useTimeSelection(
    {
      mode: 'range',
      valueMode: 'formatted',
      valueFormat: 'HHmmss',
      format: 'HH:mm:ss',
      enableTimeRestriction: true,
      modelValue: ['093010', null],
    },
    (event, value) => {
      if (event === 'update:modelValue') changes.push(value)
    }
  )
  time.handleEndTimeChange(clock(30, 20))
  expect(changes.at(-1)).toEqual(['093010', '093020'])
  const unrestricted = useTimeSelection(
    { mode: 'range', format: 'HH:mm', modelValue: [clock(30, 10), null] },
    () => {}
  )
  unrestricted.handleEndTimeChange(clock(30, 20))
  expect(unrestricted.endTime.value).toBe(clock(30, 20))
  unrestricted.handleEndTimeChange(null)
  expect(unrestricted.endTime.value).toBeNull()
})

test.each([
  ['HH', [9, 40, 20], [10, 0, 0]],
  ['mm', [10, 29, 20], [8, 31, 0]],
  ['ss', [10, 40, 9], [8, 20, 11]],
  ['HH:mm', [9, 30, 20], [9, 31, 0]],
  ['HH:ss', [9, 40, 9], [9, 20, 11]],
  ['mm:ss', [10, 30, 9], [8, 30, 11]],
  ['HH:mm:ss', [9, 30, 9], [9, 30, 11]],
] as const)(
  'range comparisons only include visible fields in %s',
  (format, rejected, accepted) => {
    const stamp = (parts: readonly [number, number, number]) =>
      new Date(2026, 10, 7, ...parts).getTime()
    const time = useTimeSelection(
      {
        mode: 'range',
        format,
        enableTimeRestriction: true,
        modelValue: [clock(30, 10), null],
      },
      () => {}
    )
    time.handleEndTimeChange(stamp(rejected))
    expect(time.endTime.value).toBeNull()
    time.handleEndTimeChange(stamp(accepted))
    expect(time.endTime.value).toBe(stamp(accepted))
    expect(time.isEndHourDisabled(9)).toBe(format === 'HH')
    expect(time.isEndMinuteDisabled(30, 9)).toBe(
      format.includes('m') && !format.includes('s')
    )
    expect(time.isEndSecondDisabled(10, 30, 9)).toBe(format.includes('s'))
  }
)
