import type { TransferItem } from './types'

/** Return checked keys that still exist and can currently be moved. */
export function movableKeys(
  items: TransferItem[],
  checked: ReadonlySet<string | number>
): Array<string | number> {
  return items
    .filter(item => !item.disabled && checked.has(item.key))
    .map(item => item.key)
}

/** An all-selected state requires at least one enabled, visible item. */
export function allMovableChecked(
  items: TransferItem[],
  checked: ReadonlySet<string | number>
): boolean {
  const enabled = items.filter(item => !item.disabled)
  return enabled.length > 0 && enabled.every(item => checked.has(item.key))
}
