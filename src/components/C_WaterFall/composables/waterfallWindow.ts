import type { WaterFallItem, WaterFallLayoutItem } from '../types'

export interface WaterFallWindowEntry<T extends WaterFallItem = WaterFallItem> {
  layout: WaterFallLayoutItem<T>
  index: number
  bottom: number
}

/** Rebuilt only when layout changes, never on scroll. */
export function indexWaterFallLayout<T extends WaterFallItem = WaterFallItem>(
  layout: readonly WaterFallLayoutItem<T>[]
) {
  const columns: WaterFallWindowEntry<T>[][] = []
  const byId = new Map<string | number, WaterFallWindowEntry<T>>()
  const entries = layout.map((item, index) => {
    const entry = {
      layout: item,
      index,
      bottom: item.y + (item.totalHeight ?? item.height),
    }
    ;(columns[item.columnIndex] ??= []).push(entry)
    byId.set(item.item.id, entry)
    return entry
  })
  return { columns, byId, entries }
}

/** Each column has non-overlapping, increasing intervals: O(columns log N + visible). */
export function findWaterFallWindow<T extends WaterFallItem = WaterFallItem>(
  columns: readonly (readonly WaterFallWindowEntry<T>[])[],
  top: number,
  bottom: number
) {
  const visible: WaterFallWindowEntry<T>[] = []
  for (const column of columns) {
    if (!column) continue
    let low = 0
    let high = column.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (column[middle].bottom < top) low = middle + 1
      else high = middle
    }
    for (let index = low; index < column.length; index++) {
      const entry = column[index]
      if (entry.layout.y > bottom) break
      visible.push(entry)
    }
  }
  return visible.sort((left, right) => left.index - right.index)
}
