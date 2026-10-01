import { describe, expect, test } from 'bun:test'
import { localDayStart } from '../src/components/C_Date/dateUtils'
import { normalizeCascadeSelection } from '../src/components/C_Cascade/cascadeSelection'
import { useTimeSelection } from '../src/components/C_Time/composables/useTimeSelection'

describe('date, time, and cascade value boundaries', () => {
  test('date-only strings stay on their local calendar day', () => {
    expect(localDayStart('2026-10-01')).toBe(new Date(2026, 9, 1).getTime())
  })

  test('cascade accepts numeric zero and removes invalid descendants', () => {
    const data = [
      {
        label: 'Root',
        value: 0,
        children: [{ label: 'Child', value: 0 }],
      },
    ]
    expect(
      normalizeCascadeSelection(data, {
        primary: { label: 'Root', value: 0 },
        secondary: { label: 'Child', value: 0 },
      })
    ).toEqual([0, 0, null])
    expect(
      normalizeCascadeSelection(data, {
        primary: { label: 'Root', value: 0 },
        secondary: { label: 'Wrong', value: 1 },
      })
    ).toEqual([0, null, null])
  })

  test('time steps apply and range validation compares clock time', () => {
    const time = useTimeSelection(
      {
        mode: 'range',
        minuteStep: 30,
        enableTimeRestriction: true,
      },
      () => {}
    )
    expect(time.allowedMinutes.value).toEqual([0, 30])
    const start = new Date(2026, 9, 1, 9, 30).getTime()
    const earlierDateButLaterClock = new Date(2020, 0, 1, 10, 0).getTime()
    time.handleStartTimeChange(start)
    time.handleEndTimeChange(earlierDateButLaterClock)
    expect(time.endTime.value).toBe(earlierDateButLaterClock)

    time.handleEndTimeChange(new Date(2026, 9, 1, 9, 15).getTime())
    expect(time.endTime.value).toBeNull()
  })
})
