export interface DraggableItem {
  id: string | number;
  title?: string;
  name?: string;
  label?: string;
  description?: string;
  [key: string]: any;
}

export interface DragEvent {
  oldIndex: number;
  newIndex: number;
  item: DraggableItem;
}

export interface GroupOptions {
  name: string;
  pull?: boolean | string | string[];
  put?: boolean | string | string[];
  revertClone?: boolean;
}

export type LayoutMode = "vertical" | "horizontal" | "grid" | "flex-wrap";

export type JustifyContent =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly";

export type AlignItems =
  | "flex-start"
  | "flex-end"
  | "center"
  | "stretch"
  | "baseline";

export interface DraggableProps {
  modelValue?: DraggableItem[];
  disabled?: boolean;
  group?: string | GroupOptions;
  sort?: boolean;
  animation?: number;
  delay?: number;
  handle?: string;
  showHandle?: boolean;
  ghostClass?: string;
  chosenClass?: string;
  dragClass?: string;
  wrapperClass?: string;
  listClass?: string;
  itemClass?: string;
  showEmptyState?: boolean;
  emptyText?: string;
  itemKey?: (item: DraggableItem, index: number) => string | number;
  itemTitle?: (item: DraggableItem) => string;
  itemDescription?: (item: DraggableItem) => string;
  swapThreshold?: number;
  invertSwap?: boolean;
  direction?: "vertical" | "horizontal";
  layout?: LayoutMode;
  gridColumns?: number;
  gridRows?: number;
  gap?: string | number;
  flexWrap?: boolean;
  justifyContent?: JustifyContent;
  alignItems?: AlignItems;
  customStyles?: Record<string, string | number>;
}

export interface DraggableEmits {
  "update:modelValue": [value: DraggableItem[]];
  "drag-start": [event: DragEvent];
  "drag-end": [event: DragEvent];
  "item-add": [item: DraggableItem, index: number];
  "item-remove": [item: DraggableItem, index: number];
  "list-change": [list: DraggableItem[]];
}
