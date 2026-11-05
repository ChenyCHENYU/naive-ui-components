import { computed, ref, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import type {
  DataTableFilterState,
  DataTableInst,
  PaginationProps,
} from 'naive-ui'
import type { DataRecord, PaginationConfig, TableColumn } from '../types'
import { usePagination, type UsePaginationOptions } from './usePagination'
import { useTableDataPipeline } from './useTableDataPipeline'

interface TableViewportOptions {
  table: Ref<DataTableInst | null>
  data: MaybeRefOrGetter<DataRecord[]>
  columns: MaybeRefOrGetter<TableColumn[]>
  pagination: MaybeRefOrGetter<PaginationConfig | null>
  nativePagination: MaybeRefOrGetter<PaginationProps | false | undefined>
  nativeRemote: MaybeRefOrGetter<boolean | undefined>
  emit?: UsePaginationOptions['emit']
}

function defaultPageSize(pagination: PaginationProps | false | undefined) {
  if (!pagination) return 10
  const firstSize = pagination.pageSizes?.[0]
  return (
    pagination.defaultPageSize ??
    (typeof firstSize === 'number' ? firstSize : firstSize?.value || 10)
  )
}

/** 分页归属在这里决定，序号、拖拽、跨页选择和导出使用同一个可见页。 */
export function useTableViewport(options: TableViewportOptions) {
  const native = computed(() => toValue(options.nativePagination))
  const usesNative = computed(() => native.value !== undefined)
  const remote = computed(() => {
    const managedRemote = toValue(options.pagination)?.remote ?? false
    return usesNative.value
      ? (toValue(options.nativeRemote) ?? managedRemote)
      : managedRemote
  })
  const nativePage = ref(native.value ? (native.value.defaultPage ?? 1) : 1)
  const nativePageSize = ref(defaultPageSize(native.value))
  const nativePagination = computed(() =>
    native.value
      ? {
          ...native.value,
          defaultPage: nativePage.value,
          defaultPageSize: nativePageSize.value,
        }
      : false
  )
  const pipeline = useTableDataPipeline({
    data: options.data,
    columns: options.columns,
    remote,
  })
  const managed = usePagination({
    // 原生模式由 Naive UI 筛选和排序，只有缺少公开读方法时才计算备用结果。
    data: () =>
      usesNative.value ? toValue(options.data) : pipeline.processedData.value,
    config: computed(() =>
      usesNative.value ? null : toValue(options.pagination)
    ),
    emit: options.emit,
  })
  const localCount = () =>
    options.table.value?.getFilteredAndSortedData?.().length ??
    pipeline.filteredRowCount.value

  const pageSize = computed(() =>
    native.value
      ? Math.max(1, native.value.pageSize ?? nativePageSize.value)
      : managed.currentPageSize.value
  )
  const currentPage = computed(() => {
    if (!usesNative.value) {
      return toValue(options.pagination)?.enabled
        ? managed.currentPage.value
        : 1
    }
    if (!native.value) return 1
    const requested = Math.max(1, native.value.page ?? nativePage.value)
    // 远程总数可能先于新页数据更新，序号仍按调用方提供的页码计算。
    if (remote.value || requested === 1) return requested
    return Math.max(
      1,
      Math.min(requested, Math.ceil(localCount() / pageSize.value))
    )
  })
  const rowNumberOffset = computed(() =>
    currentPage.value === 1 ? 0 : (currentPage.value - 1) * pageSize.value
  )
  const tableData = computed(() =>
    usesNative.value ? toValue(options.data) : managed.paginatedData.value
  )
  const displayedRows = computed(() => {
    if (!usesNative.value) return tableData.value
    const rows = options.table.value?.getCurrentPageData?.()
    if (rows) return rows
    const source = pipeline.processedData.value
    if (!native.value || remote.value) return source
    const start = rowNumberOffset.value
    return source.slice(start, start + pageSize.value)
  })

  function handleFilterChange(filters: DataTableFilterState) {
    pipeline.setFilters(filters)
    if (!usesNative.value && !remote.value) managed.resetToFirstPage()
  }

  function resetToFirstPage() {
    if (!usesNative.value) {
      managed.resetToFirstPage()
      return
    }
    nativePage.value = 1
    options.table.value?.page(1)
  }

  function getTotalPages() {
    if (!usesNative.value) return managed.getTotalPages()
    const pagination = native.value
    if (!pagination) return 1
    if (
      remote.value &&
      pagination.itemCount === undefined &&
      pagination.pageCount !== undefined
    )
      return Math.max(1, pagination.pageCount)
    const count = remote.value
      ? (pagination.itemCount ?? toValue(options.data).length)
      : localCount()
    return Math.max(1, Math.ceil(count / pageSize.value))
  }

  function resetReport() {
    nativePage.value = native.value ? (native.value.defaultPage ?? 1) : 1
    nativePageSize.value = defaultPageSize(native.value)
    pipeline.setSorter(undefined)
    pipeline.setFilters({})
  }

  return {
    currentPage,
    rowNumberOffset,
    displayedRows,
    tableData,
    // 管理模式已经向 Naive UI 提供当前页，避免内部再次筛选或分页。
    tableRemote: computed(() => !usesNative.value || remote.value),
    remote,
    nativePagination,
    managedPagination: managed.paginationConfig,
    handleNativePageChange: (page: number) => {
      nativePage.value = page
    },
    handleNativePageSizeChange: (size: number) => {
      nativePageSize.value = size
    },
    handleSorterChange: pipeline.setSorter,
    handleFilterChange,
    discardColumns: pipeline.discardColumns,
    resetReport,
    resetToFirstPage,
    getTotalPages,
  }
}
