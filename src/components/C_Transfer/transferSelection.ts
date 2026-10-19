import type { TransferItem } from './types'

/** Return checked keys that still exist and can currently be moved. */
export function movableKeys(
  items: TransferItem[],
  checked: ReadonlySet<string | number>
): Array<string | number> {
  if (!checked.size) return []
  const result: Array<string | number> = []
  for (const item of items)
    if (!item.disabled && checked.has(item.key)) result.push(item.key)
  return result
}

/** An all-selected state requires at least one enabled, visible item. */
export function allMovableChecked(
  items: TransferItem[],
  checked: ReadonlySet<string | number>
): boolean {
  let enabled = false
  for (const item of items) {
    if (item.disabled) continue
    if (!checked.has(item.key)) return false
    enabled = true
  }
  return enabled
}
