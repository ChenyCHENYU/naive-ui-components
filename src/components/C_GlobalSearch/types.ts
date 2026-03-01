/** 全局搜索菜单项 */
export interface SearchMenuItem {
  key: string
  label: string
  icon?: any
  children?: any[]
}

/** 搜索历史记录项 */
export interface HistoryItem {
  query: string
  menuItem: {
    key: string
    label: string
    icon?: any
    children?: any[]
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
}
