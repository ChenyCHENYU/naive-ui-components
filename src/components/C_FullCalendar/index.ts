export { default as C_FullCalendar } from "./index.vue";
export type {
  CalendarEvent,
  CalendarViewType,
  CalendarEditForm,
  CalendarProps,
  CalendarEmits,
  CalendarExpose,
} from "./types";
export {
  EVENT_COLORS,
  DEFAULT_EDIT_FORM,
  HEADER_TOOLBAR,
  BUTTON_TEXT,
} from "./data";
export { useCalendarEvents } from "./composables/useCalendarEvents";
