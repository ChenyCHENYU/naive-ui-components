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
import type {
  FormInst,
  FormItemInst,
  FormItemRule,
  FormRules,
} from 'naive-ui/es/form'
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
  externalModel?: ComputedRef<FormModel | undefined>
) {
  const formModel = reactive<FormModel>({})
  const formRules = reactive<FormRules>({})
  const formItemRefs = new Map<string, FormItemInst>()

  const asyncOptionsCache = ref<Record<string, OptionItem[]>>({})
  const asyncLoadingMap = ref<Record<string, boolean>>({})
  const asyncErrorMap = ref<Record<string, unknown>>({})
  const isSubmitting = ref(false)

  const requestVersions = new Map<string, number>()
  const requestControllers = new Map<string, AbortController>()
  const asyncOptionLoaders = new Map<string, FormOption['asyncOptions']>()
  let previousOptionProps = new Set<string>()
  let initialized = false
  let suppressModelEmit = false
  let suppressionVersion = 0

  const {
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
    getCleanModel,
  } = useFormDirty(formModel)

  function reportError(
    error: unknown,
    source: Parameters<NonNullable<ResolvedFormConfig['onError']>>[1]['source'],
    field?: string
  ): void {
    config.value.onError?.(error, { source, field })
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
    const model: FormModel = {}
    options.value.forEach(item => {
      model[item.prop] = getDefaultValue(item)
    })
    if (source) Object.assign(model, cloneFormValue(source))
    return model
  }

  function syncRulesForField(item: FormOption): void {
    try {
      const rules: FormItemRule[] = item.rulesWhen
        ? [...item.rulesWhen(formModel)]
        : [...(item.rules ?? [])]

      if (item.required && !rules.some(rule => rule.required)) {
        rules.unshift({
          required: true,
          message: `${item.label || item.prop}不能为空`,
          trigger: ['input', 'change', 'blur'],
        })
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
      delete asyncOptionsCache.value[prop]
      delete asyncLoadingMap.value[prop]
      delete asyncErrorMap.value[prop]
      requestControllers.get(prop)?.abort()
      requestControllers.delete(prop)
      requestVersions.delete(prop)
      asyncOptionLoaders.delete(prop)
      if (!config.value.preserveRemovedFields) delete formModel[prop]
    })
  }

  function reconcileOptions(markClean = false): void {
    try {
      ensureValidOptions(options.value)
      const nextProps = new Set(options.value.map(item => item.prop))
      cleanupRemovedFields(nextProps)

      options.value.forEach(item => {
        if (!Object.prototype.hasOwnProperty.call(formModel, item.prop)) {
          formModel[item.prop] = getDefaultValue(item)
        }
        syncRulesForField(item)
        if (
          item.asyncOptions &&
          asyncOptionLoaders.get(item.prop) !== item.asyncOptions
        ) {
          asyncOptionLoaders.set(item.prop, item.asyncOptions)
          void nextTick(() => loadAsyncOptions(item, 'initialize'))
        }
      })

      previousOptionProps = nextProps
      if (markClean) void nextTick(markAsClean)
    } catch (error) {
      reportError(error, 'initialize')
      throw error
    }
  }

  function applyExternalModel(model: FormModel): void {
    suppressNextEmit()
    replaceFormRecord(formModel, createConfiguredModel(model))
    refreshDynamicRules()
  }

  function isStaleRequest(
    field: string,
    version: number,
    controller: AbortController
  ): boolean {
    return controller.signal.aborted || requestVersions.get(field) !== version
  }

  async function loadAsyncOptions(
    item: FormOption,
    reason: AsyncOptionsContext['reason']
  ): Promise<void> {
    if (!item.asyncOptions) return

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
      if (requestVersions.get(prop) === version) {
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
    await Promise.all(targets.map(item => loadAsyncOptions(item, 'manual')))
  }

  function applyValueWhen(): void {
    const derivedItems = options.value.filter(item => item.valueWhen)
    if (derivedItems.length === 0) return

    for (let pass = 0; pass <= derivedItems.length; pass += 1) {
      let changed = false
      for (const item of derivedItems) {
        try {
          const nextValue = item.valueWhen?.(formModel)
          if (
            nextValue !== undefined &&
            !isFormValueEqual(formModel[item.prop], nextValue)
          ) {
            formModel[item.prop] = cloneFormValue(nextValue)
            changed = true
          }
        } catch (error) {
          reportError(error, 'callback', item.prop)
        }
      }
      if (!changed) return
    }

    reportError(
      new Error('[C_Form] valueWhen 存在循环依赖，已停止继续计算'),
      'callback'
    )
  }

  function dependentAsyncItems(fields: readonly string[]): FormOption[] {
    const changedFields = new Set(fields)
    return options.value.filter(item => {
      if (!item.asyncOptions || !item.dependsOn) return false
      const dependencies = Array.isArray(item.dependsOn)
        ? item.dependsOn
        : [item.dependsOn]
      return dependencies.some(field => changedFields.has(field))
    })
  }

  function handleFieldsChanged(fields: readonly string[]): void {
    applyValueWhen()
    refreshDynamicRules()
    dependentAsyncItems(fields).forEach(item => {
      void loadAsyncOptions(item, 'dependency')
    })

    if (config.value.validateOnChange) {
      void nextTick(() => {
        void validateField([...fields]).catch(() => undefined)
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
    if (!formRef.value) throw new Error('[C_Form] 表单引用不存在')
    try {
      await formRef.value.validate()
      emit('validate-success', getModel())
    } catch (errors) {
      emit('validate-error', errors)
      throw errors
    }
  }

  async function validateField(field: string | string[]): Promise<void> {
    if (!formRef.value) throw new Error('[C_Form] 表单引用不存在')

    const fields = [...new Set(Array.isArray(field) ? field : [field])]
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
    const fields = options.value.filter(filter).map(option => option.prop)
    if (fields.length === 0) return true
    try {
      await validateField(fields)
      return true
    } catch {
      return false
    }
  }

  function validateStep(stepIndex: number): Promise<boolean> {
    const stepKey = config.value.steps?.steps?.[stepIndex]?.key
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
      formModel[field] = value
    })
    handleFieldsChanged(Object.keys(fields))
  }

  function resetFields(): void {
    replaceFormRecord(formModel, getCleanModel())
    clearValidation()
    refreshDynamicRules()
  }

  async function setFieldValue(
    field: string,
    value: unknown,
    shouldValidate = false
  ): Promise<void> {
    formModel[field] = cloneFormValue(value)
    handleFieldChange(field)
    if (shouldValidate) await validateField(field)
  }

  function getFieldValue(field: string): unknown {
    return cloneFormValue(formModel[field])
  }

  async function setFieldsValue(
    fields: FormModel,
    shouldValidate = false
  ): Promise<void> {
    setFields(fields)
    if (shouldValidate) await validateField(Object.keys(fields))
  }

  async function submit(): Promise<boolean> {
    if (isSubmitting.value) return false
    isSubmitting.value = true
    try {
      await validate()
      const payload = { model: getModel(), form: formRef.value! }
      try {
        await config.value.onSubmit?.(payload)
      } catch (error) {
        reportError(error, 'submit')
        return false
      }
      emit('submit', payload)
      return true
    } catch {
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  function initialize(): void {
    reconcileOptions(true)
    const initialSource =
      externalModel?.value ??
      (config.value.mode === 'edit' ? config.value.initialValues : undefined)
    if (initialSource) applyExternalModel(initialSource)
    applyValueWhen()
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
    requestControllers.forEach(controller => controller.abort())
    requestControllers.clear()
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
