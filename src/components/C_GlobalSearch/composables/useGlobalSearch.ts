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
    searchHistory.value.slice(0, maxDisplayHistory)
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

  const highlightMatch = (text: string, search: string): string => {
    if (!search) return text
    const regex = new RegExp(
      `(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
      'gi'
    )
    return text.replace(regex, '<mark class="robot-highlight">$1</mark>')
  }

  const formatMenuPath = (key: string): string =>
    key.replace(/^\//, '').replace(/\//g, ' > ') || '首页'

  // ==================== 搜索历史管理 ====================
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
    ].slice(0, maxHistory)
    localStorage.setItem(storageKey, JSON.stringify(searchHistory.value))
  }

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        searchHistory.value = parsed.map((item: any) =>
          typeof item === 'string'
            ? { query: item, menuItem: null, timestamp: 0 }
            : item
        )
      }
    } catch (error) {
      console.error('加载搜索历史失败:', error)
    }
  }

  const clearHistory = () => {
    searchHistory.value = []
    localStorage.removeItem(storageKey)
  }

  const removeHistoryItem = (index: number) => {
    searchHistory.value.splice(index, 1)
    localStorage.setItem(storageKey, JSON.stringify(searchHistory.value))
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
