/** 批量结果只呈现最新结果与显式重试入口，不执行后端操作。 */
import { computed, shallowRef, watch } from 'vue'
import {
  getRetryableKeys,
  type BatchOperationResult,
} from '../../core/batchPatch'
import type { BatchResultProps } from './types'
import { useComponentLocale } from '../../composables/useComponentLocale'

export const BATCH_STATUSES = [
  'success',
  'failure',
  'conflict',
  'skipped',
] as const

/** 同一业务key以最后一条为准；分页只挂载当前页行。 */
export function useBatchResults(props: Readonly<BatchResultProps>) {
  const { t } = useComponentLocale(() => props.locale)
  const filter = shallowRef<'all' | BatchOperationResult['status']>('all')
  const page = shallowRef(1)
  const pageSize = computed(() =>
    Number.isFinite(props.pageSize) && props.pageSize! > 0
      ? Math.max(1, Math.trunc(props.pageSize!))
      : 20
  )
  const latest = computed(() => [
    ...new Map(props.results.map(result => [result.key, result])).values(),
  ])
  const counts = computed(() => {
    const count = {
      all: latest.value.length,
      success: 0,
      failure: 0,
      conflict: 0,
      skipped: 0,
    }
    for (const result of latest.value) count[result.status]++
    return count
  })
  const options = computed(() => [
    { value: 'all', label: `${t('batch.all')} ${counts.value.all}` },
    ...BATCH_STATUSES.map(value => ({
      value,
      label: `${t(`batch.${value}`)} ${counts.value[value]}`,
    })),
  ])
  const filtered = computed(() =>
    filter.value === 'all'
      ? latest.value
      : latest.value.filter(result => result.status === filter.value)
  )
  const rows = computed(() =>
    filtered.value.slice(
      (page.value - 1) * pageSize.value,
      page.value * pageSize.value
    )
  )
  const retryKeys = computed(() => getRetryableKeys(latest.value))
  watch([filter, pageSize], () => {
    page.value = 1
  })
  watch(
    () => filtered.value.length,
    length => {
      page.value = Math.min(
        page.value,
        Math.max(1, Math.ceil(length / pageSize.value))
      )
    }
  )
  return {
    filter,
    page,
    pageSize,
    counts,
    options,
    filtered,
    rows,
    retryKeys,
    t,
  }
}
