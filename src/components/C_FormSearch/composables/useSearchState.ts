import {
  ref,
  computed,
  nextTick,
  onMounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import type { SearchFormItem, SearchFormParams, SearchConfig } from '../types'
import type { FormInst } from 'naive-ui/es'
import { useSearchHistory, type SearchHistoryOptions } from './useSearchHistory'
import { useComponentFeedback, useComponentLocale } from '../../../config'
import { cloneData } from '../../../utils/data'

interface UseSearchStateOptions {
  formItemList: SearchFormItem[]
  formParams: SearchFormParams
  config?: MaybeRefOrGetter<SearchConfig | undefined>
  historyOptions?: MaybeRefOrGetter<SearchHistoryOptions>
}

/**
 *
 */
export function useSearchState(
  emits: {
    (event: 'search', params: SearchFormParams): void
    (event: 'reset'): void
    (event: 'change-params', params: SearchFormParams): void
    (event: 'update:modelValue', params: SearchFormParams): void
  },
  options: UseSearchStateOptions
) {
  const config = computed(() => toValue(options.config) ?? {})
  const feedback = useComponentFeedback(() => config.value.feedback)
  const { t } = useComponentLocale(() => config.value.locale)
  const formRef = ref<FormInst | null>(null)
  const foldThreshold = computed(() => config.value.foldThreshold ?? 7)
  const requireValue = computed(() => config.value.requireValue ?? true)

  const fields = ref<SearchFormItem[]>(cloneData(options.formItemList))
  const formParams = ref<SearchFormParams>(cloneData(options.formParams))
  const expanded = ref(false)
  const searching = ref(false)

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

  const searchFn = async (): Promise<boolean> => {
    if (requireValue.value) {
      const hasValidParams = Object.entries(formParams.value)
        .filter(([key]) => key !== 'pageNum' && key !== 'pageSize')
        .some(([, value]) => !isEmpty(value))

      if (!hasValidParams) {
        feedback.warning(t('search.valueRequired'))
        return false
      }
    }
    history.saveCurrentInputs()
    const params = cloneData(formParams.value)
    emits('search', params)
    if (!config.value.onSearch) return true
    searching.value = true
    try {
      await config.value.onSearch(params)
      return true
    } catch (error) {
      feedback.error(t('search.failed'), error)
      return false
    } finally {
      searching.value = false
    }
  }

  const resetFn = () => {
    formRef.value?.restoreValidation()
    Object.keys(formParams.value).forEach(key => {
      if (key !== 'pageNum' && key !== 'pageSize') {
        const field = fields.value.find(item => item.prop === key)
        formParams.value[key] = cloneData(field?.defaultValue ?? null)
      }
    })
    emits('reset')
  }

  const toggleFold = () => {
    expanded.value = !expanded.value
  }

  const syncFromProps = (
    newItems: SearchFormItem[],
    newParams: SearchFormParams
  ) => {
    suppressModelEmit = true
    const version = ++syncVersion
    fields.value = cloneData(newItems)
    formParams.value = cloneData(newParams)
    initialize()
    void nextTick(() => {
      if (version === syncVersion) suppressModelEmit = false
    })
  }

  let suppressModelEmit = false
  let syncVersion = 0
  initialize()
  watch(
    formParams,
    params => {
      if (suppressModelEmit) return
      const value = cloneData(params)
      emits('change-params', value)
      emits('update:modelValue', value)
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
