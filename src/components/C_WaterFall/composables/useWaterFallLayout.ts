import {
  ref,
  readonly,
  computed,
  watch,
  getCurrentScope,
  getCurrentInstance,
  onActivated,
  onDeactivated,
  onScopeDispose,
  type Ref,
} from 'vue'
import type {
  WaterFallItem,
  WaterFallLayoutItem,
  WaterFallColumn,
} from '../types'
import { DEFAULT_GAP } from '../constants'

/**
 *
 */
export function useWaterFallLayout(
  items: Ref<WaterFallItem[]>,
  columns: Readonly<Ref<number>>,
  containerWidth: Readonly<Ref<number>>,
  gap: Ref<number>,
  options: { batchImageLoads?: boolean } = {}
) {
  const layoutItems = ref<WaterFallLayoutItem[]>([])
  const containerHeight = ref(0)
  const itemExtraHeights = new Map<
    string | number,
    { height: number; basisWidth?: number; src?: string }
  >()
  const imageHeightCache = new Map<
    string | number,
    { height: number; basisWidth?: number; src?: string }
  >()
  const sourcesById = computed(
    () => new Map(items.value.map(item => [item.id, item.src]))
  )
  let pendingFrame: number | undefined
  let disposed = false
  let paused = false
  const cancelScheduledLayout = () => {
    if (pendingFrame !== undefined) cancelAnimationFrame(pendingFrame)
    pendingFrame = undefined
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      disposed = true
      cancelScheduledLayout()
      imageHeightCache.clear()
      itemExtraHeights.clear()
    })
  const scheduleLayout = () => {
    if (disposed || paused) return
    if (
      !options.batchImageLoads ||
      typeof requestAnimationFrame === 'undefined'
    ) {
      calculate()
      return
    }
    if (pendingFrame !== undefined) return
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = undefined
      calculate()
    })
  }

  function scaleHeight(height: number, basisWidth: number, width: number) {
    const ratio = height / basisWidth
    return Number.isFinite(ratio) && ratio > 0 ? ratio * width : width
  }

  function resolveItemHeight(item: WaterFallItem, width: number) {
    const entry = imageHeightCache.get(item.id)
    const cached = entry?.src && entry.src !== item.src ? undefined : entry
    if (cached && !cached.basisWidth) return cached.height
    if (cached?.basisWidth)
      return scaleHeight(cached.height, cached.basisWidth, width)
    return scaleHeight(item.height, item.width, width)
  }

  function clearLayout() {
    layoutItems.value = []
    containerHeight.value = 0
    if (items.value.length === 0) {
      imageHeightCache.clear()
      itemExtraHeights.clear()
    }
  }

  function hasUsableLayout(cols: number, width: number, gap: number) {
    return (
      Number.isFinite(cols) &&
      Number.isFinite(width) &&
      Number.isFinite(gap) &&
      width > 0 &&
      items.value.length > 0
    )
  }

  function cacheImageHeight(
    id: string | number,
    realHeight: number,
    basisWidth?: number,
    src?: string
  ) {
    if (!canMeasure(id, src)) return
    if (!isValidMeasurement(realHeight, basisWidth)) return
    const previous = imageHeightCache.get(id)
    if (
      previous?.height === realHeight &&
      previous.basisWidth === basisWidth &&
      previous.src === src
    )
      return
    imageHeightCache.set(id, { height: realHeight, basisWidth, src })
    scheduleLayout()
  }

  function canMeasure(id: string | number, src?: string) {
    return (
      !disposed &&
      !paused &&
      sourcesById.value.has(id) &&
      (src === undefined || sourcesById.value.get(id) === src)
    )
  }

  function isValidMeasurement(height: number, width?: number) {
    return (
      Number.isFinite(height) &&
      height > 0 &&
      (width === undefined || (Number.isFinite(width) && width > 0))
    )
  }

  /** Include captions, borders and custom slot content in column placement. */
  function cacheItemExtraHeight(
    id: string | number,
    extraHeight: number,
    basisWidth?: number,
    src?: string
  ) {
    if (!canMeasure(id, src) || !Number.isFinite(extraHeight)) return
    const previous = itemExtraHeights.get(id)
    if (
      Math.abs((previous?.height ?? 0) - extraHeight) < 0.5 &&
      previous?.basisWidth === basisWidth &&
      previous?.src === src
    )
      return
    itemExtraHeights.set(id, { height: extraHeight, basisWidth, src })
    scheduleLayout()
  }

  function pruneMeasurements(presentIds: Set<string | number>) {
    for (const cache of [imageHeightCache, itemExtraHeights]) {
      for (const id of cache.keys()) {
        if (!presentIds.has(id)) cache.delete(id)
      }
    }
  }

  function resolveExtraHeight(item: WaterFallItem, width: number) {
    const extra = itemExtraHeights.get(item.id)
    if (
      !extra ||
      (extra.basisWidth !== undefined && extra.basisWidth !== width) ||
      (extra.src !== undefined && extra.src !== item.src)
    )
      return 0
    return extra.height
  }

  function calculate() {
    cancelScheduledLayout()
    if (disposed || paused) return
    const presentIds = new Set(sourcesById.value.keys())
    pruneMeasurements(presentIds)
    const cols = Math.min(24, Math.max(1, Math.floor(columns.value)))
    const width = containerWidth.value
    const g = Math.max(0, gap.value ?? DEFAULT_GAP)

    if (!hasUsableLayout(cols, width, g)) {
      clearLayout()
      return
    }

    const colWidth = (width - (cols - 1) * g) / cols
    if (colWidth <= 0) {
      clearLayout()
      return
    }
    const columnState: WaterFallColumn[] = Array.from(
      { length: cols },
      (_, i) => ({ index: i, height: 0 })
    )

    const result: WaterFallLayoutItem[] = []

    for (const item of items.value) {
      const shortest = columnState.reduce((min, col) =>
        col.height < min.height ? col : min
      )

      const itemHeight = resolveItemHeight(item, colWidth)
      const extraHeight = resolveExtraHeight(item, colWidth)
      const totalHeight = Math.max(1, itemHeight + extraHeight)

      const x = shortest.index * (colWidth + g)
      const y = shortest.height

      result.push({
        item,
        columnIndex: shortest.index,
        x,
        y,
        width: colWidth,
        height: itemHeight,
        totalHeight,
      })

      shortest.height = y + totalHeight + g
    }

    layoutItems.value = result
    containerHeight.value = Math.max(...columnState.map(c => c.height)) - g
  }

  watch(
    [
      () =>
        items.value.map(item => [
          item,
          item.id,
          item.src,
          item.width,
          item.height,
        ]),
      columns,
      containerWidth,
      gap,
    ],
    calculate,
    { immediate: true }
  )
  if (getCurrentInstance()) {
    onDeactivated(() => {
      paused = true
      cancelScheduledLayout()
    })
    onActivated(() => {
      paused = false
      calculate()
    })
  }

  return {
    layoutItems: readonly(layoutItems),
    containerHeight: readonly(containerHeight),
    cacheImageHeight,
    cacheItemExtraHeight,
    relayout: calculate,
  }
}
