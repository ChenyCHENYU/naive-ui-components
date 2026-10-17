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
import { useActionTask } from '../../../composables/useActionTask'

interface UseSearchStateOptions {
  formItemList: SearchFormItem[]
  formParams: SearchFormParams
  config?: MaybeRefOrGetter<SearchConfig | undefined>
  loading?: MaybeRefOrGetter<boolean>
  historyOptions?: MaybeRefOrGetter<SearchHistoryOptions>
}

/**
 *
 */
export function useSearchState(
  emits: {
    (event: 'search', params: SearchFormParams): void
    (event: 'reset', params: SearchFormParams): void
    (event: 'change-params', params: SearchFormParams): void
    (event: 'update:modelValue', params: SearchFormParams): void
  },
  options: UseSearchStateOptions
) {
  const config = computed(() => toValue(options.config) ?? {})
  const feedback = useComponentFeedback(() => config.value.feedback)
  const { t } = useComponentLocale(() => config.value.locale)
  const formRef: Ref<FormInst | null> = ref<FormInst | null>(null)
  const foldThreshold = computed(() => config.value.foldThreshold ?? 7)
  const requireValue = computed(() => config.value.requireValue ?? true)

  const fields: Ref<SearchFormItem[]> = ref<SearchFormItem[]>(
    cloneData(options.formItemList)
  )
  const formParams = ref<SearchFormParams>(cloneData(options.formParams))
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

  const isEmpty = (value: any): boolean =>
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)

  const initialize = () => {
    fields.value.forEach(item => {
      item.isFocus = false
      if (item.type === 'select') {
        if (!item.placeholder) item.placeholder = '请选择'
        if (formParams.value[item.prop] === undefined) {
          formParams.value[item.prop] = cloneData(item.defaultValue ?? null)
        }
      } else if (
        formParams.value[item.prop] === undefined &&
        item.defaultValue !== undefined
      ) {
        formParams.value[item.prop] = cloneData(item.defaultValue)
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

  const canSubmit = (params: SearchFormParams): boolean =>
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

  const publishModel = (params: SearchFormParams) => {
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
    Object.keys(params).forEach(key => {
      if (key !== 'pageNum' && key !== 'pageSize') {
        const field = fields.value.find(item => item.prop === key)
        params[key] = cloneData(field?.defaultValue ?? null)
      }
    })
    suppressModelUpdates()
    formParams.value = params
    publishModel(params)
    emits('reset', cloneData(params))
  }

  const toggleFold = () => {
    expanded.value = !expanded.value
  }

  const syncFromProps = (
    newItems: SearchFormItem[],
    newParams: SearchFormParams
  ) => {
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
