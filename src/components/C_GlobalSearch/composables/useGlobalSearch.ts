import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'
import type { SearchMenuItem, HistoryItem, GlobalSearchOptions } from '../types'
import {
  createMenuSearchIndex,
  formatSearchMenuPath,
  searchMenuIndex,
} from './searchIndex'

/**
 * 全局搜索逻辑 — 管理菜单搜索、历史记录、键盘导航
 *
 * 已解耦：不依赖任何项目级 store / router，
 * 所有外部数据通过 options 注入。
 */
export function useGlobalSearch(
  options: MaybeRefOrGetter<GlobalSearchOptions>
) {
  const getOptions = () => toValue(options)
  const getMenuItems = () => getOptions().menuItems()
  const storageKey = computed(
    () => getOptions().storageKey ?? 'robot-search-history'
  )
  const historyLimit = computed(() =>
    Math.min(100, Math.max(0, Math.trunc(getOptions().maxHistory ?? 10)))
  )
  const displayHistoryLimit = computed(() =>
    Math.min(
      historyLimit.value,
      Math.max(0, Math.trunc(getOptions().maxDisplayHistory ?? 5))
    )
  )

  // ==================== 响应式状态 ====================
  const showDialog = ref(false)
  const searchValue = ref('')
  const selectedIndex = ref(0)
  const searchInputRef = ref<HTMLInputElement>()
  const searchHistory = ref<HistoryItem[]>([])
  const isComposing = ref(false)

  // ==================== 计算属性 ====================
  const isDark = computed(() => getOptions().isDark?.() ?? false)
  const menuIndex = computed(() => createMenuSearchIndex(getMenuItems()))

  const filteredMenuItems = computed(() => {
    if (!searchValue.value.trim()) return []
    return searchMenuIndex(menuIndex.value, searchValue.value)
  })

  const displayHistory = computed(() =>
    searchHistory.value.slice(0, displayHistoryLimit.value)
  )
  const hasResults = computed(() => filteredMenuItems.value.length > 0)
  const hasContent = computed(
    () => Boolean(searchValue.value.trim()) || displayHistory.value.length > 0
  )
  const activeItemCount = computed(() =>
    searchValue.value.trim()
      ? filteredMenuItems.value.length
      : displayHistory.value.length
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
    menuIndex.value.paths.get(key) ?? formatSearchMenuPath(key)

  // ==================== 搜索历史管理 ====================
  const persistHistory = () => {
    if (typeof localStorage === 'undefined') return
    try {
      const serializableHistory = searchHistory.value.map(item => ({
        query: item.query,
        menuKey: item.menuItem?.key ?? null,
        timestamp: item.timestamp,
      }))
      localStorage.setItem(
        storageKey.value,
        JSON.stringify(serializableHistory)
      )
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
    ].slice(0, historyLimit.value)
    persistHistory()
  }

  const loadHistory = () => {
    searchHistory.value = []
    if (typeof localStorage === 'undefined') return
    try {
      const saved = localStorage.getItem(storageKey.value)
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
          .slice(0, historyLimit.value)
      }
    } catch {
      searchHistory.value = []
    }
  }

  const clearHistory = () => {
    searchHistory.value = []
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(storageKey.value)
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
    isComposing.value = false
    await nextTick()
    searchInputRef.value?.focus()
  }

  const closeDialog = () => {
    showDialog.value = false
    searchValue.value = ''
    selectedIndex.value = 0
    isComposing.value = false
  }

  // ==================== 选择项目 ====================
  const selectHistoryItem = (historyItem: HistoryItem) => {
    if (historyItem.menuItem) {
      const hasChildren = !!historyItem.menuItem.children?.length
      getOptions().onSelect?.(historyItem.menuItem.key, hasChildren)
      closeDialog()
    } else {
      searchValue.value = historyItem.query
      selectedIndex.value = 0
    }
  }

  const selectItem = (item: SearchMenuItem) => {
    addToHistory(item)
    const hasChildren = !!item.children?.length
    getOptions().onSelect?.(item.key, hasChildren)
    closeDialog()
  }

  // ==================== 键盘导航 ====================
  const ignoresNavigation = (event?: KeyboardEvent) =>
    isComposing.value ||
    Boolean(
      event &&
      (event.defaultPrevented ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey)
    )

  const handleEnter = (event?: KeyboardEvent) => {
    if (ignoresNavigation(event)) return
    selectedIndex.value = Math.max(
      0,
      Math.min(selectedIndex.value, activeItemCount.value - 1)
    )
    const isHistoryMode =
      !searchValue.value.trim() && displayHistory.value.length > 0
    const isSearchMode =
      searchValue.value.trim() && filteredMenuItems.value.length > 0

    if (isHistoryMode) {
      const historyItem = displayHistory.value[selectedIndex.value]
      if (historyItem) {
        event?.preventDefault()
        selectHistoryItem(historyItem)
      }
    } else if (isSearchMode) {
      const item = filteredMenuItems.value[selectedIndex.value]
      if (item) {
        event?.preventDefault()
        selectItem(item)
      }
    }
  }

  const focusNext = (event?: KeyboardEvent) => {
    if (ignoresNavigation(event)) return
    event?.preventDefault()
    selectedIndex.value = Math.max(
      0,
      Math.min(selectedIndex.value + 1, activeItemCount.value - 1)
    )
  }

  const focusPrev = (event?: KeyboardEvent) => {
    if (ignoresNavigation(event)) return
    event?.preventDefault()
    selectedIndex.value = Math.max(
      0,
      Math.min(selectedIndex.value - 1, activeItemCount.value - 1)
    )
  }

  const handleDialogKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || ignoresNavigation(event)) return
    event.preventDefault()
    closeDialog()
  }
  const handleInputKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') focusNext(event)
    else if (event.key === 'ArrowUp') focusPrev(event)
    else if (event.key === 'Enter') handleEnter(event)
    else handleDialogKeydown(event)
  }

  // ==================== 监听器和生命周期 ====================
  watch(searchValue, () => {
    selectedIndex.value = 0
  })
  watch(activeItemCount, count => {
    selectedIndex.value = Math.max(0, Math.min(selectedIndex.value, count - 1))
  })
  watch(storageKey, loadHistory)

  const handleKeydown = (e: KeyboardEvent) => {
    if (
      e.defaultPrevented ||
      e.isComposing ||
      e.keyCode === 229 ||
      isComposing.value
    )
      return
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      void openDialog()
    }
  }

  onMounted(() => {
    loadHistory()
    document.addEventListener('keydown', handleKeydown)
  })
  onUnmounted(() => document.removeEventListener('keydown', handleKeydown))

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
    handleInputKeydown,
    handleDialogKeydown,
    handleCompositionStart: () => {
      isComposing.value = true
    },
    handleCompositionEnd: () => {
      isComposing.value = false
    },
  }
}
