import type { TransferColumn, TransferItem } from './types'

const TRANSFER_ENTRY = Symbol('TransferEntry')

export type TransferEntry<T> = { [TRANSFER_ENTRY]: true } & (
  | { kind: 'item'; key: string; depth: number; item: T }
  | {
      kind: 'group'
      key: string
      depth: number
      label: string
      expanded: boolean
    }
)

interface Group<T> {
  label: string
  key: string
  groups: Map<string, Group<T>>
  items: T[]
}

function itemEntry<T extends TransferItem>(
  item: T,
  depth: number
): TransferEntry<T> {
  return {
    [TRANSFER_ENTRY]: true,
    kind: 'item',
    key: `item:${typeof item.key}:${item.key}`,
    depth,
    item,
  }
}

/** Wrap only a visible flat row; keep the virtual list's original item keys. */
export function ensureTransferEntry<T extends TransferItem>(
  entry: T | TransferEntry<T>
): TransferEntry<T> {
  return TRANSFER_ENTRY in entry ? entry : itemEntry(entry, 0)
}

/** The grouped view derives folders from the visible source and preserves item keys. */
export function transferEntries<T extends TransferItem>(
  items: readonly T[],
  groupBy: (item: T) => readonly string[],
  collapsed: ReadonlySet<string>
): TransferEntry<T>[] {
  const root: Group<T> = { key: '', label: '', groups: new Map(), items: [] }
  for (const item of items) {
    let group = root
    const path = groupBy(item).filter(label => label.length > 0)
    for (const label of path) {
      let child = group.groups.get(label)
      if (!child) {
        child = {
          key: `${group.key}/${JSON.stringify(label)}`,
          label,
          groups: new Map(),
          items: [],
        }
        group.groups.set(label, child)
      }
      group = child
    }
    group.items.push(item)
  }
  const entries: TransferEntry<T>[] = []
  function append(group: Group<T>, depth: number): void {
    for (const child of group.groups.values()) {
      const expanded = !collapsed.has(child.key)
      entries.push({
        [TRANSFER_ENTRY]: true,
        kind: 'group',
        key: child.key,
        depth,
        label: child.label,
        expanded,
      })
      if (expanded) append(child, depth + 1)
    }
    for (const item of group.items) entries.push(itemEntry(item, depth))
  }
  append(root, 0)
  return entries
}

/** Display and default search use the same formatted cell text. */
export function transferCellText<T extends TransferItem>(
  item: T,
  column: TransferColumn<T>
): string {
  const value = column.format ? column.format(item) : item[column.key]
  return typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
    ? String(value)
    : ''
}
