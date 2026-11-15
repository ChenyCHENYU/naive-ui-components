import type { DeepReadonly, UnwrapRef, VNodeChild } from 'vue'

export interface WaterFallItem {
  id: string | number
  src: string
  width: number
  height: number
  title?: string
  description?: string
  [key: string]: any
}

/** 深代理保留既有只读与 Ref 解包语义；由包内部推导，调用方无需转换。 */
export type WaterFallRenderedItem<T extends WaterFallItem = WaterFallItem> =
  DeepReadonly<UnwrapRef<T>>

export interface WaterFallLayoutItem<T extends WaterFallItem = WaterFallItem> {
  item: T
  columnIndex: number
  x: number
  y: number
  width: number
  height: number
  /** Measured outer card height, including captions and custom slot content. */
  totalHeight?: number
}

export interface WaterFallColumn {
  index: number
  height: number
}

export interface WaterFallBreakpoint {
  minWidth: number
  columns: number
}

export type InfiniteScrollStatus = 'idle' | 'loading' | 'no-more' | 'error'

export interface WaterFallProps<T extends WaterFallItem = WaterFallItem> {
  items: readonly T[]
  columns?: number
  gap?: number
  lazy?: boolean
  /** Automatically window lists of 100+ items; false keeps every item mounted. */
  virtualScroll?: boolean
  infinite?: boolean
  skeleton?: boolean
  skeletonCount?: number
  animationDuration?: number
  breakpoints?: WaterFallBreakpoint[]
  loading?: boolean
  noMore?: boolean
}

export interface WaterFallEmits<T extends WaterFallItem = WaterFallItem> {
  'load-more': []
  'item-click': [item: WaterFallRenderedItem<T>, index: number]
  'image-loaded': [item: WaterFallRenderedItem<T>]
  'image-error': [item: WaterFallRenderedItem<T>]
}

export interface WaterFallExpose {
  relayout: () => void
  scrollToTop: () => void
  getColumns: () => number
  getContainerHeight: () => number
}

/** 业务字段由 items 推导；自定义卡片不需要转为库内部类型。 */
export interface WaterFallSlots<T extends WaterFallItem = WaterFallItem> {
  item?: (context: {
    item: WaterFallRenderedItem<T>
    index: number
    width: number
    height: number
  }) => VNodeChild
  skeleton?: () => VNodeChild
  footer?: (context: {
    status: InfiniteScrollStatus
    paused: boolean
    loadMore: () => void
  }) => VNodeChild
}
