import type { WaterFallBreakpoint } from "./types";

export const DEFAULT_GAP = 16;
export const DEFAULT_ANIMATION_DURATION = 300;
export const DEFAULT_SKELETON_COUNT = 8;
export const INFINITE_SCROLL_THRESHOLD = 200;

export const DEFAULT_BREAKPOINTS: WaterFallBreakpoint[] = [
  { minWidth: 1600, columns: 6 },
  { minWidth: 1200, columns: 5 },
  { minWidth: 992, columns: 4 },
  { minWidth: 768, columns: 3 },
  { minWidth: 480, columns: 2 },
  { minWidth: 0, columns: 1 },
];

export const SKELETON_HEIGHT_RANGE: [number, number] = [180, 360];
