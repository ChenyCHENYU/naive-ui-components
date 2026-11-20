import {
  computed,
  shallowReactive,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { cloneData } from '../utils/data'
import { useDataResource } from './useDataResource'

type TabKey = string | number

export interface TabbedQueryContext<K extends TabKey, Q extends object> {
  tab: K
  query: Readonly<Q>
  page: number
  pageSize: number
  signal: AbortSignal
}

export interface TabbedQueryResult<T extends object> {
  data: readonly T[]
  total: number
}

export interface TabbedQueryOptions<
  K extends TabKey,
  Q extends object,
  T extends object,
> {
  activeTab: MaybeRefOrGetter<K | null | undefined>
  initialQuery: Q
  request: (context: TabbedQueryContext<K, Q>) => Promise<TabbedQueryResult<T>>
  pageSize?: number
}

type QueryIntent<K extends TabKey, Q extends object> = Omit<
  TabbedQueryContext<K, Q>,
  'signal'
>

function positiveInteger(value: number | undefined, fallback: number) {
  if (value === undefined || !Number.isFinite(value) || value < 1)
    return fallback
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value))
}

/** Share submitted criteria while keeping each tab's pagination and only loading the active tab. */
export function useTabbedQuery<
  K extends TabKey,
  Q extends object,
  T extends object,
>(options: TabbedQueryOptions<K, Q, T>) {
  const defaultPage = {
    page: 1,
    pageSize: positiveInteger(options.pageSize, 20),
    total: 0,
  }
  const empty: T[] = []
  const pages = shallowReactive(new Map<K, typeof defaultPage>())
  const active = computed(() => toValue(options.activeTab))
  const pagination = computed(() => {
    const key = active.value
    return key == null ? defaultPage : (pages.get(key) ?? defaultPage)
  })

  let query = cloneData(options.initialQuery)
  // 显式发起请求，使 setQuery 可返回同一次请求的结果给搜索表单。
  let requestKey: QueryIntent<K, Q> | undefined
  const intent = shallowRef<QueryIntent<K, Q>>()
  const resource = useDataResource({
    key: () => requestKey,
    immediate: false,
    async load({ key, signal }) {
      const result = await options.request({
        ...key,
        query: cloneData(key.query),
        signal,
      })
      if (
        !Array.isArray(result?.data) ||
        !Number.isSafeInteger(result.total) ||
        result.total < 0
      )
        throw new TypeError(
          'Tabbed query must return { data, total } with a non-negative integer total'
        )
      return { key, data: [...result.data], total: result.total }
    },
    isEmpty: result => !result.data.length,
  })
  const visible = computed(() => {
    const result = resource.data.value
    return result?.key === intent.value && result?.key.tab === active.value
      ? result
      : undefined
  })

  function execute() {
    const tab = active.value
    const { page, pageSize } = pagination.value
    const next = tab == null ? undefined : { tab, query, page, pageSize }
    requestKey = next
    intent.value = next
    return intent.value === next ? resource.reload() : Promise.resolve(false)
  }

  watch(
    visible,
    result => {
      if (!result) return
      const { tab, page, pageSize } = result.key
      const corrected = Math.min(
        page,
        Math.max(1, Math.ceil(result.total / pageSize))
      )
      pages.set(tab, { page: corrected, pageSize, total: result.total })
      if (corrected !== page && intent.value === result.key) void execute()
    },
    { flush: 'sync' }
  )
  watch(
    active,
    () => {
      void execute()
    },
    { immediate: true, flush: 'sync' }
  )

  function setQuery(next: Q) {
    query = cloneData(next)
    for (const [tab, state] of pages) {
      pages.set(tab, { page: 1, pageSize: state.pageSize, total: 0 })
    }
    return execute()
  }

  function setPage(nextPage: number, nextSize?: number) {
    const tab = active.value
    if (tab == null) return Promise.resolve(false)
    const current = pagination.value
    const pageSize = positiveInteger(nextSize, current.pageSize)
    const page =
      pageSize === current.pageSize
        ? positiveInteger(nextPage, current.page)
        : 1
    if (page === current.page && pageSize === current.pageSize)
      return Promise.resolve(false)
    pages.set(tab, { page, pageSize, total: current.total })
    return execute()
  }

  return {
    data: computed(() => visible.value?.data ?? empty),
    appliedQuery: computed(() =>
      visible.value ? cloneData(visible.value.key.query) : undefined
    ),
    pagination,
    loading: resource.loading,
    error: resource.error,
    reload: resource.reload,
    setQuery,
    setPage,
  }
}
