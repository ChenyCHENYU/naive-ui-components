import { ref, shallowRef, computed, watch } from 'vue'
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
  const getEditTime = (form: CalendarEditForm) => [
    form.date,
    form.endDate,
    form.startTime,
    form.endTime,
    form.allDay,
  ]
  let initialEditTime: unknown[] = []

  watch(
    () => [editForm.value, editForm.value.date] as const,
    ([form, date], [previousForm, previousDate]) => {
      if (form !== previousForm) return
      const { endDate } = editForm.value
      if (date == null || previousDate == null || endDate == null) return
      const previous = new Date(previousDate)
      const end = new Date(endDate)
      // 单日事件移动开始日期时，结束日期同步移动；跨日结束日期仍由用户明确选择。
      if (previous.toDateString() === end.toDateString())
        editForm.value.endDate = date
    },
    { flush: 'sync' }
  )

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
    if (props.editable === false) {
      info.revert()
      return
    }
    const payload = {
      id: info.event.id,
      start: info.event.start ?? undefined,
      end: info.event.end ?? undefined,
      allDay: info.event.allDay,
    }
    updateEventInArray(payload)
    emit('event-dropped', payload)
    message.success(`事件 "${info.event.title}" 时间已更新`)
  }

  /**
   *
   */
  function handleEventResize(info: EventResizeDoneArg) {
    if (props.editable === false) {
      info.revert()
      return
    }
    const payload = {
      id: info.event.id,
      start: info.event.start ?? undefined,
      end: info.event.end ?? undefined,
      allDay: info.event.allDay,
    }
    updateEventInArray(payload)
    emit('event-updated', payload)
  }

  /**
   *
   */
  function openAddModal(date: Date) {
    if (props.editable === false) return
    isEditing.value = false
    editForm.value = {
      ...DEFAULT_EDIT_FORM,
      date: date.getTime(),
      endDate: date.getTime(),
      allDay: false,
      color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
    }
    showEditModal.value = true
  }

  /**
   *
   */
  function openEditModal() {
    if (props.editable === false) return
    const event = selectedEvent.value
    if (!event?.start) return
    const { start } = event
    isEditing.value = true
    const startDate = new Date(start)
    const endDate = event.end
      ? new Date(event.end)
      : new Date(start.getTime() + (event.allDay ? 0 : 3600000))
    if (event.allDay && event.end) endDate.setDate(endDate.getDate() - 1)

    editForm.value = {
      id: event.id,
      title: event.title,
      date: startDate.getTime(),
      endDate: endDate.getTime(),
      allDay: event.allDay,
      startTime: `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`,
      color: event.backgroundColor || '#3f86ff',
    }
    initialEditTime = getEditTime(editForm.value)
    showActionDialog.value = false
    showEditModal.value = true
  }

  function getEditedRange(currentEvent?: CalendarEvent) {
    // 仅修改标题或颜色时保留原始日期精度、缺省 end 与全天语义。
    const timeUnchanged =
      currentEvent &&
      getEditTime(editForm.value).every(
        (value, index) => value === initialEditTime[index]
      )
    if (timeUnchanged)
      return {
        start: currentEvent.start,
        end: currentEvent.end,
        allDay: currentEvent.allDay,
      }
    const range = buildLocalEventRange(
      editForm.value.date,
      editForm.value.startTime,
      editForm.value.endTime,
      editForm.value.endDate === undefined
        ? editForm.value.date
        : editForm.value.endDate,
      editForm.value.allDay
    )
    return range && { ...range, allDay: Boolean(editForm.value.allDay) }
  }

  /** 校验完整编辑快照，成功后一次写回事件。 */
  function saveEvent() {
    if (props.editable === false) return false
    if (!editForm.value.title.trim()) {
      message.error('请输入事件标题')
      return false
    }
    const currentEvent = isEditing.value
      ? internalEvents.value.find(event => event.id === editForm.value.id)
      : undefined
    if (isEditing.value && !currentEvent) {
      message.error('事件已不存在，请刷新后重试')
      return false
    }
    const range = getEditedRange(currentEvent)
    if (!range) {
      message.error('请选择有效日期和时间，且结束时间须晚于开始时间')
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
    if (props.editable === false || !selectedEvent.value) return
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

  const calendarOptions = computed<CalendarOptions>(() => ({
    locale: zhCn,
    headerToolbar: HEADER_TOOLBAR,
    buttonText: BUTTON_TEXT,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
    ...props.config,
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    initialView: props.initialView ?? 'dayGridMonth',
    events: internalEvents.value,
    // 保持未设置状态，避免 Vue 适配器把每次新建的空数组视作清空事件源。
    eventSources: undefined,
    editable: props.editable ?? true,
  }))

  watch(
    () => props.editable,
    editable => {
      if (editable !== false) return
      showActionDialog.value = false
      showEditModal.value = false
      selectedEvent.value = null
    },
    { flush: 'sync' }
  )

  watch(
    () => props.events,
    newEvents => {
      internalEvents.value = [...(newEvents ?? [])]
    },
    { deep: true }
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
