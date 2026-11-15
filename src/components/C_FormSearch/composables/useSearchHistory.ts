import { getItem, setItem } from '../../../utils/storage'
import {
  computed,
  toRaw,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
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
  const maximumItems = () => {
    const value = currentOptions().maxItems
    return value !== undefined && Number.isFinite(value)
      ? Math.max(1, Math.trunc(value))
      : 5
  }

  const findField = (prop: string) =>
    fields.value.find(item => item.prop === prop)

  // Defaults belong to the field declaration; restored/entered values belong to
  // one storage key. Metadata refreshes may reuse an owned history array.
  const defaults = new Map<
    string,
    {
      values: string[] | undefined
      current: string[] | undefined
    }
  >()
  const captureDefaults = () => {
    const keys = new Set<string>(fields.value.map(field => field.prop))
    for (const key of defaults.keys()) {
      if (!keys.has(key)) defaults.delete(key)
    }
    for (const field of fields.value) {
      const previous = defaults.get(field.prop)
      if (!previous || toRaw(previous.current) !== toRaw(field.hisList)) {
        defaults.set(field.prop, {
          values: field.hisList?.slice(),
          current: field.hisList,
        })
      }
    }
  }
  captureDefaults()
  watch(fields, captureDefaults, { flush: 'sync' })
  const setHistory = (
    field: SearchFormItem<T>,
    values: string[] | undefined
  ) => {
    const initial = defaults.get(field.prop)
    if (initial) initial.current = values
    field.hisList = values
  }
  let storageScope = currentOptions().storageKey
  const syncScope = () => {
    captureDefaults()
    const nextScope = currentOptions().storageKey
    if (nextScope === storageScope) return false
    storageScope = nextScope
    fields.value.forEach(field => {
      field.isFocus = false
      setHistory(field, defaults.get(field.prop)?.values?.slice())
    })
    return true
  }

  const persistToStorage = () => {
    const { storageKey } = currentOptions()
    if (!storageKey) return
    const stored = Object.fromEntries(
      fields.value
        // An empty list records an explicit clear, distinct from a new scope.
        .filter(field => field.hisList !== undefined)
        .map(field => [field.prop, field.hisList])
    )
    setItem(storageKey, stored)
  }

  const readStoredHistory = () => {
    const { storageKey } = currentOptions()
    if (!storageKey) return
    const stored = getItem<unknown>(storageKey)
    if (!stored || typeof stored !== 'object') return
    const entries = Array.isArray(stored)
      ? stored.flatMap(item =>
          item && typeof item === 'object' && typeof item.prop === 'string'
            ? [[item.prop, item.hisList] as const]
            : []
        )
      : Object.entries(stored)
    entries.forEach(([prop, values]) => {
      const field = findField(prop)
      if (!field || !Array.isArray(values)) return
      // 持久化历史可能来自旧版本或宿主写入，只恢复有限条有效文本。
      const history: string[] = []
      const limit = maximumItems()
      for (const value of values) {
        if (typeof value === 'string') history.push(value)
        if (history.length === limit) break
      }
      setHistory(field, history)
    })
  }

  const restoreFromStorage = () => {
    syncScope()
    readStoredHistory()
  }
  const ensureScope = () => {
    if (syncScope()) readStoredHistory()
  }
  watch(() => currentOptions().storageKey, restoreFromStorage, {
    flush: 'sync',
  })

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
    ensureScope()
    const field = findField(prop)
    if (field?.type !== 'input' || isSearchFieldLocked(field)) return
    ;(formParams.value as Record<string, unknown>)[prop] = value
    closeAllPanels()
  }

  const deleteHistoryItem = (prop: string, index: number) => {
    ensureScope()
    const field = findField(prop)
    if (!field?.hisList) return
    const history = [...field.hisList]
    history.splice(index, 1)
    setHistory(field, history)
    if (field.hisList.length === 0) field.isFocus = false
    persistToStorage()
  }

  const clearAllHistory = (prop: string) => {
    ensureScope()
    const field = findField(prop)
    if (!field?.hisList) return
    setHistory(field, [])
    field.isFocus = false
    persistToStorage()
  }

  const pushToHistoryList = (hisList: string[], newValue: string) => {
    const idx = hisList.indexOf(newValue)
    if (idx > -1) hisList.splice(idx, 1)
    hisList.unshift(newValue)
    const maxItems = maximumItems()
    if (hisList.length > maxItems) hisList.length = maxItems
    return hisList
  }

  const saveCurrentInputs = () => {
    ensureScope()
    if (!enabled.value) return
    Object.keys(formParams.value).forEach(key => {
      const val = (formParams.value as Record<string, unknown>)[key]
      if (val === undefined || val === null || val === '') return
      const field = findField(key)
      if (field?.type !== 'input' || !field.hisList) return
      const str = String(val).trim()
      if (str) setHistory(field, pushToHistoryList([...field.hisList], str))
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
