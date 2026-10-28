import { getItem, setItem } from '../../../utils/storage'
import { computed, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import type { SearchFormItem, SearchFormParams } from '../types'
import { isSearchFieldLocked } from '../fieldValue'

export interface SearchHistoryOptions {
  storageKey?: string
  maxItems?: number
}

/** 按控件保存有限条文本历史；固定与只读条件不能由历史选择绕过防写边界。 */
export function useSearchHistory<T extends object = SearchFormParams>(
  fields: Ref<SearchFormItem<T>[]>,
  formParams: Ref<T>,
  options: MaybeRefOrGetter<SearchHistoryOptions> = {}
) {
  const currentOptions = () => toValue(options)
  const enabled = computed(() => !!currentOptions().storageKey)

  const findField = (prop: string) =>
    fields.value.find(item => item.prop === prop)

  const persistToStorage = () => {
    const { storageKey } = currentOptions()
    if (!storageKey) return
    const stored = Object.fromEntries(
      fields.value
        .filter(field => field.hisList?.length)
        .map(field => [field.prop, field.hisList])
    )
    setItem(storageKey, stored)
  }

  const restoreFromStorage = () => {
    const { storageKey } = currentOptions()
    if (!storageKey) return
    const stored = getItem<SearchFormItem[] | Record<string, string[]>>(
      storageKey
    )
    if (!stored) return
    const entries = Array.isArray(stored)
      ? stored.map(item => [item.prop, item.hisList] as const)
      : Object.entries(stored)
    entries.forEach(([prop, values]) => {
      const field = findField(prop)
      if (field && Array.isArray(values)) field.hisList = [...values]
    })
  }

  const setAllFieldsFocus = (targetProp?: string) => {
    fields.value.forEach(item => {
      item.isFocus = !!(item.hisList && item.prop === targetProp)
    })
  }

  const handleFocus = (prop: string) => {
    const field = findField(prop)
    if (!field || isSearchFieldLocked(field)) return
    restoreFromStorage()
    setAllFieldsFocus(prop)
  }

  const closeAllPanels = () => setAllFieldsFocus()

  const selectHistoryItem = (value: string, prop: string) => {
    const field = findField(prop)
    if (field?.type !== 'input' || isSearchFieldLocked(field)) return
    ;(formParams.value as Record<string, unknown>)[prop] = value
    closeAllPanels()
  }

  const deleteHistoryItem = (prop: string, index: number) => {
    const field = findField(prop)
    if (!field?.hisList) return
    field.hisList.splice(index, 1)
    if (field.hisList.length === 0) field.isFocus = false
    persistToStorage()
  }

  const clearAllHistory = (prop: string) => {
    const field = findField(prop)
    if (!field?.hisList) return
    field.hisList = []
    field.isFocus = false
    persistToStorage()
  }

  const pushToHistoryList = (hisList: string[], newValue: string) => {
    const idx = hisList.indexOf(newValue)
    if (idx > -1) hisList.splice(idx, 1)
    hisList.unshift(newValue)
    const maxItems = Math.max(1, currentOptions().maxItems ?? 5)
    if (hisList.length > maxItems) hisList.length = maxItems
    return hisList
  }

  const saveCurrentInputs = () => {
    if (!enabled.value) return
    Object.keys(formParams.value).forEach(key => {
      const val = (formParams.value as Record<string, unknown>)[key]
      if (val === undefined || val === null || val === '') return
      const field = findField(key)
      if (field?.type !== 'input' || !field.hisList) return
      const str = String(val).trim()
      if (str) pushToHistoryList(field.hisList, str)
    })
    closeAllPanels()
    persistToStorage()
  }

  return {
    enabled,
    handleFocus,
    closeAllPanels,
    selectHistoryItem,
    deleteHistoryItem,
    clearAllHistory,
    saveCurrentInputs,
    restoreFromStorage,
  }
}
