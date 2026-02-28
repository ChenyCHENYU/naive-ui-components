export interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end?: Date | string;
  color?: string;
  editable?: boolean;
  [key: string]: any;
}

export type CalendarViewType =
  | "dayGridMonth"
  | "dayGridWeek"
  | "dayGridDay"
  | "listWeek";

export interface CalendarEditForm {
  id: string;
  title: string;
  date: number;
  startTime: string;
  endTime: string;
  color: string;
}

export interface CalendarProps {
  events?: CalendarEvent[];
  initialView?: CalendarViewType;
  editable?: boolean;
  showAddDialog?: boolean;
  showEditDialog?: boolean;
}

export interface CalendarEmits {
  "update:events": [events: CalendarEvent[]];
  "event-added": [event: CalendarEvent];
  "event-updated": [event: Partial<CalendarEvent>];
  "event-deleted": [event: { id: string; title: string }];
  "event-dropped": [event: Partial<CalendarEvent>];
}

export interface CalendarExpose {
  getApi: () => any;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (eventData: Partial<CalendarEvent>) => void;
  deleteEvent: (eventId: string) => void;
  getEvents: () => CalendarEvent[];
}
