import { computed, shallowRef, watch } from 'vue'
import { getItem, setItem } from '../../utils/storage'
import { isPickerValue } from './source'
import type { DataPickerProps, DataPickerValue } from './types'

interface HistoryEntry {
  value: DataPickerValue
  label: string
}

/** Scoped identifiers stay separate from live entity data and its eligibility. */
export function usePickerHistory<T extends object, F extends object>(
  props: Readonly<DataPickerProps<T, F>>
) {
  const recent = shallowRef<HistoryEntry[]>([])
  const favorites = shallowRef<HistoryEntry[]>([])
  const limit = computed(() => {
    const value = props.history?.maxItems
    return value !== undefined && Number.isFinite(value)
      ? Math.max(1, Math.min(50, Math.trunc(value)))
      : 10
  })
  const key = computed(() => {
    const options = props.history
    if (!props.source.resolve || !options?.storageKey || !options.scope) return
    try {
      return `c-data-picker:${JSON.stringify([
        options.storageKey,
        options.scope,
        props.fixedFilters ?? null,
        ...(props.scope === undefined ? [] : [props.scope]),
      ])}`
    } catch {
      return undefined
    }
  })
  const normalize = (input: unknown): HistoryEntry[] => {
    if (!Array.isArray(input)) return []
    const result = new Map<DataPickerValue, HistoryEntry>()
    for (const entry of input) {
      if (
        entry &&
        typeof entry === 'object' &&
        isPickerValue(entry.value) &&
        typeof entry.label === 'string' &&
        !result.has(entry.value)
      )
        result.set(entry.value, {
          value: entry.value,
          label: entry.label.slice(0, 200),
        })
      if (result.size === limit.value) break
    }
    return [...result.values()]
  }
  watch(
    [key, limit, () => props.history?.favorites],
    () => {
      const stored = key.value ? getItem<unknown>(key.value) : null
      const value = stored && typeof stored === 'object' ? stored : {}
      recent.value = normalize(Reflect.get(value, 'recent'))
      favorites.value = props.history?.favorites
        ? normalize(Reflect.get(value, 'favorites'))
        : []
    },
    { immediate: true }
  )
  const persist = () => {
    if (key.value)
      setItem(key.value, { recent: recent.value, favorites: favorites.value })
  }
  const remember = (entries: HistoryEntry[]) => {
    if (!key.value) return
    recent.value = normalize([...entries, ...recent.value])
    persist()
  }
  const toggleFavorite = (entry: HistoryEntry) => {
    if (!key.value || !props.history?.favorites) return
    const remaining = favorites.value.filter(item => item.value !== entry.value)
    favorites.value =
      remaining.length === favorites.value.length
        ? normalize([entry, ...remaining])
        : remaining
    persist()
  }
  const addFavorites = (entries: HistoryEntry[]) => {
    if (!key.value || !props.history?.favorites) return
    const next = normalize([...favorites.value, ...entries])
    const same =
      next.length === favorites.value.length &&
      next.every(
        (entry, index) =>
          entry.value === favorites.value[index].value &&
          entry.label === favorites.value[index].label
      )
    if (same) return
    favorites.value = next
    persist()
  }
  return {
    enabled: computed(() => !!key.value),
    recent,
    favorites,
    remember,
    toggleFavorite,
    addFavorites,
    canAddFavorite: computed(() => favorites.value.length < limit.value),
  }
}
