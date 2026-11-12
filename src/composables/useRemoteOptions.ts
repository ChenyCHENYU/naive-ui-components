import {
  computed,
  getCurrentInstance,
  onActivated,
  onDeactivated,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { useDataResource } from './useDataResource'
import { cloneData, isDataEqual } from '../utils/data'
import type { OptionSource, OptionValue } from '../core/optionSource'

const integer = (
  value: number | undefined,
  fallback: number,
  minimum: number
) =>
  Number.isFinite(value) && Number.isInteger(value) && value! >= minimum
    ? value!
    : fallback

/** Per-control state only: no global entity cache or application/backend assumptions. */
export function useRemoteOptions<
  T extends object,
  V extends OptionValue,
  F extends object,
>(options: {
  source: MaybeRefOrGetter<OptionSource<T, V, F> | undefined>
  values?: MaybeRefOrGetter<readonly V[]>
  disabled?: MaybeRefOrGetter<boolean | undefined>
}) {
  const source = computed(() => toValue(options.source))
  const values = computed(() => (options.values ? toValue(options.values) : []))
  const search = ref('')
  const active = ref(false)
  const ready = ref(false)
  const page = ref(1)
  const revision = ref(0)
  const sourceRevision = ref(0)
  const rows = shallowRef<T[]>([])
  const total = ref(0)
  const selected = shallowRef(new Map<V, T>())
  const minChars = computed(() => integer(source.value?.minChars, 0, 0))
  const pageSize = computed(() => integer(source.value?.pageSize, 20, 1))
  let timer: ReturnType<typeof setTimeout> | undefined
  let suspended = false
  let disposed = false
  const stopTimer = () => {
    clearTimeout(timer)
    timer = undefined
  }
  function schedule(immediate = false) {
    stopTimer()
    ready.value = false
    if (
      disposed ||
      suspended ||
      !active.value ||
      !source.value ||
      toValue(options.disabled) ||
      search.value.trim().length < minChars.value
    )
      return
    const delay = immediate ? 0 : integer(source.value.debounce, 250, 0)
    if (!delay) ready.value = true
    else
      timer = setTimeout(() => {
        timer = undefined
        ready.value = true
      }, delay)
  }
  function reset() {
    ready.value = false
    revision.value++
    page.value = 1
    rows.value = []
    total.value = 0
  }
  function setSearch(value: string) {
    if (search.value === value) return
    search.value = value
    reset()
    schedule()
  }
  function open() {
    if (active.value || disposed) return
    active.value = true
    page.value = 1
    schedule(true)
  }
  function close() {
    stopTimer()
    ready.value = false
    active.value = false
  }
  let previous = source.value
    ? { ...source.value, filters: cloneData(source.value.filters) }
    : undefined
  watch(
    source,
    next => {
      const identityKeys = [
        'request',
        'resolve',
        'value',
        'label',
        'pageSize',
        'minChars',
        'debounce',
      ] as const
      const changed =
        identityKeys.some(key => next?.[key] !== previous?.[key]) ||
        !isDataEqual(next?.filters, previous?.filters)
      if (!changed) return
      previous = next
        ? { ...next, filters: cloneData(next.filters) }
        : undefined
      sourceRevision.value++
      selected.value = new Map()
      reset()
      schedule(true)
    },
    { deep: true, flush: 'sync' }
  )
  watch(
    () => toValue(options.disabled),
    blocked => {
      if (blocked) close()
    },
    { flush: 'sync' }
  )

  function validateRows(input: readonly T[], current: OptionSource<T, V, F>) {
    if (!Array.isArray(input))
      throw new TypeError('Option source must return a row array')
    const seen = new Set<V>()
    for (const row of input) {
      const value = current.value(row)
      if (
        !['string', 'number', 'boolean'].includes(typeof value) ||
        (typeof value === 'number' && !Number.isFinite(value)) ||
        seen.has(value)
      )
        throw new TypeError(
          'Option source must return unique string, number or boolean values'
        )
      if (typeof current.label(row) !== 'string')
        throw new TypeError('Option labels must be strings')
      seen.add(value)
    }
  }
  const list = useDataResource({
    key: computed(() =>
      ready.value && active.value && source.value && !toValue(options.disabled)
        ? `${revision.value}:${page.value}`
        : null
    ),
    load: async ({ signal }) => {
      const current = source.value!
      const requestPage = page.value
      const previousRows = requestPage === 1 ? [] : [...rows.value]
      const result = await current.request({
        search: search.value.trim(),
        page: requestPage,
        pageSize: pageSize.value,
        signal,
        ...(current.filters === undefined
          ? {}
          : { filters: cloneData(current.filters) }),
      })
      validateRows(result.rows, current)
      if (
        !Number.isSafeInteger(result.total) ||
        result.total < result.rows.length ||
        result.rows.length > pageSize.value
      )
        throw new TypeError('Option source returned an invalid page')
      const merged = new Map(previousRows.map(row => [current.value(row), row]))
      result.rows.forEach(row => merged.set(current.value(row), row))
      return {
        rows: [...merged.values()],
        total: result.total,
        exhausted:
          result.rows.length === 0 ||
          requestPage * pageSize.value >= result.total,
      }
    },
    isEmpty: result => !result.rows.length,
  })
  const exhausted = ref(false)
  watch(
    list.data,
    result => {
      if (!result || !source.value) return
      rows.value = result.rows
      total.value = result.total
      exhausted.value = result.exhausted
      retain(values.value)
    },
    { flush: 'sync' }
  )
  const missing = computed(() =>
    values.value.filter(value => !selected.value.has(value))
  )
  const labels = useDataResource({
    key: computed(() =>
      source.value?.resolve && missing.value.length
        ? JSON.stringify([sourceRevision.value, missing.value])
        : null
    ),
    load: async ({ signal }) => {
      const current = source.value!
      const requested = [...missing.value]
      const result = await current.resolve!(requested, signal)
      validateRows(result, current)
      const allowed = new Set(requested)
      return new Map(
        result
          .filter(row => allowed.has(current.value(row)))
          .map(row => [current.value(row), row])
      )
    },
    isEmpty: result => !result.size,
  })
  function rowFor(value: V): T | undefined {
    return (
      rows.value.find(row => source.value?.value(row) === value) ??
      labels.data.value?.get(value) ??
      selected.value.get(value)
    )
  }
  function retain(next: readonly V[]) {
    const cache = new Map<V, T>()
    for (const value of next) {
      const row = rowFor(value)
      if (row) cache.set(value, row)
    }
    if (
      cache.size !== selected.value.size ||
      [...cache].some(([key, row]) => selected.value.get(key) !== row)
    )
      selected.value = cache
  }
  watch(values, next => retain(next), { deep: true, flush: 'sync' })
  const available = computed(() => {
    const current = source.value
    if (!current) return []
    const merged = new Map<V, T>()
    for (const value of values.value) {
      const row = rowFor(value)
      if (row) merged.set(value, row)
    }
    rows.value.forEach(row => merged.set(current.value(row), row))
    return [...merged.values()]
  })
  const loading = computed(() => list.loading.value || labels.loading.value)
  const error = computed(() => list.error.value ?? labels.error.value)
  const hasMore = computed(
    () =>
      rows.value.length > 0 &&
      !exhausted.value &&
      rows.value.length < total.value
  )
  function loadMore() {
    if (
      !active.value ||
      !ready.value ||
      list.loading.value ||
      list.error.value ||
      !hasMore.value
    )
      return
    page.value++
  }
  async function retry() {
    if (labels.error.value) await labels.reload()
    if (list.error.value && active.value) await list.reload()
  }
  onScopeDispose(() => {
    disposed = true
    stopTimer()
  })
  if (getCurrentInstance()) {
    onDeactivated(() => {
      suspended = true
      stopTimer()
      ready.value = false
    })
    onActivated(() => {
      if (suspended) {
        suspended = false
        schedule(true)
      }
    })
  }
  return {
    search,
    active,
    rows,
    available,
    minChars,
    pageSize,
    loading,
    error,
    hasMore,
    open,
    close,
    setSearch,
    loadMore,
    retry,
    rowFor,
    retain,
  }
}
