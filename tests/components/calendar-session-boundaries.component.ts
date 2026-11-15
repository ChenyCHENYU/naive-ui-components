import { afterEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import { useCalendarEvents } from '../../src/components/C_FullCalendar/composables/useCalendarEvents'
import type {
  CalendarEvent,
  CalendarProps,
} from '../../src/components/C_FullCalendar/types'

const cleanups: Array<() => void> = []
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()))

const original = (): CalendarEvent => ({
  id: 'a',
  title: 'Original',
  start: new Date(2026, 10, 15, 9),
  end: new Date(2026, 10, 15, 10),
  color: '#123456',
  extendedProps: { scope: 'A' },
})

async function calendar() {
  let api!: ReturnType<typeof useCalendarEvents>
  const props = reactive<CalendarProps>({
    editable: true,
    showEditDialog: true,
    events: [original()],
    config: { initialDate: '2026-11-15', headerToolbar: false },
  })
  const emit = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useCalendarEvents(props, emit)
        return () =>
          h(FullCalendar, {
            ref: api.calendarRef,
            options: api.calendarOptions.value,
          })
      },
    })
  )
  cleanups.push(() => wrapper.unmount())
  await flushPromises()
  const select = async () => {
    const native = api.calendarRef.value!.getApi()
    expect(native.getEventById('a')).not.toBeNull()
    // Let FullCalendar produce its own EventClickArg from the rendered event.
    await wrapper.get('.fc-event').trigger('click')
  }
  await select()
  return { api, props, emit, select }
}

test.each(['edit', 'delete'] as const)(
  'same-ID source replacement immediately invalidates the old %s session',
  async operation => {
    const { api, props, emit } = await calendar()
    if (operation === 'edit') api.openEditModal()
    const replacement = {
      ...original(),
      title: 'Replacement',
      color: '#abcdef',
      extendedProps: { scope: 'B' },
    }
    props.events = [replacement]
    // No nextTick: an old callback can run in the same turn as the new source.
    expect(api.saveEvent()).toBe(false)
    api.deleteEvent()
    expect(api.showActionDialog.value).toBe(false)
    expect(api.showEditModal.value).toBe(false)
    expect(api.selectedEvent.value).toBeNull()
    await flushPromises()
    expect(api.expose.getEvents()).toEqual([replacement])
    expect(emit).not.toHaveBeenCalled()
  }
)

test('equal parent echoes and unrelated mutations preserve the active draft', async () => {
  const { api, props } = await calendar()
  api.openEditModal()
  api.editForm.value.title = 'Draft'
  props.events = [
    original(),
    { id: 'other', title: 'Other', start: '2026-11-16' },
  ]
  await flushPromises()
  api.expose.updateEvent({ id: 'other', title: 'Updated other' })
  api.expose.deleteEvent('other')
  expect(api.showEditModal.value).toBe(true)
  expect(api.editForm.value.title).toBe('Draft')
  expect(api.saveEvent()).toBe(true)
  expect(api.expose.getEvents()[0].title).toBe('Draft')
})

test('source replacement closes the active editor without requiring another user action', async () => {
  const { api, props, emit } = await calendar()
  api.openEditModal()
  props.events = [{ ...original(), title: 'Replacement' }]
  await flushPromises()
  expect(api.showEditModal.value).toBe(false)
  expect(api.selectedEvent.value).toBeNull()
  expect(emit).not.toHaveBeenCalled()
})

test('an equal parent echo of a public update retains the subsequently opened draft', async () => {
  const { api, props, select } = await calendar()
  api.expose.updateEvent({ id: 'a', title: 'Public update' })
  await flushPromises()
  await select()
  api.openEditModal()
  api.editForm.value.title = 'Draft'
  props.events = api.expose.getEvents()
  await flushPromises()
  expect(api.showEditModal.value).toBe(true)
  expect(api.editForm.value.title).toBe('Draft')
  expect(api.saveEvent()).toBe(true)
})

test('in-place source reordering preserves the draft while same-turn removal still rejects saving', async () => {
  const { api, props, select } = await calendar()
  props.events = [
    original(),
    { id: 'other', title: 'Other', start: '2026-11-16' },
  ]
  await flushPromises()
  api.openEditModal()
  api.editForm.value.title = 'Draft'
  props.events.reverse()
  expect(api.showEditModal.value).toBe(true)
  expect(api.saveEvent()).toBe(true)
  expect(api.expose.getEvents().find(event => event.id === 'a')?.title).toBe(
    'Draft'
  )
  props.events = [original()]
  await flushPromises()
  await select()
  api.openEditModal()
  props.events.splice(0, 1)
  expect(api.saveEvent()).toBe(false)
  await flushPromises()
  expect(api.expose.getEvents()).toEqual([])
})

test.each(['update', 'delete', 'nested'] as const)(
  'public/local %s of the selected record invalidates its operation',
  async operation => {
    const { api, props, emit } = await calendar()
    api.openEditModal()
    if (operation === 'update')
      api.expose.updateEvent({ id: 'a', title: 'New' })
    else if (operation === 'delete') api.expose.deleteEvent('a')
    else props.events![0].extendedProps.scope = 'B'
    const before = api.expose.getEvents()
    emit.mockClear()
    expect(api.saveEvent()).toBe(false)
    expect(api.showEditModal.value).toBe(false)
    api.deleteEvent()
    expect(api.expose.getEvents()).toEqual(before)
    expect(emit).not.toHaveBeenCalled()
  }
)

test('in-place Date mutation is checked again at commit even without a reactive Date setter', async () => {
  const { api, props, emit } = await calendar()
  api.openEditModal()
  ;(props.events![0].start as Date).setHours(8)
  expect(api.saveEvent()).toBe(false)
  expect(api.showEditModal.value).toBe(false)
  expect(emit).not.toHaveBeenCalled()
})

test.each(['save', 'delete'] as const)(
  '%s ends its session before synchronous update observers re-enter',
  async operation => {
    const { api, props, emit } = await calendar()
    if (operation === 'save') {
      api.openEditModal()
      api.editForm.value.title = 'Accepted'
    }
    const replacement = { ...original(), title: 'Replacement' }
    let reentered = false
    emit.mockImplementation(event => {
      if (event !== 'update:events' || reentered) return
      reentered = true
      props.events = [replacement]
      expect(api.saveEvent()).toBe(false)
      api.deleteEvent()
    })
    if (operation === 'save') expect(api.saveEvent()).toBe(true)
    else api.deleteEvent()
    expect(reentered).toBe(true)
    await flushPromises()
    expect(api.expose.getEvents()).toEqual([replacement])
    expect(
      emit.mock.calls.filter(([event]) => event === 'update:events')
    ).toHaveLength(1)
  }
)
