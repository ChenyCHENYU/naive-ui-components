import {
  computed,
  nextTick,
  onScopeDispose,
  reactive,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'
import type { FormInst, FormItemInst, FormItemRule, FormRules } from 'naive-ui'
import type {
  AsyncOptionsContext,
  ComponentType,
  FormModel,
  FormOption,
  OptionItem,
  SubmitEventPayload,
} from '../types'
import {
  cloneFormValue,
  isFormValueEqual,
  replaceFormRecord,
} from '../utils/formModel'
import type { ResolvedFormConfig } from './useFormConfig'
import { useFormDirty } from './useFormDirty'
import {
  deleteDataPath,
  getDataPath,
  hasDataPath,
  parseDataPath,
  setDataPath,
} from '../../../utils/data'
import { useComponentFeedback, useComponentLocale } from '../../../config'
import {
  createRequiredFormRule,
  resolveFormRules,
} from '../utils/formValidation'

const DEFAULT_VALUES: Record<ComponentType, unknown> = {
  input: '',
  textarea: '',
  editor: '',
  select: null,
  datePicker: null,
  daterange: null,
  timePicker: null,
  cascader: null,
  colorPicker: null,
  checkbox: [],
  upload: [],
  radio: '',
  inputNumber: null,
  slider: null,
  rate: null,
  switch: false,
}

function getDefaultValue(item: FormOption): unknown {
  const value =
    item.value !== undefined
      ? item.value
      : DEFAULT_VALUES[item.type as ComponentType]
  return cloneFormValue(value ?? null)
}

function ensureValidOptions(options: readonly FormOption[]): void {
  const props = new Set<string>()
  options.forEach((item, index) => {
    if (!item.prop?.trim()) {
      throw new TypeError(`[C_Form] options[${index}].prop 不能为空`)
    }
    if (props.has(item.prop)) {
      throw new TypeError(`[C_Form] 字段 prop 重复: ${item.prop}`)
    }
    props.add(item.prop)
  })
}

type FormEmit = {
  (event: 'update:modelValue', model: FormModel): void
  (event: 'validate-success', model: FormModel): void
  (event: 'validate-error', errors: unknown): void
  (event: 'submit', payload: SubmitEventPayload): void
}

/** C_Form state, validation, async options and model synchronization engine. */
export function useFormState(
  options: ComputedRef<FormOption[]>,
  config: ComputedRef<ResolvedFormConfig>,
  formRef: Ref<FormInst | null>,
  emit: FormEmit,
  externalModel?: ComputedRef<FormModel | undefined>,
  validationReady?: ComputedRef<boolean>
) {
  const initialSource =
    externalModel?.value ??
    (config.value.mode === 'edit' ? config.value.initialValues : undefined)
  const formModel = reactive<FormModel>(cloneFormValue(initialSource ?? {}))
  const formRules = reactive<FormRules>({})
  const formItemRefs = new Map<string, FormItemInst>()

  const asyncOptionsCache = ref<Record<string, OptionItem[]>>({})
  const asyncLoadingMap = ref<Record<string, boolean>>({})
  const asyncErrorMap = ref<Record<string, unknown>>({})
  const isSubmitting = ref(false)
  const ruleErrors = new Map<string, unknown>()
  let disposed = false
  let submitController: AbortController | undefined

  const requestVersions = new Map<string, number>()
  const requestControllers = new Map<string, AbortController>()
  const asyncOptionLoaders = new Map<string, FormOption['asyncOptions']>()
  const scheduledOptionLoads = new Map<
    string,
    { item: FormOption; reason: AsyncOptionsContext['reason'] }
  >()
  let previousOptionProps = new Set<string>()
  let initialized = false
  let suppressModelEmit = false
  let suppressionVersion = 0
  const feedback = useComponentFeedback(() => config.value.feedback)
  const { t } = useComponentLocale(() => config.value.locale)

  const {
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
    getCleanModel,
  } = useFormDirty(formModel, () => options.value.map(item => item.prop))

  function reportError(
    error: unknown,
    source: Parameters<NonNullable<ResolvedFormConfig['onError']>>[1]['source'],
    field?: string
  ): void {
    if (disposed) return
    try {
      if (config.value.onError) config.value.onError(error, { source, field })
      else
        feedback.error(
          error instanceof Error ? error.message : String(error),
          error
        )
    } catch {
      // 提示适配器失败不能打断加载/提交的清理，也不能制造未处理异常。
    }
  }

  /** 提示插件异常不能把已经完成的业务提交改判为失败。 */
  function notify(type: 'success' | 'info', message: string): void {
    if (disposed || !message) return
    try {
      feedback[type](message)
    } catch {
      // 消息呈现与业务提交结果独立，清理流程继续执行。
    }
  }

  const visibleOptions = computed(() =>
    options.value.filter(item => {
      if (item.show === false) return false
      if (!item.showWhen) return true
      try {
        return item.showWhen(formModel)
      } catch (error) {
        reportError(error, 'callback', item.prop)
        return false
      }
    })
  )

  function suppressNextEmit(): void {
    suppressModelEmit = true
    const version = ++suppressionVersion
    void nextTick(() => {
      if (version === suppressionVersion) suppressModelEmit = false
    })
  }

  function getModel(): FormModel {
    return cloneFormValue(formModel)
  }

  function createConfiguredModel(source?: FormModel): FormModel {
    const model: FormModel = source ? cloneFormValue(source) : {}
    options.value.forEach(item => {
      if (!hasDataPath(model, item.prop)) {
        setDataPath(model, item.prop, getDefaultValue(item))
      }
    })
    return model
  }

  function syncRulesForField(item: FormOption): void {
    try {
      const rules: FormItemRule[] = resolveFormRules(
        item.rulesWhen ? item.rulesWhen(formModel) : item.rules
      )
      ruleErrors.delete(item.prop)

      if (item.required && !rules.some(rule => rule.required)) {
        const label = item.label || item.prop
        rules.unshift(
          createRequiredFormRule(label, t('form.required', { label }))
        )
      }

      if (item.crossFieldValidator) {
        const validator = item.crossFieldValidator
        rules.push({
          async validator() {
            const message = await validator(formModel)
            if (message) throw new Error(message)
          },
          trigger: ['change', 'blur'],
        })
      }

      if (rules.length === 0) {
        delete formRules[item.prop]
        return
      }

      formRules[item.prop] = rules.map(rule => ({
        ...rule,
        key: item.prop,
      }))
    } catch (error) {
      delete formRules[item.prop]
      ruleErrors.set(item.prop, error)
      reportError(error, 'callback', item.prop)
    }
  }

  function refreshDynamicRules(): void {
    options.value.forEach(item => {
      if (item.rulesWhen || item.crossFieldValidator) syncRulesForField(item)
    })
  }

  function cleanupRemovedFields(nextProps: Set<string>): void {
    previousOptionProps.forEach(prop => {
      if (nextProps.has(prop)) return
      formItemRefs.delete(prop)
      delete formRules[prop]
      ruleErrors.delete(prop)
      invalidateAsyncOptions(prop)
      asyncOptionLoaders.delete(prop)
      if (!config.value.preserveRemovedFields) deleteDataPath(formModel, prop)
    })
  }

  function reconcileOptions(markClean = false): void {
    try {
      ensureValidOptions(options.value)
      const previous = getModel()
      const nextProps = new Set(options.value.map(item => item.prop))
      cleanupRemovedFields(nextProps)

      options.value.forEach(item => {
        if (!hasDataPath(formModel, item.prop)) {
          setDataPath(formModel, item.prop, getDefaultValue(item))
        }
        syncRulesForField(item)
        reconcileAsyncOptions(item)
      })

      previousOptionProps = nextProps
      handleFieldsChanged(changedModelFields(previous), false)
      if (markClean) void nextTick(markAsClean)
    } catch (error) {
      reportError(error, 'initialize')
      throw error
    }
  }

  function applyExternalModel(model: FormModel): void {
    const previous = getModel()
    suppressNextEmit()
    replaceFormRecord(formModel, createConfiguredModel(model))
    handleFieldsChanged(changedModelFields(previous), false)
  }

  function changedModelFields(previous: FormModel): string[] {
    const fields = new Set([
      ...Object.keys(previous),
      ...Object.keys(formModel),
      ...options.value.map(item => item.prop),
    ])
    return [...fields].filter(
      field =>
        !isFormValueEqual(
          getDataPath(previous, field),
          getDataPath(formModel, field)
        )
    )
  }

  function invalidateAsyncOptions(field: string): void {
    requestControllers.get(field)?.abort()
    requestControllers.delete(field)
    requestVersions.delete(field)
    scheduledOptionLoads.delete(field)
    delete asyncOptionsCache.value[field]
    delete asyncLoadingMap.value[field]
    delete asyncErrorMap.value[field]
  }

  function reconcileAsyncOptions(item: FormOption): void {
    if (asyncOptionLoaders.get(item.prop) === item.asyncOptions) return
    invalidateAsyncOptions(item.prop)
    if (!item.asyncOptions) {
      asyncOptionLoaders.delete(item.prop)
      return
    }
    asyncOptionLoaders.set(item.prop, item.asyncOptions)
    scheduleAsyncOptions(item, 'initialize')
  }

  /** Coalesce model changes before loading, using the final model snapshot. */
  function scheduleAsyncOptions(
    item: FormOption,
    reason: AsyncOptionsContext['reason']
  ): void {
    if (disposed) return
    const previous = scheduledOptionLoads.get(item.prop)
    const pending = {
      item,
      reason: previous?.reason === 'initialize' ? previous.reason : reason,
    }
    scheduledOptionLoads.set(item.prop, pending)
    void nextTick(() => {
      if (scheduledOptionLoads.get(item.prop) !== pending) return
      scheduledOptionLoads.delete(item.prop)
      void loadAsyncOptions(pending.item, pending.reason)
    })
  }

  function isStaleRequest(
    field: string,
    version: number,
    controller: AbortController
  ): boolean {
    return (
      disposed ||
      controller.signal.aborted ||
      requestVersions.get(field) !== version ||
      requestControllers.get(field) !== controller
    )
  }

  function isCurrentLoader(item: FormOption): item is FormOption & {
    asyncOptions: NonNullable<FormOption['asyncOptions']>
  } {
    return (
      !disposed &&
      Boolean(item.asyncOptions) &&
      asyncOptionLoaders.get(item.prop) === item.asyncOptions
    )
  }

  async function loadAsyncOptions(
    item: FormOption,
    reason: AsyncOptionsContext['reason']
  ): Promise<void> {
    if (!isCurrentLoader(item)) return

    const { prop } = item
    const version = (requestVersions.get(prop) ?? 0) + 1
    requestVersions.set(prop, version)
    requestControllers.get(prop)?.abort()

    const controller = new AbortController()
    requestControllers.set(prop, controller)
    asyncLoadingMap.value[prop] = true
    delete asyncErrorMap.value[prop]

    try {
      const result = await item.asyncOptions(getModel(), {
        field: prop,
        reason,
        signal: controller.signal,
      })
      if (isStaleRequest(prop, version, controller)) return
      if (!Array.isArray(result)) {
        throw new TypeError(`[C_Form] ${prop}.asyncOptions 必须返回数组`)
      }
      asyncOptionsCache.value[prop] = cloneFormValue([...result])
    } catch (error) {
      if (isStaleRequest(prop, version, controller)) return
      asyncErrorMap.value[prop] = error
      reportError(error, 'async-options', prop)
    } finally {
      if (
        requestVersions.get(prop) === version &&
        requestControllers.get(prop) === controller
      ) {
        asyncLoadingMap.value[prop] = false
        requestControllers.delete(prop)
      }
    }
  }

  async function reloadOptions(field?: string): Promise<void> {
    const targets = options.value.filter(
      item => item.asyncOptions && (!field || item.prop === field)
    )
    if (field && targets.length === 0) {
      throw new Error(`[C_Form] 未找到异步选项字段: ${field}`)
    }
    await Promise.all(
      targets.map(item => {
        scheduledOptionLoads.delete(item.prop)
        return loadAsyncOptions(item, 'manual')
      })
    )
  }

  function applyValueWhen(): string[] {
    const derivedItems = options.value.filter(item => item.valueWhen)
    const changedFields = new Set<string>()
    if (derivedItems.length === 0) return []

    for (let pass = 0; pass <= derivedItems.length; pass += 1) {
      let changed = false
      for (const item of derivedItems) {
        try {
          const nextValue = item.valueWhen?.(formModel)
          if (
            nextValue !== undefined &&
            !isFormValueEqual(getDataPath(formModel, item.prop), nextValue)
          ) {
            setDataPath(formModel, item.prop, cloneFormValue(nextValue))
            changedFields.add(item.prop)
            changed = true
          }
        } catch (error) {
          reportError(error, 'callback', item.prop)
        }
      }
      if (!changed) return [...changedFields]
    }

    reportError(
      new Error('[C_Form] valueWhen 存在循环依赖，已停止继续计算'),
      'callback'
    )
    return [...changedFields]
  }

  function dependentAsyncItems(fields: readonly string[]): FormOption[] {
    const changedFields = fields.map(field => parseDataPath(field).join('.'))
    return options.value.filter(item => {
      if (!item.asyncOptions || !item.dependsOn) return false
      const dependencies = Array.isArray(item.dependsOn)
        ? item.dependsOn
        : [item.dependsOn]
      return dependencies.some(field => {
        const dependency = parseDataPath(field).join('.')
        return changedFields.some(
          changed =>
            changed === dependency ||
            changed.startsWith(`${dependency}.`) ||
            dependency.startsWith(`${changed}.`)
        )
      })
    })
  }

  function handleFieldsChanged(
    fields: readonly string[],
    shouldValidate = true
  ): void {
    const changedFields = [...new Set([...fields, ...applyValueWhen()])]
    refreshDynamicRules()
    dependentAsyncItems(changedFields).forEach(item => {
      scheduleAsyncOptions(item, 'dependency')
    })

    if (shouldValidate && config.value.validateOnChange) {
      void nextTick(() => {
        if (disposed) return
        void validateField(changedFields).catch(() => undefined)
      })
    }
  }

  function handleFieldChange(field: string): void {
    handleFieldsChanged([field])
  }

  function setFormItemRef(field: string, instance: FormItemInst | null): void {
    if (instance) formItemRefs.set(field, instance)
    else formItemRefs.delete(field)
  }

  async function validate(): Promise<void> {
    if (validationReady?.value === false)
      throw new Error('[C_Form] 布局尚未加载完成')
    if (!formRef.value) throw new Error('[C_Form] 表单引用不存在')
    try {
      const invalidRule = visibleOptions.value.find(item =>
        ruleErrors.has(item.prop)
      )
      if (invalidRule) throw ruleErrors.get(invalidRule.prop)
      await formRef.value.validate()
      if (disposed) throw new Error('[C_Form] 表单已卸载')
      emit('validate-success', getModel())
    } catch (errors) {
      if (!disposed) emit('validate-error', errors)
      throw errors
    }
  }

  async function validateField(field: string | string[]): Promise<void> {
    if (validationReady?.value === false)
      throw new Error('[C_Form] 布局尚未加载完成')
    if (!formRef.value) throw new Error('[C_Form] 表单引用不存在')

    const fields = [...new Set(Array.isArray(field) ? field : [field])]
    const invalidRule = fields.find(fieldName => ruleErrors.has(fieldName))
    if (invalidRule) throw ruleErrors.get(invalidRule)
    const missingFields: string[] = []
    const validations: Promise<unknown>[] = fields.flatMap(fieldName => {
      const itemRef = formItemRefs.get(fieldName)
      if (!itemRef) {
        missingFields.push(fieldName)
        return []
      }
      return [itemRef.validate()]
    })

    if (missingFields.length > 0) {
      validations.push(
        formRef.value.validate(undefined, rule =>
          missingFields.includes(String(rule.key ?? ''))
        )
      )
    }

    const results = await Promise.allSettled(validations)
    const errors = results
      .filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      )
      .map(result => result.reason)
    if (errors.length > 0) throw errors
  }

  function clearValidation(field?: string | string[]): void {
    if (!field) {
      formRef.value?.restoreValidation()
      return
    }
    const fields = Array.isArray(field) ? field : [field]
    fields.forEach(fieldName =>
      formItemRefs.get(fieldName)?.restoreValidation()
    )
  }

  async function validateByFilter(
    filter: (option: FormOption) => boolean
  ): Promise<boolean> {
    const fields = visibleOptions.value
      .filter(filter)
      .map(option => option.prop)
    if (fields.length === 0) return true
    try {
      await validateField(fields)
      return true
    } catch {
      return false
    }
  }

  function validateStep(step: number | string): Promise<boolean> {
    const stepKey =
      typeof step === 'string' ? step : config.value.steps?.steps?.[step]?.key
    if (!stepKey) return Promise.resolve(true)
    return validateByFilter(option => option.layout?.step === stepKey)
  }

  function validateTab(tabKey: string): Promise<boolean> {
    return validateByFilter(option => option.layout?.tab === tabKey)
  }

  function validateDynamicFields(): Promise<boolean> {
    return validateByFilter(option => Boolean(option.layout?.dynamic))
  }

  function validateCustomGroup(groupKey: string): Promise<boolean> {
    return validateByFilter(option => option.layout?.group === groupKey)
  }

  function setFields(fields: FormModel): void {
    Object.entries(cloneFormValue(fields)).forEach(([field, value]) => {
      setDataPath(formModel, field, value)
    })
    handleFieldsChanged(Object.keys(fields))
  }

  function resetFields(): void {
    const previous = getModel()
    replaceFormRecord(formModel, getCleanModel())
    clearValidation()
    handleFieldsChanged(changedModelFields(previous), false)
    notify('info', config.value.resetSuccessText)
  }

  async function setFieldValue(
    field: string,
    value: unknown,
    shouldValidate = false
  ): Promise<void> {
    setDataPath(formModel, field, cloneFormValue(value))
    handleFieldChange(field)
    if (shouldValidate) await validateField(field)
  }

  function getFieldValue(field: string): unknown {
    return cloneFormValue(getDataPath(formModel, field))
  }

  async function setFieldsValue(
    fields: FormModel,
    shouldValidate = false
  ): Promise<void> {
    setFields(fields)
    if (shouldValidate) await validateField(Object.keys(fields))
  }

  /** 实例提交与默认操作按钮遵守相同的可用状态。 */
  function isSubmissionBlocked(): boolean {
    return (
      disposed ||
      validationReady?.value === false ||
      isSubmitting.value ||
      config.value.disabled ||
      config.value.readonly
    )
  }

  function canSubmitValidatedSnapshot(
    controller: AbortController,
    snapshot: FormModel,
    form: FormInst | null
  ): form is FormInst {
    return (
      !disposed &&
      !controller.signal.aborted &&
      validationReady?.value !== false &&
      !config.value.disabled &&
      !config.value.readonly &&
      form !== null &&
      formRef.value === form &&
      isFormValueEqual(formModel, snapshot)
    )
  }

  async function submit(): Promise<boolean> {
    if (isSubmissionBlocked()) return false
    const snapshot = getModel()
    const validatedForm = formRef.value
    const controller = new AbortController()
    submitController = controller
    isSubmitting.value = true
    try {
      await validate()
      if (!canSubmitValidatedSnapshot(controller, snapshot, validatedForm))
        return false
      const payload = { model: snapshot, form: validatedForm }
      try {
        await config.value.onSubmit?.(payload, { signal: controller.signal })
      } catch (error) {
        if (!controller.signal.aborted) reportError(error, 'submit')
        return false
      }
      if (controller.signal.aborted) return false
      emit('submit', payload)
      notify('success', config.value.submitSuccessText)
      return true
    } catch {
      return false
    } finally {
      if (submitController === controller) submitController = undefined
      isSubmitting.value = false
    }
  }

  function initialize(): void {
    reconcileOptions(true)
    const initialSource =
      externalModel?.value ??
      (config.value.mode === 'edit' ? config.value.initialValues : undefined)
    if (initialSource) applyExternalModel(initialSource)
    void nextTick(markAsClean)
  }

  watch(
    options,
    () => {
      const firstRun = !initialized
      if (firstRun) suppressNextEmit()
      reconcileOptions(firstRun)
      initialized = true
    },
    { deep: true, immediate: true }
  )

  if (externalModel) {
    watch(
      externalModel,
      model => {
        if (model !== undefined && !isFormValueEqual(formModel, model)) {
          applyExternalModel(model)
        }
      },
      { deep: true, immediate: true }
    )
  }

  watch(
    () => [config.value.mode, config.value.initialValues] as const,
    ([mode, initialValues]) => {
      if (
        externalModel?.value !== undefined ||
        mode !== 'edit' ||
        !initialValues
      ) {
        return
      }
      applyExternalModel(initialValues)
      void nextTick(markAsClean)
    },
    { deep: true }
  )

  watch(
    formModel,
    model => {
      if (!suppressModelEmit) emit('update:modelValue', cloneFormValue(model))
    },
    { deep: true, flush: 'post' }
  )

  onScopeDispose(() => {
    disposed = true
    submitController?.abort()
    requestControllers.forEach(controller => controller.abort())
    requestControllers.clear()
    scheduledOptionLoads.clear()
    formItemRefs.clear()
  })

  return {
    formModel,
    formRules,
    visibleOptions,
    initialize,
    handleFieldChange,
    setFormItemRef,
    validate,
    validateField,
    validateStep,
    validateTab,
    validateDynamicFields,
    validateCustomGroup,
    clearValidation,
    getModel,
    setFields,
    resetFields,
    setFieldValue,
    getFieldValue,
    setFieldsValue,
    submit,
    handleSubmit: submit,
    handleReset: resetFields,
    isSubmitting,
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
    asyncOptionsCache,
    asyncLoadingMap,
    asyncErrorMap,
    reloadOptions,
  }
}
