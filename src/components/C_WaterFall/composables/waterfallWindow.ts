import type { WaterFallLayoutItem } from '../types'

export interface WaterFallWindowEntry {
  layout: WaterFallLayoutItem
  index: number
  bottom: number
}

/** Rebuilt only when layout changes, never on scroll. */
export function indexWaterFallLayout(layout: readonly WaterFallLayoutItem[]) {
  const columns: WaterFallWindowEntry[][] = []
  const byId = new Map<string | number, WaterFallWindowEntry>()
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
export function findWaterFallWindow(
  columns: readonly (readonly WaterFallWindowEntry[])[],
  top: number,
  bottom: number
) {
  const visible: WaterFallWindowEntry[] = []
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
