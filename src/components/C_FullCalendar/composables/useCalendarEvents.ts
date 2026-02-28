import { ref, watch } from "vue";
import { useMessage } from "naive-ui";
import type { Ref } from "vue";
import type { CalendarEvent, CalendarProps, CalendarEditForm } from "../types";
import {
  EVENT_COLORS,
  DEFAULT_EDIT_FORM,
  HEADER_TOOLBAR,
  BUTTON_TEXT,
} from "../data";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import type { CalendarOptions } from "@fullcalendar/core";
import zhCn from "@fullcalendar/core/locales/zh-cn";

type EmitFn = {
  (event: "update:events", events: CalendarEvent[]): void;
  (event: "event-added", eventData: CalendarEvent): void;
  (event: "event-updated", eventData: Partial<CalendarEvent>): void;
  (event: "event-deleted", eventData: { id: string; title: string }): void;
  (event: "event-dropped", eventData: Partial<CalendarEvent>): void;
};

export function useCalendarEvents(props: CalendarProps, emit: EmitFn) {
  const message = useMessage();
  const calendarRef = ref();

  const internalEvents = ref<CalendarEvent[]>([...(props.events ?? [])]);

  const showActionDialog = ref(false);
  const showEditModal = ref(false);
  const isEditing = ref(false);
  const selectedEvent = ref<any>(null);
  const editForm = ref<CalendarEditForm>({ ...DEFAULT_EDIT_FORM });

  const addEventToArray = (event: CalendarEvent) => {
    internalEvents.value = [...internalEvents.value, event];
    emit("update:events", internalEvents.value);
  };

  const updateEventInArray = (eventData: Partial<CalendarEvent>) => {
    const index = internalEvents.value.findIndex((e) => e.id === eventData.id);
    if (index !== -1) {
      internalEvents.value = internalEvents.value.map((event, i) =>
        i === index ? { ...event, ...eventData } : event,
      );
      emit("update:events", internalEvents.value);
    }
  };

  const removeEventFromArray = (eventId: string) => {
    internalEvents.value = internalEvents.value.filter((e) => e.id !== eventId);
    emit("update:events", internalEvents.value);
  };

  function handleEventClick(info: any) {
    if (!props.editable) return;
    info.jsEvent.preventDefault();
    selectedEvent.value = info.event;
    if (props.showEditDialog) showActionDialog.value = true;
  }

  function handleDateClick(info: any) {
    if (!props.editable || !props.showAddDialog) return;
    openAddModal(new Date(info.dateStr));
  }

  function handleEventDrop(info: any) {
    const payload = {
      id: info.event.id,
      start: info.event.start,
      end: info.event.end,
    };
    updateEventInArray(payload);
    emit("event-dropped", payload);
    message.success(`事件 "${info.event.title}" 时间已更新`);
  }

  function handleEventResize(info: any) {
    const payload = {
      id: info.event.id,
      start: info.event.start,
      end: info.event.end,
    };
    updateEventInArray(payload);
    emit("event-updated", payload);
  }

  function openAddModal(date: Date) {
    isEditing.value = false;
    editForm.value = {
      ...DEFAULT_EDIT_FORM,
      date: date.getTime(),
      color: EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)],
    };
    showEditModal.value = true;
  }

  function openEditModal() {
    if (!selectedEvent.value) return;
    isEditing.value = true;
    const event = selectedEvent.value;
    const startDate = new Date(event.start);
    const endDate = event.end
      ? new Date(event.end)
      : new Date(event.start.getTime() + 3600000);

    editForm.value = {
      id: event.id,
      title: event.title,
      date: startDate.getTime(),
      startTime: `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
      endTime: `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
      color: event.backgroundColor || "#3f86ff",
    };
    showActionDialog.value = false;
    showEditModal.value = true;
  }

  function saveEvent() {
    if (!editForm.value.title.trim()) {
      message.error("请输入事件标题");
      return false;
    }
    if (editForm.value.startTime >= editForm.value.endTime) {
      message.error("结束时间必须晚于开始时间");
      return false;
    }

    const dateStr = new Date(editForm.value.date).toISOString().split("T")[0];
    const eventData: CalendarEvent = {
      id: isEditing.value ? editForm.value.id : Date.now().toString(),
      title: editForm.value.title,
      start: new Date(`${dateStr}T${editForm.value.startTime}:00`),
      end: new Date(`${dateStr}T${editForm.value.endTime}:00`),
      color: editForm.value.color,
    };

    if (isEditing.value) {
      updateEventInArray(eventData);
      emit("event-updated", eventData);
      message.success("事件已更新");
    } else {
      addEventToArray(eventData);
      emit("event-added", eventData);
      message.success("事件已添加");
    }

    showEditModal.value = false;
    return true;
  }

  function deleteEvent() {
    if (!selectedEvent.value) return;
    const { id, title } = selectedEvent.value;
    removeEventFromArray(id);
    emit("event-deleted", { id, title });
    showActionDialog.value = false;
    message.success(`已删除事件: ${title}`);
  }

  const calendarOptions: Ref<CalendarOptions> = ref({
    plugins: [dayGridPlugin, interactionPlugin, listPlugin],
    locale: zhCn,
    initialView: props.initialView ?? "dayGridMonth",
    events: internalEvents.value as any,
    headerToolbar: HEADER_TOOLBAR,
    buttonText: BUTTON_TEXT,
    editable: props.editable ?? true,
    eventClick: handleEventClick,
    dateClick: handleDateClick,
    eventDrop: handleEventDrop,
    eventResize: handleEventResize,
  });

  watch(
    () => props.events,
    (newEvents) => {
      internalEvents.value = [...(newEvents ?? [])];
    },
    { deep: true },
  );

  watch(
    internalEvents,
    (newEvents) => {
      calendarOptions.value.events = newEvents as any;
    },
    { deep: true },
  );

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
      getEvents: () => internalEvents.value,
    },
  };
}
