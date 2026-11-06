import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, reactive } from 'vue'
import type { EventDropArg } from '@fullcalendar/core'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import { buildLocalEventRange } from '../src/components/C_FullCalendar/calendarDate'
import { useCalendarEvents } from '../src/components/C_FullCalendar/composables/useCalendarEvents'
import type { CalendarProps } from '../src/components/C_FullCalendar/types'

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

  test('reactive view config preserves callbacks while controlled events and editability stay authoritative', async () => {
    const click = () => {}
    const props = reactive({
      events: [{ id: 'one', title: 'One', start: '2026-10-18' }],
      editable: false,
      config: {
        headerToolbar: false as const,
        weekends: false,
        eventClick: click,
      },
    })
    const scope = effectScope()
    const calendar = scope.run(() => useCalendarEvents(props, () => {}))!
    try {
      expect(calendar.calendarOptions.value.headerToolbar).toBe(false)
      expect(calendar.calendarOptions.value.weekends).toBe(false)
      expect(calendar.calendarOptions.value.eventClick).toBe(click)
      expect(calendar.calendarOptions.value.editable).toBe(false)
      calendar.expose.addEvent({ id: 'two', title: 'Two', start: '2026-10-19' })
      expect(calendar.calendarOptions.value.events).toHaveLength(2)
      expect(calendar.calendarOptions.value.eventClick).toBe(click)
      props.config.weekends = true
      await nextTick()
      expect(calendar.calendarOptions.value.weekends).toBe(true)
      props.events = []
      await nextTick()
      expect(calendar.calendarOptions.value.events).toHaveLength(0)
    } finally {
      scope.stop()
    }
  })

  test('managed drag and resize retain write-back, and native overrides remain guarded', () => {
    const notified: string[] = []
    const props = reactive<CalendarProps>({
      editable: true,
      events: [{ id: 'one', title: 'One', start: '2026-10-18' }],
    })
    const scope = effectScope()
    const calendar = scope.run(() =>
      useCalendarEvents(props, event => notified.push(event))
    )!
    const start = new Date(2026, 9, 19, 9)
    const end = new Date(2026, 9, 19, 11)
    let reverted = 0
    const change = {
      event: { id: 'one', title: 'One', start, end, allDay: false },
      revert: () => {
        reverted++
      },
    }
    const drop = change as unknown as EventDropArg
    const resize = change as unknown as EventResizeDoneArg
    try {
      calendar.calendarOptions.value.eventDrop?.(drop)
      expect(calendar.expose.getEvents()[0]?.start).toEqual(start)
      calendar.calendarOptions.value.eventResize?.(resize)
      expect(calendar.expose.getEvents()[0]?.end).toEqual(end)
      expect(notified).toEqual([
        'update:events',
        'event-dropped',
        'update:events',
        'event-updated',
        'event-resized',
      ])

      props.config = {
        eventDrop: () => {
          notified.push('native-drop')
        },
        eventResize: () => {
          notified.push('native-resize')
        },
      }
      const options = calendar.calendarOptions.value
      options.eventDrop?.(drop)
      options.eventResize?.(resize)
      expect(notified.slice(5)).toEqual(['native-drop', 'native-resize'])
      props.editable = false
      options.eventDrop?.(drop)
      options.eventResize?.(resize)
      expect(reverted).toBe(2)
      expect(notified).toHaveLength(7)
    } finally {
      scope.stop()
    }
  })
})
