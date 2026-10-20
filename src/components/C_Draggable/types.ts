import type { DeepReadonly, VNodeChild } from 'vue'

export interface DraggableItem {
  id: string | number
  title?: string
  name?: string
  label?: string
  description?: string
  [key: string]: unknown
}

export interface DragEvent<T extends object = DraggableItem> {
  oldIndex: number
  newIndex: number
  item: T
}

export interface GroupOptions {
  name: string
  pull?: boolean | string | string[]
  put?: boolean | string | string[]
  revertClone?: boolean
}

export type LayoutMode = 'vertical' | 'horizontal' | 'grid' | 'flex-wrap'

export type JustifyContent =
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'space-between'
  | 'space-around'
  | 'space-evenly'

export type AlignItems =
  'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'

export interface DraggableProps<T extends object = DraggableItem> {
  modelValue?: T[]
  disabled?: boolean
  group?: string | GroupOptions
  sort?: boolean
  animation?: number
  delay?: number
  handle?: string
  showHandle?: boolean
  ghostClass?: string
  chosenClass?: string
  dragClass?: string
  wrapperClass?: string
  listClass?: string
  itemClass?: string
  showEmptyState?: boolean
  emptyText?: string
  itemKey?: (item: T, index: number) => string | number
  itemTitle?: (item: T) => string
  itemDescription?: (item: T) => string
  swapThreshold?: number
  invertSwap?: boolean
  direction?: 'vertical' | 'horizontal'
  layout?: LayoutMode
  gridColumns?: number
  gridRows?: number
  gap?: string | number
  flexWrap?: boolean
  justifyContent?: JustifyContent
  alignItems?: AlignItems
  customStyles?: Record<string, string | number>
}

export interface DraggableEmits<T extends object = DraggableItem> {
  'update:modelValue': [value: T[]]
  'drag-start': [event: DragEvent<T>]
  'drag-end': [event: DragEvent<T>]
  'item-add': [item: T, index: number]
  'item-remove': [item: T, index: number]
  'list-change': [list: T[]]
}

/** 插槽直接保留 v-model 的业务项类型。 */
export interface DraggableSlots<T extends object = DraggableItem> {
  default?: (context: {
    item: T
    index: number
    isDragging: boolean
    isDisabled: boolean
  }) => VNodeChild
  empty?: () => VNodeChild
}

/** Vue 公开实例中的状态已经解包；列表只读，修改统一通过方法。 */
export interface DraggableExpose<T extends object = DraggableItem> {
  isDragging: boolean
  list: readonly DeepReadonly<T>[]
  isEmpty: boolean
  addItem: (item: T, index?: number) => void
  removeItem: (index: number) => T | null
  moveItem: (fromIndex: number, toIndex: number) => boolean
  updateList: (list: T[]) => void
  clear: () => void
  getItem: (index: number) => T | undefined
  findIndex: (predicate: (item: T) => boolean) => number
}
