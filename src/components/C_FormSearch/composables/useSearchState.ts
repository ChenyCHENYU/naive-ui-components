import {
  ref,
  computed,
  nextTick,
  onMounted,
  getCurrentScope,
  onScopeDispose,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import type { SearchFormItem, SearchFormParams, SearchConfig } from '../types'
import type { FormInst } from 'naive-ui'
import { useSearchHistory, type SearchHistoryOptions } from './useSearchHistory'
import { useComponentFeedback, useComponentLocale } from '../../../config'
import { cloneData, isDataEqual } from '../../../utils/data'
import { resolveSearchResetValue } from '../fieldValue'
import { useActionTask } from '../../../composables/useActionTask'

export interface UseSearchStateOptions<T extends object = SearchFormParams> {
  formItemList: SearchFormItem<T>[]
  formParams: T
  config?: MaybeRefOrGetter<SearchConfig<T> | undefined>
  loading?: MaybeRefOrGetter<boolean>
  historyOptions?: MaybeRefOrGetter<SearchHistoryOptions>
}

/**
 *
 */
export function useSearchState<T extends object = SearchFormParams>(
  emits: {
    (event: 'search', params: T): void
    (event: 'reset', params: T): void
    (event: 'change-params', params: T): void
    (event: 'update:modelValue', params: T): void
  },
  options: UseSearchStateOptions<T>
) {
  const config = computed(() => toValue(options.config) ?? {})
  const feedback = useComponentFeedback(() => config.value.feedback)
  const { t } = useComponentLocale(() => config.value.locale)
  const formRef: Ref<FormInst | null> = ref<FormInst | null>(null)
  const foldThreshold = computed(() => config.value.foldThreshold ?? 7)
  const requireValue = computed(() => config.value.requireValue ?? true)

  const fields = ref(cloneData(options.formItemList)) as Ref<
    SearchFormItem<T>[]
  >
  const formParams = ref(cloneData(options.formParams)) as Ref<T>
  const expanded = ref(false)
  const searchTasks = useActionTask<string>()
  const searching = computed(() => searchTasks.isRunning('search'))
  let active = true
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false
    })

  const history = useSearchHistory(fields, formParams, options.historyOptions)

  const availableFields = computed(() =>
    fields.value.filter(item => item.show !== false)
  )

  const visibleFields = computed(() =>
    availableFields.value.filter(
      (_item, index) => expanded.value || index < foldThreshold.value
    )
  )

  const hasExpandButton = computed(
    () => availableFields.value.length > foldThreshold.value
  )

  const isEmpty = (value: unknown): boolean =>
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)

  const initialize = () => {
    const values = formParams.value as Record<string, unknown>
    fields.value.forEach(item => {
      item.isFocus = false
      if (item.show === false) return
      if (item.type === 'select' && !item.placeholder)
        item.placeholder = '请选择'
      if (item.type !== 'spacer' && values[item.prop] === undefined) {
        values[item.prop] = resolveSearchResetValue(item, values[item.prop])
      }
    })
  }

  const validate = async (): Promise<boolean> => {
    try {
      await formRef.value?.validate()
      return true
    } catch {
      return false
    }
  }

  const canSubmit = (params: T): boolean =>
    active && !toValue(options.loading) && isDataEqual(formParams.value, params)

  const executeSearch = async (): Promise<boolean> => {
    const params = cloneData(formParams.value)
    if (!(await validate()) || !canSubmit(params)) return false
    if (requireValue.value) {
      const hasValidParams = Object.entries(params)
        .filter(([key]) => key !== 'pageNum' && key !== 'pageSize')
        .some(([, value]) => !isEmpty(value))

      if (!hasValidParams) {
        feedback.warning(t('search.valueRequired'))
        return false
      }
    }
    history.saveCurrentInputs()
    emits('search', cloneData(params))
    if (!canSubmit(params)) return false
    if (!config.value.onSearch) return true
    try {
      await config.value.onSearch(params)
      return active
    } catch (error) {
      if (active) feedback.error(t('search.failed'), error)
      return false
    }
  }

  const searchFn = async (): Promise<boolean> => {
    const result = await searchTasks.run(
      'search',
      executeSearch,
      () => !toValue(options.loading)
    )
    return result.executed && result.value
  }

  const publishModel = (params: T) => {
    emits('change-params', cloneData(params))
    emits('update:modelValue', cloneData(params))
  }

  const suppressModelUpdates = () => {
    suppressModelEmit = true
    const version = ++syncVersion
    void nextTick(() => {
      if (version === syncVersion) suppressModelEmit = false
    })
  }

  const resetFn = () => {
    formRef.value?.restoreValidation()
    const params = cloneData(formParams.value)
    const values = params as Record<string, unknown>
    // 只重置已配置的搜索字段，保留租户、路由上下文等宿主参数。
    fields.value.forEach(field => {
      if (
        field.show === false ||
        field.type === 'spacer' ||
        field.prop === 'pageNum' ||
        field.prop === 'pageSize'
      )
        return
      values[field.prop] = resolveSearchResetValue(field, values[field.prop])
    })
    suppressModelUpdates()
    formParams.value = params
    publishModel(params)
    emits('reset', cloneData(params))
  }

  const toggleFold = () => {
    expanded.value = !expanded.value
  }

  const syncFromProps = (newItems: SearchFormItem<T>[], newParams: T) => {
    suppressModelUpdates()
    fields.value = cloneData(newItems)
    formParams.value = cloneData(newParams)
    initialize()
  }

  let suppressModelEmit = false
  let syncVersion = 0
  initialize()
  watch(
    formParams,
    params => {
      if (suppressModelEmit) return
      publishModel(params)
    },
    { deep: true }
  )

  onMounted(() => {
    history.restoreFromStorage()
  })

  return {
    formRef,
    fields,
    formParams,
    expanded,
    searching,
    visibleFields,
    hasExpandButton,
    history,
    searchFn,
    resetFn,
    toggleFold,
    syncFromProps,
  }
}
