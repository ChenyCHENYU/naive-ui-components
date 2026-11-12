import type { SearchMenuItem } from '../types'

export const formatSearchMenuPath = (key: string): string =>
  key.replace(/^\//, '').replace(/\//g, ' > ') || '首页'

export interface MenuSearchIndex {
  entries: {
    item: SearchMenuItem
    label: string
    path: string
    text: string
    normalizedLabel: string
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
    const label = item.label.toLowerCase()
    return {
      item,
      label,
      path: path.toLowerCase(),
      normalizedLabel: normalizeSearchText(label),
      text: normalizeSearchText(
        [label, path, item.breadcrumb ?? '', ...(item.keywords ?? [])].join(' ')
      ),
    }
  })
  return { entries, paths, byKey }
}

/** 归一化只用于显式 tokens 模式，不改变原 literal 匹配规则。 */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ')
}

/** 默认保留旧子串语义；tokens 额外匹配目录和关键词，并稳定排序。 */
export function searchMenuIndex(
  index: MenuSearchIndex,
  search: string,
  mode: 'literal' | 'tokens' = 'literal'
) {
  if (!search.trim()) return []
  if (mode === 'tokens') {
    const query = normalizeSearchText(search)
    const terms = query.split(' ')
    return index.entries
      .filter(entry => terms.every(term => entry.text.includes(term)))
      .map(entry => ({
        item: entry.item,
        rank:
          entry.normalizedLabel === query
            ? 0
            : entry.normalizedLabel.startsWith(query)
              ? 1
              : entry.normalizedLabel.includes(query)
                ? 2
                : 3,
      }))
      .sort((left, right) => left.rank - right.rank)
      .map(entry => entry.item)
  }
  const query = search.toLowerCase()
  return index.entries
    .filter(entry => entry.label.includes(query) || entry.path.includes(query))
    .map(entry => entry.item)
}
