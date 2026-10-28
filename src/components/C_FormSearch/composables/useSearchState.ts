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
import {
  resolveSearchResetValue,
  isSearchValueEmpty,
  mergeSearchPreset,
} from '../fieldValue'
import { useActionTask } from '../../../composables/useActionTask'
import { notifyObserver } from '../../../core/observer'

export interface UseSearchStateOptions<T extends object = SearchFormParams> {
  formItemList: SearchFormItem<T>[]
  formParams: T
  config?: MaybeRefOrGetter<SearchConfig<T> | undefined>
  loading?: MaybeRefOrGetter<boolean>
  historyOptions?: MaybeRefOrGetter<SearchHistoryOptions>
  onApplied?: (params: T) => void
}

/** 搜索草稿、校验锁与成功快照；字段元数据同步不回滚输入，作用域失效不接受迟到结果。 */
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
  const appliedParams = ref<T | null>(null) as Ref<T | null>
  const hasUnappliedChanges = computed(
    () =>
      appliedParams.value === null ||
      !isDataEqual(formParams.value, appliedParams.value)
  )
  const expanded = ref(false)
  let scopeVersion = 0
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

  const hiddenActiveCount = computed(() => {
    const visible = new Set(visibleFields.value.map(field => field.prop))
    return fields.value.filter(
      field =>
        field.type !== 'spacer' &&
        !visible.has(field.prop) &&
        !isSearchValueEmpty(
          (formParams.value as Record<string, unknown>)[field.prop]
        )
    ).length
  })

  const initialize = () => {
    const values = formParams.value as Record<string, unknown>
    fields.value.forEach(item => {
      item.isFocus = false
      if (item.show === false) return
      if (item.type === 'select' && !item.placeholder)
        item.placeholder = '请选择'
      if (item.type !== 'spacer' && values[item.prop] === undefined) {
        values[item.prop] =
          item.defaultValue !== undefined
            ? cloneData(item.defaultValue)
            : resolveSearchResetValue(item, values[item.prop])
      }
    })
  }

  const validate = async (): Promise<boolean> => {
    try {
      await formRef.value?.validate()
      return true
    } catch {
      // 折叠仅影响显示；校验失败时展示完整条件，便于定位字段。
      if (hasExpandButton.value) expanded.value = true
      return false
    }
  }

  const canSubmit = (params: T): boolean =>
    active && !toValue(options.loading) && isDataEqual(formParams.value, params)

  const hasRequiredValue = (params: T): boolean => {
    if (!requireValue.value) return true
    const valid = Object.entries(params)
      .filter(([key]) => key !== 'pageNum' && key !== 'pageSize')
      .some(([, value]) => !isSearchValueEmpty(value))
    if (!valid) feedback.warning(t('search.valueRequired'))
    return valid
  }

  const canApply = (params: T, version: number): boolean =>
    active &&
    version === scopeVersion &&
    fields.value
      .filter(field => field.fixed)
      .every(field =>
        isDataEqual(
          (formParams.value as Record<string, unknown>)[field.prop],
          (params as Record<string, unknown>)[field.prop]
        )
      )

  const reportFailure = (error: unknown) => {
    if (active) feedback.error(t('search.failed'), error)
  }

  const executeSearch = async (): Promise<boolean> => {
    const params = cloneData(formParams.value)
    const version = scopeVersion
    if (!(await validate()) || !canSubmit(params)) return false
    if (!hasRequiredValue(params)) return false
    history.saveCurrentInputs()
    emits('search', cloneData(params))
    if (!canSubmit(params)) return false
    const execute = config.value.onSearch
    // 旧的 emit-only 接入没有可等待的业务结果，保持返回语义，但不伪造 applied 成功。
    if (!execute) return true
    try {
      // 请求收到隔离快照；回调修改入参不能更改已执行条件的事实。
      if ((await execute(cloneData(params))) === false) return false
    } catch (error) {
      reportFailure(error)
      return false
    }
    if (!canApply(params, version)) return false
    appliedParams.value = cloneData(params)
    notifyObserver(() => options.onApplied?.(cloneData(params)))
    return true
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
        field.fixed ||
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

  const applyPreset = (values: Partial<T>): boolean => {
    if (!active) return false
    try {
      const next = mergeSearchPreset(formParams.value, fields.value, values)
      if (isDataEqual(next, formParams.value)) return true
      suppressModelUpdates()
      formParams.value = next
      publishModel(next)
      return true
    } catch (error) {
      notifyObserver(() => reportFailure(error))
      return false
    }
  }

  const toggleFold = () => {
    expanded.value = !expanded.value
  }

  const syncFields = (newItems: SearchFormItem<T>[]) => {
    const previous = new Map(fields.value.map(field => [field.prop, field]))
    fields.value = cloneData(newItems).map(field => {
      const old = previous.get(field.prop)
      return old && field.hisList === undefined
        ? { ...field, hisList: old.hisList, isFocus: false }
        : field
    })
    initialize()
  }

  const syncModel = (newParams: T) => {
    // 同值 v-model echo 不重建草稿和历史控件，配置变化也不拿旧 props 覆盖输入。
    if (isDataEqual(newParams, formParams.value)) return
    suppressModelUpdates()
    formParams.value = cloneData(newParams)
    initialize()
  }

  const syncFromProps = (newItems: SearchFormItem<T>[], newParams: T) => {
    syncModel(newParams)
    syncFields(newItems)
  }

  let suppressModelEmit = false
  let syncVersion = 0
  initialize()
  watch(
    () =>
      fields.value
        .filter(field => field.fixed)
        .map(field => [
          field.prop,
          cloneData((formParams.value as Record<string, unknown>)[field.prop]),
        ]),
    (next, previous) => {
      if (isDataEqual(next, previous)) return
      scopeVersion++
      appliedParams.value = null
    },
    { deep: true, flush: 'sync' }
  )
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
    appliedParams,
    hasUnappliedChanges,
    hiddenActiveCount,
    expanded,
    searching,
    visibleFields,
    availableFields,
    foldThreshold,
    hasExpandButton,
    history,
    searchFn,
    resetFn,
    applyPreset,
    toggleFold,
    syncFromProps,
    syncFields,
    syncModel,
  }
}
