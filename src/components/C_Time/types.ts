import type { Ref } from "vue";

export type TimeMode = "range" | "single";

export interface TimeProps {
  mode?: TimeMode;
  startPlaceholder?: string;
  endPlaceholder?: string;
  placeholder?: string;
  format?: string;
  useHours?: boolean;
  useMinutes?: boolean;
  useSeconds?: boolean;
  hourStep?: number;
  minuteStep?: number;
  secondStep?: number;
  startTimeProps?: Record<string, any>;
  endTimeProps?: Record<string, any>;
  attrs?: Record<string, any>;
  defaultStartTime?: number | null;
  defaultEndTime?: number | null;
  defaultSingleTime?: number | null;
  enableTimeRestriction?: boolean;
}

export interface TimeEmits {
  "change-range": [startTime: number | null, endTime: number | null];
  "change-single": [time: number | null];
  "change-start": [time: number | null];
  "change-end": [time: number | null];
}

export interface TimeExpose {
  reset: () => void;
  startTime: Ref<number | null>;
  endTime: Ref<number | null>;
  singleTime: Ref<number | null>;
}
