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

type StoredHistoryItem = (
  { menuKey: string; query?: never } | { menuKey: null; query: string }
) & {
  timestamp: number
}

/** 兼容旧版纯文本记录和旧版菜单快照，仅保留可重新验证的键。 */
function decodeHistoryItem(item: unknown): StoredHistoryItem[] {
  const record = typeof item === 'string' ? { query: item } : item
  if (!record || typeof record !== 'object') return []
  const { query, menuKey, menuItem, timestamp } = record as Record<
    string,
    unknown
  >
  const key =
    typeof menuKey === 'string'
      ? menuKey
      : (menuItem as { key?: unknown } | null)?.key
  const time = Number.isFinite(timestamp) ? (timestamp as number) : 0
  if (typeof key === 'string') return [{ menuKey: key, timestamp: time }]
  if (typeof query !== 'string' || !query.trim()) return []
  return [{ query: query.slice(0, 200), menuKey: null, timestamp: time }]
}

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
  const searchHistory = ref<StoredHistoryItem[]>([])
  const isComposing = ref(false)

  // ==================== 计算属性 ====================
  const isDark = computed(() => getOptions().isDark?.() ?? false)
  const menuIndex = computed(() => createMenuSearchIndex(getMenuItems()))

  const filteredMenuItems = computed(() => {
    if (!searchValue.value.trim()) return []
    return searchMenuIndex(menuIndex.value, searchValue.value)
  })

  const visibleHistory = computed(() => {
    const result: { item: HistoryItem; sourceIndex: number }[] = []
    for (const [sourceIndex, record] of searchHistory.value.entries()) {
      if (result.length >= displayHistoryLimit.value) break
      const { menuKey, query, timestamp } = record
      const menuItem =
        menuKey === null ? null : menuIndex.value.byKey.get(menuKey)
      const label = menuItem?.label ?? query
      if (menuItem === undefined || label === undefined) continue
      result.push({
        item: { query: label, menuItem, timestamp },
        sourceIndex,
      })
    }
    return result
  })
  const displayHistory = computed(() =>
    visibleHistory.value.map(({ item }) => item)
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
      localStorage.setItem(
        storageKey.value,
        JSON.stringify(searchHistory.value)
      )
    } catch {
      // Storage can be unavailable or full; search remains usable in memory.
    }
  }

  const addToHistory = (menuItem: SearchMenuItem) => {
    if (!menuItem.label.trim()) return
    const filtered = searchHistory.value.filter(
      item => item.menuKey !== menuItem.key
    )
    searchHistory.value = [
      { menuKey: menuItem.key, timestamp: Date.now() },
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
        searchHistory.value = parsed
          .flatMap(decodeHistoryItem)
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
    const entry = visibleHistory.value[index]
    if (!entry) return
    searchHistory.value.splice(entry.sourceIndex, 1)
    persistHistory()
    selectedIndex.value = Math.max(
      0,
      Math.min(selectedIndex.value, displayHistory.value.length - 1)
    )
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
      const menuItem = menuIndex.value.byKey.get(historyItem.menuItem.key)
      if (!menuItem) return
      getOptions().onSelect?.(menuItem.key, !!menuItem.children?.length)
      closeDialog()
    } else {
      searchValue.value = historyItem.query
      selectedIndex.value = 0
    }
  }

  const selectItem = (item: SearchMenuItem) => {
    const menuItem = menuIndex.value.byKey.get(item.key)
    if (!menuItem) return
    addToHistory(menuItem)
    getOptions().onSelect?.(menuItem.key, !!menuItem.children?.length)
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
