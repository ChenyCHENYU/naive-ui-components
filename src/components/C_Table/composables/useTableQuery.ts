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

  // eslint-disable-next-line complexity -- Request version, abort and validation guards form one atomic transition.
  const execute = async (): Promise<boolean> => {
    const version = ++requestVersion
    controller?.abort()
    controller = new AbortController()
    loading.value = true
    error.value = undefined
    try {
      const result = await options.request({
        page: page.value,
        pageSize: pageSize.value,
        query: cloneData(query.value),
        signal: controller.signal,
      })
      if (version !== requestVersion || controller.signal.aborted) return false
      if (!Array.isArray(result.data) || !Number.isFinite(result.total)) {
        throw new TypeError(
          '[C_Table] request 必须返回 { data: T[], total: number }'
        )
      }
      data.value = cloneData([...result.data])
      total.value = Math.max(0, Math.floor(result.total))
      options.onSuccess?.({ data: data.value, total: total.value })
      return true
    } catch (cause) {
      if (version !== requestVersion || controller.signal.aborted) return false
      error.value = cause
      options.onError?.(cause)
      return false
    } finally {
      if (version === requestVersion) loading.value = false
    }
  }

  const setQuery = async (
    next: Partial<Q> | ((current: Readonly<Q>) => Q),
    reload = true
  ): Promise<boolean> => {
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
    page.value = positiveInteger(nextPage, page.value)
    pageSize.value = positiveInteger(nextPageSize, pageSize.value)
    return execute()
  }

  const resetQuery = async (reload = true): Promise<boolean> => {
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
    requestVersion += 1
    controller?.abort()
    controller = null
    loading.value = false
  }

  if (options.immediate !== false) onMounted(() => void execute())
  onScopeDispose(cancel)

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
