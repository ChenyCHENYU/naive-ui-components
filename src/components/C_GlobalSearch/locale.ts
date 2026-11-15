import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'globalSearch.trigger': '搜索',
  'globalSearch.dialog': '全局搜索',
  'globalSearch.input': '搜索菜单',
  'globalSearch.close': '关闭搜索',
  'globalSearch.recent': '最近搜索',
  'globalSearch.clearHistory': '清空历史',
  'globalSearch.removeHistory': '删除此记录',
  'globalSearch.noResults': '未找到 "{query}" 相关内容',
  'globalSearch.select': '选择',
  'globalSearch.navigate': '导航',
  'globalSearch.closeHint': '关闭',
  'globalSearch.resultCount': '共 {count} 项结果',
  'globalSearch.historyCount': '{count} 条历史记录',
  'globalSearch.placeholder': '搜索导航菜单...',
  'globalSearch.empty': '输入关键词搜索菜单',
  'globalSearch.group': '菜单导航',
  'globalSearch.home': '首页',
})
const ENGLISH = Object.freeze({
  'globalSearch.trigger': 'Search',
  'globalSearch.dialog': 'Global search',
  'globalSearch.input': 'Search menus',
  'globalSearch.close': 'Close search',
  'globalSearch.recent': 'Recent searches',
  'globalSearch.clearHistory': 'Clear history',
  'globalSearch.removeHistory': 'Remove this record',
  'globalSearch.noResults': 'No results for "{query}"',
  'globalSearch.select': 'Select',
  'globalSearch.navigate': 'Navigate',
  'globalSearch.closeHint': 'Close',
  'globalSearch.resultCount': '{count} results',
  'globalSearch.historyCount': '{count} recent searches',
  'globalSearch.placeholder': 'Search navigation menus...',
  'globalSearch.empty': 'Type to search menus',
  'globalSearch.group': 'Navigation menus',
  'globalSearch.home': 'Home',
})

export const useGlobalSearchLocale = () =>
  useScopedComponentLocale(CHINESE, ENGLISH)
