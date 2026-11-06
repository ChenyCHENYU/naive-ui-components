import type { SearchMenuItem } from '../types'

export const formatSearchMenuPath = (key: string): string =>
  key.replace(/^\//, '').replace(/\//g, ' > ') || '首页'

export interface MenuSearchIndex {
  entries: {
    item: SearchMenuItem
    label: string
    path: string
  }[]
  paths: Map<string, string>
  byKey: Map<string, SearchMenuItem>
}

/** Cache derived text while retaining the source menu objects and their order. */
export function createMenuSearchIndex(
  items: SearchMenuItem[]
): MenuSearchIndex {
  const paths = new Map<string, string>()
  const byKey = new Map<string, SearchMenuItem>()
  const entries = items.map(item => {
    const { key } = item
    const path = formatSearchMenuPath(key)
    paths.set(key, path)
    byKey.set(key, item)
    return { item, label: item.label.toLowerCase(), path: path.toLowerCase() }
  })
  return { entries, paths, byKey }
}

/** Search labels and displayed paths with the existing literal substring rules. */
export function searchMenuIndex(index: MenuSearchIndex, search: string) {
  if (!search.trim()) return []
  const query = search.toLowerCase()
  return index.entries
    .filter(entry => entry.label.includes(query) || entry.path.includes(query))
    .map(entry => entry.item)
}
