export type SearchIcon = string | object | ((...args: unknown[]) => unknown)

/** 全局搜索菜单项 */
export interface SearchMenuItem {
  key: string
  label: string
  icon?: SearchIcon
  children?: SearchMenuItem[]
  /** 额外检索词，不改变展示名称；适合简称、拼音或应用提供的领域别名。 */
  keywords?: readonly string[]
  /** 可读的所属目录；tokens 模式会将它纳入检索。 */
  breadcrumb?: string
}

/** 搜索历史记录项 */
export interface HistoryItem {
  query: string
  menuItem: {
    key: string
    label: string
    icon?: SearchIcon
    children?: SearchMenuItem[]
  } | null
  timestamp: number
}

/** useGlobalSearch 配置项 */
export interface GlobalSearchOptions {
  /** 已扁平化的可搜索菜单列表 */
  menuItems: () => SearchMenuItem[]
  /** 是否暗色主题 */
  isDark?: () => boolean
  /** 选中回调 (key, hasChildren) */
  onSelect?: (key: string, hasChildren: boolean) => void
  /** localStorage 存储键 */
  storageKey?: string
  /** 最大历史记录数 */
  maxHistory?: number
  /** 展示的历史记录数 */
  maxDisplayHistory?: number
  /** 保留旧的 literal 默认；tokens 开启归一化、多词与额外关键词匹配。 */
  matchMode?: 'literal' | 'tokens'
  /** 可选同步搜索策略；结果仍会限制在当前 menuItems 的有效键内。 */
  search?: (
    query: string,
    items: readonly SearchMenuItem[]
  ) => readonly SearchMenuItem[]
}
