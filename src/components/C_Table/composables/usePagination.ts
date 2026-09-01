/*
 * @Description: 表格分页逻辑 Hook
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { computed, ref, unref, watch, type ComputedRef, type Ref } from 'vue'
import type { PaginationProps } from 'naive-ui'
import type { DataRecord, PaginationConfig } from '../types'

interface PaginationRenderInfo {
  itemCount?: number
  startIndex: number
  endIndex: number
}

export interface UsePaginationOptions<T extends object = DataRecord> {
  /** 数据源 - 支持函数、Ref 或 ComputedRef */
  data: (() => T[]) | Ref<T[]> | ComputedRef<T[]>
  /** 分页配置 */
  config: Ref<PaginationConfig | null> | ComputedRef<PaginationConfig | null>
  /** 事件触发器 */
  emit?: (event: 'pagination-change', page: number, pageSize: number) => void
}

export interface UsePaginationReturn<T extends object = DataRecord> {
  currentPage: Ref<number>
  currentPageSize: Ref<number>
  paginatedData: ComputedRef<T[]>
  paginationConfig: ComputedRef<PaginationProps | null>
  handlePageChange: (page: number) => void
  handlePageSizeChange: (pageSize: number) => void
  resetToFirstPage: () => void
  getTotalPages: () => number
}

const DEFAULT_PAGINATION_CONFIG = {
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  showQuickJumper: true,
  pageSizes: [10, 20, 50, 100],
  simple: false,
  size: 'medium' as const,
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value) || (value ?? 0) <= 0) return fallback
  return Math.max(1, Math.trunc(value!))
}

/** Local and remote pagination with stable controlled-state synchronization. */
export function usePagination<T extends object = DataRecord>(
  options: UsePaginationOptions<T>
): UsePaginationReturn<T> {
  const { data, config, emit } = options
  const currentPage = ref(DEFAULT_PAGINATION_CONFIG.page)
  const currentPageSize = ref(DEFAULT_PAGINATION_CONFIG.pageSize)

  const dataSource = computed(() => {
    const source = typeof data === 'function' ? data() : unref(data)
    return Array.isArray(source) ? source : []
  })

  const itemCount = computed(() => {
    const pagination = config.value
    if (pagination?.remote) {
      return Math.max(
        0,
        Math.trunc(pagination.total ?? dataSource.value.length)
      )
    }
    return dataSource.value.length
  })

  const getTotalPages = () => {
    if (!config.value?.enabled) return 1
    return Math.max(1, Math.ceil(itemCount.value / currentPageSize.value))
  }

  const setPage = (page: number, notify: boolean) => {
    const nextPage = Math.min(
      normalizePositiveInteger(page, 1),
      getTotalPages()
    )
    if (currentPage.value === nextPage) return
    currentPage.value = nextPage
    if (notify) {
      emit?.('pagination-change', nextPage, currentPageSize.value)
    }
  }

  const handlePageChange = (page: number) => setPage(page, true)

  const handlePageSizeChange = (pageSize: number) => {
    const nextPageSize = normalizePositiveInteger(
      pageSize,
      DEFAULT_PAGINATION_CONFIG.pageSize
    )
    const changed = currentPageSize.value !== nextPageSize
    currentPageSize.value = nextPageSize
    currentPage.value = 1
    if (changed) emit?.('pagination-change', 1, nextPageSize)
  }

  const resetToFirstPage = () => setPage(1, true)

  const paginatedData = computed(() => {
    const pagination = config.value
    if (!pagination?.enabled || pagination.remote) return dataSource.value

    const start = (currentPage.value - 1) * currentPageSize.value
    return dataSource.value.slice(start, start + currentPageSize.value)
  })

  const paginationConfig = computed<PaginationProps | null>(() => {
    const pagination = config.value
    if (!pagination?.enabled) return null

    return {
      page: currentPage.value,
      pageSize: currentPageSize.value,
      itemCount: itemCount.value,
      showSizePicker:
        pagination.showSizePicker ?? DEFAULT_PAGINATION_CONFIG.showSizePicker,
      showQuickJumper:
        pagination.showQuickJumper ?? DEFAULT_PAGINATION_CONFIG.showQuickJumper,
      pageSizes: pagination.pageSizes ?? DEFAULT_PAGINATION_CONFIG.pageSizes,
      simple: pagination.simple ?? DEFAULT_PAGINATION_CONFIG.simple,
      size: pagination.size ?? DEFAULT_PAGINATION_CONFIG.size,
      prefix: (info: PaginationRenderInfo) => `共 ${info.itemCount ?? 0} 条`,
      suffix: (info: PaginationRenderInfo) =>
        (info.itemCount ?? 0) > 0
          ? `第 ${info.startIndex + 1}-${info.endIndex} 条`
          : '暂无数据',
      'onUpdate:page': handlePageChange,
      'onUpdate:pageSize': handlePageSizeChange,
    }
  })

  watch(
    () => [config.value?.page, config.value?.pageSize] as const,
    ([page, pageSize]) => {
      currentPageSize.value = normalizePositiveInteger(
        pageSize,
        DEFAULT_PAGINATION_CONFIG.pageSize
      )
      currentPage.value = Math.min(
        normalizePositiveInteger(page, DEFAULT_PAGINATION_CONFIG.page),
        getTotalPages()
      )
    },
    { immediate: true }
  )

  watch([itemCount, currentPageSize], () => {
    const clampedPage = Math.min(currentPage.value, getTotalPages())
    if (clampedPage !== currentPage.value) {
      currentPage.value = clampedPage
      emit?.('pagination-change', clampedPage, currentPageSize.value)
    }
  })

  return {
    currentPage,
    currentPageSize,
    paginatedData,
    paginationConfig,
    handlePageChange,
    handlePageSizeChange,
    resetToFirstPage,
    getTotalPages,
  }
}
