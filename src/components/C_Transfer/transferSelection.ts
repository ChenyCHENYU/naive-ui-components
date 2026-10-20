import type { TransferItem } from './types'

/** Return checked keys that still exist and can currently be moved. */
export function movableKeys<T extends TransferItem>(
  items: readonly T[],
  checked: ReadonlySet<T['key']>
): Array<T['key']> {
  if (!checked.size) return []
  const result: Array<T['key']> = []
  for (const item of items)
    if (!item.disabled && checked.has(item.key)) result.push(item.key)
  return result
}

/** An all-selected state requires at least one enabled, visible item. */
export function allMovableChecked<T extends TransferItem>(
  items: readonly T[],
  checked: ReadonlySet<T['key']>
): boolean {
  let enabled = false
  for (const item of items) {
    if (item.disabled) continue
    if (!checked.has(item.key)) return false
    enabled = true
  }
  return enabled
}
