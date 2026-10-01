import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, reactive } from 'vue'
import { buildLocalEventRange } from '../src/components/C_FullCalendar/calendarDate'
import { useCalendarEvents } from '../src/components/C_FullCalendar/composables/useCalendarEvents'

describe('C_FullCalendar local event time', () => {
  test('uses the selected local calendar day, not a UTC date string', () => {
    const selected = new Date(2026, 9, 1, 0, 0)
    const range = buildLocalEventRange(selected.getTime(), '09:15', '10:30')
    expect(range).not.toBeNull()
    expect([
      range?.start.getFullYear(),
      range?.start.getMonth(),
      range?.start.getDate(),
      range?.start.getHours(),
      range?.start.getMinutes(),
    ]).toEqual([2026, 9, 1, 9, 15])
    expect([range?.end.getHours(), range?.end.getMinutes()]).toEqual([10, 30])
  })

  test('rejects malformed and reversed ranges', () => {
    const date = new Date(2026, 9, 1).getTime()
    expect(buildLocalEventRange(null, '09:00', '10:00')).toBeNull()
    expect(buildLocalEventRange(date, '9:00', '10:00')).toBeNull()
    expect(buildLocalEventRange(date, '24:00', '25:00')).toBeNull()
    expect(buildLocalEventRange(date, '10:00', '09:00')).toBeNull()
  })

  test('editable updates and event output stay independent of caller data', async () => {
    const props = reactive({
      events: [{ id: '1', title: 'Review', start: new Date(2026, 9, 1) }],
      editable: true,
    })
    const scope = effectScope()
    const calendar = scope.run(() => useCalendarEvents(props, () => {}))!
    try {
      expect(calendar.calendarOptions.value.editable).toBe(true)
      props.editable = false
      await nextTick()
      expect(calendar.calendarOptions.value.editable).toBe(false)
      const copy = calendar.expose.getEvents()
      copy[0].title = 'Changed'
      ;(copy[0].start as Date).setFullYear(2030)
      expect(calendar.expose.getEvents()[0].title).toBe('Review')
      expect((calendar.expose.getEvents()[0].start as Date).getFullYear()).toBe(
        2026
      )
    } finally {
      scope.stop()
    }
  })
})
