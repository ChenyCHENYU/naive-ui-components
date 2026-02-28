import type { CalendarEditForm } from "./types";

export const EVENT_COLORS = [
  "#3f86ff",
  "#ff6b6b",
  "#67c23a",
  "#e6a23c",
  "#9c27b0",
  "#00bcd4",
  "#ff5722",
];

export const DEFAULT_EDIT_FORM: CalendarEditForm = {
  id: "",
  title: "",
  date: Date.now(),
  startTime: "09:00",
  endTime: "10:00",
  color: "#3f86ff",
};

export const HEADER_TOOLBAR = {
  left: "prev,next today",
  center: "title",
  right: "dayGridMonth,dayGridWeek,dayGridDay,listWeek",
};

export const BUTTON_TEXT = {
  today: "今天",
  month: "月",
  week: "周",
  day: "日",
  list: "列表",
};
