import {
  computed,
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
} from 'vue'
import type { TableConfig } from './useTableConfig'
import type { TableColumn, TableRowKey } from '../types'
import { cloneData } from '../../../utils/data'
import { notifyObserver } from '../../../core/observer'

export interface TableQueryContext<Q> {
  page: number
  pageSize: number
  query: Readonly<Q>
  signal: AbortSignal
}

export interface TableQueryResult<T extends object> {
  data: readonly T[]
  total: number
}

export interface UseTableQueryOptions<T extends object, Q extends object> {
  request: (context: TableQueryContext<Q>) => Promise<TableQueryResult<T>>
  initialQuery: Q
  columns?: MaybeRefOrGetter<TableColumn<T>[] | undefined>
  config?: MaybeRefOrGetter<TableConfig<T> | undefined>
  rowKey?: TableRowKey<T>
  initialPage?: number
  pageSize?: number
  immediate?: boolean
  onError?: (error: unknown) => void
  onSuccess?: (result: TableQueryResult<T>) => void
}

const positiveInteger = (
  value: number | undefined,
  fallback: number
): number =>
  Number.isFinite(value) ? Math.max(1, Math.floor(value!)) : fallback

/**
 * Remote table controller with latest-request-wins cancellation and ready-to-bind props.
 */
export function useTableQuery<
  T extends object,
  Q extends object = Record<string, unknown>,
>(options: UseTableQueryOptions<T, Q>) {
  const data = shallowRef<T[]>([])
  const loading = ref(false)
  const error = shallowRef<unknown>()
  const total = ref(0)
  const initialQuery = cloneData(options.initialQuery)
  const page = ref(positiveInteger(options.initialPage, 1))
  const pageSize = ref(positiveInteger(options.pageSize, 20))
  const query = shallowRef<Q>(cloneData(initialQuery))
  let requestVersion = 0
  let controller: AbortController | null = null
  let disposed = false
  const ownsRequest = (version: number, request: AbortController): boolean =>
    !disposed &&
    version === requestVersion &&
    controller === request &&
    !request.signal.aborted

  // eslint-disable-next-line complexity -- Request version, abort and validation guards form one atomic transition.
  const execute = async (): Promise<boolean> => {
    if (disposed) return false
    const version = ++requestVersion
    const previous = controller
    const request = new AbortController()
    controller = request
    try {
      previous?.abort()
      // abort 与公开状态的同步观察器均可重入；只允许当前请求继续发布状态。
      if (!ownsRequest(version, request)) return false
      loading.value = true
      if (!ownsRequest(version, request)) return false
      error.value = undefined
      if (!ownsRequest(version, request)) return false
      const result = await options.request({
        page: page.value,
        pageSize: pageSize.value,
        query: cloneData(query.value),
        signal: request.signal,
      })
      if (!ownsRequest(version, request)) return false
      if (!Array.isArray(result.data) || !Number.isFinite(result.total)) {
        throw new TypeError(
          '[C_Table] request 必须返回 { data: T[], total: number }'
        )
      }
      data.value = cloneData([...result.data])
      if (!ownsRequest(version, request)) return false
      total.value = Math.max(0, Math.floor(result.total))
      if (!ownsRequest(version, request)) return false
      notifyObserver(() =>
        options.onSuccess?.({ data: data.value, total: total.value })
      )
      return ownsRequest(version, request)
    } catch (cause) {
      if (!ownsRequest(version, request)) return false
      error.value = cause
      if (ownsRequest(version, request))
        notifyObserver(() => options.onError?.(cause))
      return false
    } finally {
      if (version === requestVersion && controller === request) {
        controller = null
        loading.value = false
      }
    }
  }

  const setQuery = async (
    next: Partial<Q> | ((current: Readonly<Q>) => Q),
    reload = true
  ): Promise<boolean> => {
    if (disposed) return false
    query.value = cloneData(
      typeof next === 'function'
        ? next(query.value)
        : ({ ...query.value, ...next } as Q)
    )
    page.value = 1
    return reload ? execute() : true
  }

  const handlePaginationChange = async (
    nextPage: number,
    nextPageSize: number
  ): Promise<boolean> => {
    if (disposed) return false
    page.value = positiveInteger(nextPage, page.value)
    pageSize.value = positiveInteger(nextPageSize, pageSize.value)
    return execute()
  }

  const resetQuery = async (reload = true): Promise<boolean> => {
    if (disposed) return false
    query.value = cloneData(initialQuery)
    page.value = 1
    return reload ? execute() : true
  }

  const tableProps = computed(() => {
    const base = toValue(options.config) ?? {}
    const basePagination =
      typeof base.pagination === 'object' ? base.pagination : {}
    return {
      data: data.value,
      loading: loading.value,
      columns: toValue(options.columns),
      rowKey: options.rowKey ?? ('id' as TableRowKey<T>),
      config: {
        ...base,
        pagination: {
          ...basePagination,
          enabled: true,
          remote: true,
          page: page.value,
          pageSize: pageSize.value,
          total: total.value,
        },
      } satisfies TableConfig<T>,
    }
  })

  const bindings = computed(() => ({
    ...tableProps.value,
    onPaginationChange: handlePaginationChange,
  }))

  const cancel = () => {
    const version = ++requestVersion
    const previous = controller
    controller = null
    previous?.abort()
    if (version === requestVersion) loading.value = false
  }

  if (options.immediate !== false) onMounted(() => void execute())
  onScopeDispose(() => {
    disposed = true
    cancel()
  })

  return {
    data,
    loading,
    error,
    total,
    page,
    pageSize,
    query,
    tableProps,
    execute,
    reload: execute,
    setQuery,
    resetQuery,
    handlePaginationChange,
    bindings,
    cancel,
  }
}
