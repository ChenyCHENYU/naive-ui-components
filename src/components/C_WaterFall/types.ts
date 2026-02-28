export interface WaterFallItem {
  id: string | number;
  src: string;
  width: number;
  height: number;
  title?: string;
  description?: string;
  [key: string]: any;
}

export interface WaterFallLayoutItem {
  item: WaterFallItem;
  columnIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WaterFallColumn {
  index: number;
  height: number;
}

export interface WaterFallBreakpoint {
  minWidth: number;
  columns: number;
}

export type InfiniteScrollStatus = "idle" | "loading" | "no-more" | "error";

export interface WaterFallProps {
  items: WaterFallItem[];
  columns?: number;
  gap?: number;
  lazy?: boolean;
  infinite?: boolean;
  skeleton?: boolean;
  skeletonCount?: number;
  animationDuration?: number;
  breakpoints?: WaterFallBreakpoint[];
  loading?: boolean;
  noMore?: boolean;
}

export interface WaterFallEmits {
  "load-more": [];
  "item-click": [item: WaterFallItem, index: number];
  "image-loaded": [item: WaterFallItem];
  "image-error": [item: WaterFallItem];
}

export interface WaterFallExpose {
  relayout: () => void;
  scrollToTop: () => void;
  getColumns: () => number;
  getContainerHeight: () => number;
}
