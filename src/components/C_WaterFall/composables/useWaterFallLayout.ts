import { ref, readonly, watch, type Ref } from 'vue'
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
  gap: Ref<number>
) {
  const layoutItems = ref<WaterFallLayoutItem[]>([])
  const containerHeight = ref(0)
  const imageHeightCache = new Map<
    string | number,
    { height: number; basisWidth?: number; src?: string }
  >()

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
    if (items.value.length === 0) imageHeightCache.clear()
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
    if (!Number.isFinite(realHeight) || realHeight <= 0) return
    if (
      basisWidth !== undefined &&
      (!Number.isFinite(basisWidth) || basisWidth <= 0)
    )
      return
    const previous = imageHeightCache.get(id)
    if (
      previous?.height === realHeight &&
      previous.basisWidth === basisWidth &&
      previous.src === src
    )
      return
    imageHeightCache.set(id, { height: realHeight, basisWidth, src })
    calculate()
  }

  function calculate() {
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

    const presentIds = new Set<string | number>()
    for (const item of items.value) {
      presentIds.add(item.id)
      const shortest = columnState.reduce((min, col) =>
        col.height < min.height ? col : min
      )

      const itemHeight = resolveItemHeight(item, colWidth)

      const x = shortest.index * (colWidth + g)
      const y = shortest.height

      result.push({
        item,
        columnIndex: shortest.index,
        x,
        y,
        width: colWidth,
        height: itemHeight,
      })

      shortest.height = y + itemHeight + g
    }

    for (const id of imageHeightCache.keys()) {
      if (!presentIds.has(id)) imageHeightCache.delete(id)
    }

    layoutItems.value = result
    containerHeight.value = Math.max(...columnState.map(c => c.height)) - g
  }

  watch(
    [items, () => items.value.length, columns, containerWidth, gap],
    calculate,
    { immediate: true }
  )

  return {
    layoutItems: readonly(layoutItems),
    containerHeight: readonly(containerHeight),
    cacheImageHeight,
    relayout: calculate,
  }
}
