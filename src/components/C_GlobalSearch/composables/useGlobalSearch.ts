import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { SearchMenuItem, HistoryItem, GlobalSearchOptions } from '../types'

/**
 * 全局搜索逻辑 — 管理菜单搜索、历史记录、键盘导航
 *
 * 已解耦：不依赖任何项目级 store / router，
 * 所有外部数据通过 options 注入。
 */
export function useGlobalSearch(options: GlobalSearchOptions) {
  const {
    menuItems: getMenuItems,
    isDark: getIsDark,
    onSelect,
    storageKey = 'robot-search-history',
    maxHistory = 10,
    maxDisplayHistory = 5,
  } = options
  const historyLimit = Math.min(100, Math.max(0, Math.trunc(maxHistory)))
  const displayHistoryLimit = Math.min(
    historyLimit,
    Math.max(0, Math.trunc(maxDisplayHistory))
  )

  // ==================== 响应式状态 ====================
  const showDialog = ref(false)
  const searchValue = ref('')
  const selectedIndex = ref(0)
  const searchInputRef = ref<HTMLInputElement>()
  const searchHistory = ref<HistoryItem[]>([])

  // ==================== 计算属性 ====================
  const isDark = computed(() => getIsDark?.() ?? false)

  const filteredMenuItems = computed(() => {
    if (!searchValue.value.trim()) return []
    const query = searchValue.value.toLowerCase()
    const items = getMenuItems()
    return items.filter(
      item =>
        item.label.toLowerCase().includes(query) ||
        formatMenuPath(item.key).toLowerCase().includes(query)
    )
  })

  const displayHistory = computed(() =>
    searchHistory.value.slice(0, displayHistoryLimit)
  )
  const hasResults = computed(() => filteredMenuItems.value.length > 0)
  const hasContent = computed(
    () => hasResults.value || displayHistory.value.length > 0
  )

  // ==================== 工具函数 ====================
  const getItemClasses = (index: number, isHistory: boolean) => [
    'robot-result-item',
    isHistory && 'robot-history-item',
    { 'robot-result-item-selected': selectedIndex.value === index },
  ]

  const highlightMatch = (
    text: string,
    search: string
  ): Array<{ text: string; matched: boolean }> => {
    if (!search) return [{ text, matched: false }]
    const regex = new RegExp(
      `(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    )
    return text
      .split(regex)
      .filter(Boolean)
      .map(part => ({
        text: part,
        matched: part.toLocaleLowerCase() === search.toLocaleLowerCase(),
      }))
  }

  const formatMenuPath = (key: string): string =>
    key.replace(/^\//, '').replace(/\//g, ' > ') || '首页'

  // ==================== 搜索历史管理 ====================
  const persistHistory = () => {
    if (typeof localStorage === 'undefined') return
    try {
      const serializableHistory = searchHistory.value.map(item => ({
        query: item.query,
        menuKey: item.menuItem?.key ?? null,
        timestamp: item.timestamp,
      }))
      localStorage.setItem(storageKey, JSON.stringify(serializableHistory))
    } catch {
      // Storage can be unavailable or full; search remains usable in memory.
    }
  }

  const addToHistory = (menuItem: SearchMenuItem) => {
    if (!menuItem.label.trim()) return
    const query = menuItem.label
    const filtered = searchHistory.value.filter(
      (item: HistoryItem) =>
        !(item.query === query && item.menuItem?.key === menuItem.key)
    )
    searchHistory.value = [
      { query, menuItem, timestamp: Date.now() },
      ...filtered,
    ].slice(0, historyLimit)
    persistHistory()
  }

  const loadHistory = () => {
    if (typeof localStorage === 'undefined') return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (!Array.isArray(parsed)) return
        const menuMap = new Map(getMenuItems().map(item => [item.key, item]))
        searchHistory.value = parsed
          // eslint-disable-next-line complexity -- 同时兼容并严格校验两版持久化记录。
          .flatMap(item => {
            if (typeof item === 'string') {
              return [
                { query: item.slice(0, 200), menuItem: null, timestamp: 0 },
              ]
            }
            if (!item || typeof item !== 'object') return []
            const record = item as Record<string, unknown>
            const query = typeof record.query === 'string' ? record.query : ''
            if (!query.trim()) return []
            const legacyMenu =
              record.menuItem && typeof record.menuItem === 'object'
                ? (record.menuItem as Record<string, unknown>)
                : null
            const menuKey =
              typeof record.menuKey === 'string'
                ? record.menuKey
                : typeof legacyMenu?.key === 'string'
                  ? legacyMenu.key
                  : ''
            return [
              {
                query: query.slice(0, 200),
                menuItem: menuMap.get(menuKey) ?? null,
                timestamp:
                  typeof record.timestamp === 'number' &&
                  Number.isFinite(record.timestamp)
                    ? record.timestamp
                    : 0,
              },
            ]
          })
          .slice(0, historyLimit)
      }
    } catch {
      searchHistory.value = []
    }
  }

  const clearHistory = () => {
    searchHistory.value = []
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Keep the in-memory state cleared when storage is unavailable.
    }
  }

  const removeHistoryItem = (index: number) => {
    searchHistory.value.splice(index, 1)
    persistHistory()
    if (selectedIndex.value >= searchHistory.value.length) {
      selectedIndex.value = Math.max(0, searchHistory.value.length - 1)
    }
  }

  // ==================== 对话框控制 ====================
  const openDialog = async () => {
    showDialog.value = true
    searchValue.value = ''
    selectedIndex.value = 0
    await nextTick()
    searchInputRef.value?.focus()
  }

  const closeDialog = () => {
    showDialog.value = false
    searchValue.value = ''
    selectedIndex.value = 0
  }

  // ==================== 选择项目 ====================
  const selectHistoryItem = (historyItem: HistoryItem) => {
    if (historyItem.menuItem) {
      const hasChildren = !!historyItem.menuItem.children?.length
      onSelect?.(historyItem.menuItem.key, hasChildren)
      closeDialog()
    } else {
      searchValue.value = historyItem.query
      selectedIndex.value = 0
    }
  }

  const selectItem = (item: SearchMenuItem) => {
    addToHistory(item)
    const hasChildren = !!item.children?.length
    onSelect?.(item.key, hasChildren)
    closeDialog()
  }

  // ==================== 键盘导航 ====================
  const handleEnter = () => {
    const isHistoryMode =
      !searchValue.value.trim() && displayHistory.value.length > 0
    const isSearchMode =
      searchValue.value.trim() && filteredMenuItems.value.length > 0

    if (isHistoryMode) {
      const historyItem = displayHistory.value[selectedIndex.value]
      if (historyItem) selectHistoryItem(historyItem)
    } else if (isSearchMode) {
      const item = filteredMenuItems.value[selectedIndex.value]
      if (item) selectItem(item)
    }
  }

  const focusNext = () => {
    const maxIndex = !searchValue.value.trim()
      ? displayHistory.value.length - 1
      : filteredMenuItems.value.length - 1
    selectedIndex.value = Math.min(selectedIndex.value + 1, maxIndex)
  }

  const focusPrev = () => {
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  }

  // ==================== 监听器和生命周期 ====================
  watch(searchValue, () => {
    selectedIndex.value = 0
  })

  onMounted(() => {
    loadHistory()
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        openDialog()
      }
    }
    document.addEventListener('keydown', handleKeydown)
    onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
  })

  return {
    showDialog,
    searchValue,
    selectedIndex,
    searchInputRef,
    isDark,
    filteredMenuItems,
    displayHistory,
    hasResults,
    hasContent,
    getItemClasses,
    highlightMatch,
    formatMenuPath,
    clearHistory,
    removeHistoryItem,
    openDialog,
    closeDialog,
    selectHistoryItem,
    selectItem,
    handleEnter,
    focusNext,
    focusPrev,
  }
}
