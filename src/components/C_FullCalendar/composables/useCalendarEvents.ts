import { ref, shallowRef, watch, type Ref } from 'vue'
import { useComponentFeedback } from '../../../config'
import type { CalendarEvent, CalendarProps, CalendarEditForm } from '../types'
import {
  EVENT_COLORS,
  DEFAULT_EDIT_FORM,
  HEADER_TOOLBAR,
  BUTTON_TEXT,
} from '../data'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, {
  type DateClickArg,
  type EventResizeDoneArg,
} from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type {
  CalendarApi,
  CalendarOptions,
  EventApi,
  EventClickArg,
  EventDropArg,
} from '@fullcalendar/core'
import zhCn from '@fullcalendar/core/locales/zh-cn'
import { buildLocalEventRange } from '../calendarDate'

type EmitFn = {
  (event: 'update:events', events: CalendarEvent[]): void
  (event: 'event-added', eventData: CalendarEvent): void
  (event: 'event-updated', eventData: Partial<CalendarEvent>): void
  (event: 'event-deleted', eventData: { id: string; title: string }): void
  (event: 'event-dropped', eventData: Partial<CalendarEvent>): void
}

let fallbackEventId = 0
const createEventId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `calendar-${Date.now()}-${++fallbackEventId}`

/**
 *
 */
export function useCalendarEvents(props: CalendarProps, emit: EmitFn) {
  const message = useComponentFeedback()
  const calendarRef = ref<{ getApi: () => CalendarApi } | null>(null)

  const internalEvents = ref<CalendarEvent[]>([...(props.events ?? [])])

  const showActionDialog = ref(false)
  const showEditModal = ref(false)
  const isEditing = ref(false)
  const selectedEvent = shallowRef<EventApi | null>(null)
  const editForm = ref<CalendarEditForm>({ ...DEFAULT_EDIT_FORM })

  const addEventToArray = (event: CalendarEvent) => {
    internalEvents.value = [...internalEvents.value, event]
    emit('update:events', internalEvents.value)
  }

  const updateEventInArray = (eventData: Partial<CalendarEvent>) => {
    const index = internalEvents.value.findIndex(e => e.id === eventData.id)
    if (index !== -1) {
      internalEvents.value = internalEvents.value.map((event, i) =>
        i === index ? { ...event, ...eventData } : event
      )
      emit('update:events', internalEvents.value)
    }
  }

  const removeEventFromArray = (eventId: string) => {
    internalEvents.value = internalEvents.value.filter(e => e.id !== eventId)
    emit('update:events', internalEvents.value)
  }

  /**
   *
   */
  function handleEventClick(info: EventClickArg) {
    if (!props.editable) return
    info.jsEvent.preventDefault()
    selectedEvent.value = info.event
    if (props.showEditDialog) showActionDialog.value = true
  }

  /**
   *
   */
  function handleDateClick(info: DateClickArg) {
    if (!props.editable || !props.showAddDialog) return
    openAddModal(info.date)
  }

  /**
   *
   */
  function handleEventDrop(info: EventDropArg) {
    const payload = {
      id: info.event.id,
      start: info.event.start ?? undefined,
      end: info.event.end ?? undefined,
    }
    updateEventInArray(payload)
    emit('event-dropped', payload)
    message.success(`事件 "${info.event.title}" 时间已更新`)
  }

  /**
   *
   */
  function handleEventResize(info: EventResizeDoneArg) {
    const payload = {
      id: info.event.id,
      start: info.event.start ?? undefined,
      end: info.event.end ?? undefined,
    }
    updateEventInArray(payload)
    emit('event-updated', payload)
  }

  /**
   *
   */
  function openAddModal(date: Date) {
    isEditing.value = false
    editForm.value = {
      ...DEFAULT_EDIT_FORM,
      date: date.getTime(),
      color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
    }
    showEditModal.value = true
  }

  /**
   *
   */
  function openEditModal() {
    const event = selectedEvent.value
    if (!event?.start) return
    const { start } = event
    isEditing.value = true
    const startDate = new Date(start)
    const endDate =
      event.end && !event.allDay
        ? new Date(event.end)
        : new Date(start.getTime() + 3600000)

    editForm.value = {
      id: event.id,
      title: event.title,
      date: startDate.getTime(),
      startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
      color: event.backgroundColor || '#3f86ff',
    }
    showActionDialog.value = false
    showEditModal.value = true
  }

  /**
   *
   */
  function saveEvent() {
    if (!editForm.value.title.trim()) {
      message.error('请输入事件标题')
      return false
    }
    const range = buildLocalEventRange(
      editForm.value.date,
      editForm.value.startTime,
      editForm.value.endTime
    )
    if (!range) {
      message.error('请选择有效日期和时间，且结束时间须晚于开始时间')
      return false
    }
    if (
      isEditing.value &&
      !internalEvents.value.some(event => event.id === editForm.value.id)
    ) {
      message.error('事件已不存在，请刷新后重试')
      return false
    }

    const eventData: CalendarEvent = {
      id: isEditing.value ? editForm.value.id : createEventId(),
      title: editForm.value.title.trim(),
      ...range,
      color: editForm.value.color,
    }

    if (isEditing.value) {
      updateEventInArray(eventData)
      emit('event-updated', eventData)
      message.success('事件已更新')
    } else {
      addEventToArray(eventData)
      emit('event-added', eventData)
      message.success('事件已添加')
    }

    showEditModal.value = false
    return true
  }

  /**
   *
   */
  function deleteEvent() {
    if (!selectedEvent.value) return
    const { id, title } = selectedEvent.value
    if (!internalEvents.value.some(event => event.id === id)) {
      showActionDialog.value = false
      return
    }
    removeEventFromArray(id)
    emit('event-deleted', { id, title })
    showActionDialog.value = false
    message.success(`已删除事件: ${title}`)
  }

  const calendarOptions: Ref<CalendarOptions> = shallowRef({
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    locale: zhCn,
    initialView: props.initialView ?? 'dayGridMonth',
    events: internalEvents.value,
    headerToolbar: HEADER_TOOLBAR,
    buttonText: BUTTON_TEXT,
    editable: props.editable ?? true,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
  })

  watch(
    () => props.events,
    newEvents => {
      internalEvents.value = [...(newEvents ?? [])]
    },
    { deep: true }
  )

  watch(
    internalEvents,
    newEvents => {
      calendarOptions.value = {
        ...calendarOptions.value,
        events: newEvents,
      }
    },
    { deep: true }
  )

  watch(
    () => props.editable,
    editable => {
      calendarOptions.value = {
        ...calendarOptions.value,
        editable: editable ?? true,
      }
    }
  )

  watch(
    () => props.initialView,
    view => {
      if (view) calendarRef.value?.getApi().changeView(view)
    }
  )

  return {
    calendarRef,
    calendarOptions,
    showActionDialog,
    showEditModal,
    isEditing,
    selectedEvent,
    editForm,
    eventColors: EVENT_COLORS,
    openEditModal,
    saveEvent,
    deleteEvent,
    expose: {
      getApi: () => calendarRef.value?.getApi(),
      addEvent: addEventToArray,
      updateEvent: updateEventInArray,
      deleteEvent: removeEventFromArray,
      getEvents: () =>
        internalEvents.value.map(event => ({
          ...event,
          start:
            event.start instanceof Date ? new Date(event.start) : event.start,
          end: event.end instanceof Date ? new Date(event.end) : event.end,
        })),
    },
  }
}
