/*
 * @Description: C_Form 状态引擎 Composable — 表单数据、校验规则、验证 API、脏检查、联动
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  reactive,
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  type ComputedRef,
  type Ref,
} from 'vue'
import type { FormInst, FormRules } from 'naive-ui/es/form'
import { mergeRules } from '@robot-admin/form-validate'
import type {
  FormOption,
  FormModel,
  ComponentType,
  SubmitEventPayload,
  OptionItem,
} from '../types'
import type { ResolvedFormConfig } from './useFormConfig'
import { useFormDirty } from './useFormDirty'

/* =================== 默认值映射 =================== */

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
  checkbox: null,
  upload: [],
  radio: '',
  inputNumber: null,
  slider: null,
  rate: null,
  switch: null,
} as const

const getDefaultValue = (type: ComponentType): unknown => {
  return DEFAULT_VALUES[type] ?? null
}

/* =================== Composable =================== */

/**
 * C_Form 状态引擎 — 管理表单数据模型、校验规则、验证 API、字段操作、脏检查、联动
 */
export function useFormState(
  options: ComputedRef<FormOption[]>,
  config: ComputedRef<ResolvedFormConfig>,
  formRef: Ref<FormInst | null>,
  emit: {
    (e: 'update:modelValue', model: FormModel): void
    (e: 'validate-success', model: FormModel): void
    (e: 'validate-error', errors: unknown): void
    (e: 'submit', payload: SubmitEventPayload): void
  }
) {
  /* ===== 响应式状态 ===== */
  const formModel = reactive<FormModel>({})
  const formRules = reactive<FormRules>({})

  /** 异步选项缓存：prop → OptionItem[] */
  const asyncOptionsCache = ref<Record<string, OptionItem[]>>({})
  /** 异步选项 loading 状态：prop → boolean */
  const asyncLoadingMap = ref<Record<string, boolean>>({})

  /* ===== 脏检查引擎 ===== */
  const { isDirty, getChangedFields, isFieldDirty, markAsClean } =
    useFormDirty(formModel)

  /* ===== 可见字段 ===== */
  const visibleOptions = computed(() =>
    options.value.filter(item => {
      if (item.show === false) return false
      if (item.showWhen) return item.showWhen(formModel)
      return true
    })
  )

  /* ===== 初始化 ===== */
  const initialize = (): void => {
    try {
      Object.keys(formRules).forEach(key => delete formRules[key])

      options.value.forEach(item => {
        if (!(item.prop in formModel)) {
          formModel[item.prop] =
            item.value !== undefined
              ? item.value
              : getDefaultValue(item.type as ComponentType)
        }

        syncRulesForField(item)
      })

      /* 初始化结束后保存干净快照 */
      nextTick(() => markAsClean())

      /* 加载所有异步选项 */
      loadAllAsyncOptions()
    } catch (error) {
      console.error('[C_Form] 初始化失败:', error)
    }
  }

  /* ===== 校验规则同步 ===== */

  /**
   * 同步单个字段的校验规则（支持静态 rules + 动态 rulesWhen + crossFieldValidator）
   */
  function syncRulesForField(item: FormOption): void {
    const staticRules = item.rulesWhen
      ? item.rulesWhen(formModel)
      : (item.rules ?? [])

    const allRules = [...staticRules]

    /* 跨字段校验转化为 naive-ui validator */
    if (item.crossFieldValidator) {
      const crossFn = item.crossFieldValidator
      allRules.push({
        validator: () => {
          const errMsg = crossFn(formModel)
          return errMsg ? Promise.reject(new Error(errMsg)) : Promise.resolve()
        },
        trigger: ['change', 'blur'],
      } as any)
    }

    if (allRules.length === 0) {
      delete formRules[item.prop]
      return
    }

    const allHaveValidator = allRules.every(
      r => typeof (r as Record<string, unknown>).validator === 'function'
    )
    formRules[item.prop] = allHaveValidator ? mergeRules(allRules) : allRules
  }

  /**
   * 刷新所有字段的动态规则（当 formModel 变化时调用）
   */
  function refreshDynamicRules(): void {
    const itemsWithDynamicRules = options.value.filter(
      item => item.rulesWhen || item.crossFieldValidator
    )
    for (const item of itemsWithDynamicRules) {
      syncRulesForField(item)
    }
  }

  /* ===== 异步选项加载 ===== */

  /** 加载单个字段的异步选项数据 */
  async function loadAsyncOptions(item: FormOption): Promise<void> {
    if (!item.asyncOptions) return
    const { prop } = item
    asyncLoadingMap.value[prop] = true
    try {
      const result = await item.asyncOptions(formModel)
      asyncOptionsCache.value[prop] = result
    } catch (error) {
      console.warn(`[C_Form] asyncOptions 加载失败 (${prop}):`, error)
      asyncOptionsCache.value[prop] = []
    } finally {
      asyncLoadingMap.value[prop] = false
    }
  }

  /** 加载所有带 asyncOptions 的字段选项 */
  function loadAllAsyncOptions(): void {
    options.value
      .filter(item => item.asyncOptions)
      .forEach(item => loadAsyncOptions(item))
  }

  /* ===== 联动赋值引擎 ===== */

  /** 执行联动赋值 — 根据 valueWhen 计算并写入对应字段值 */
  function applyValueWhen(): void {
    const itemsWithValueWhen = options.value.filter(item => item.valueWhen)
    for (const item of itemsWithValueWhen) {
      const computed = item.valueWhen!(formModel)
      if (computed !== undefined && formModel[item.prop] !== computed) {
        formModel[item.prop] = computed
      }
    }
  }

  /* ===== 字段变化处理 ===== */
  const handleFieldChange = (field: string): void => {
    /* 联动赋值 */
    applyValueWhen()

    /* 刷新动态规则 */
    refreshDynamicRules()

    /* 触发依赖本字段的异步选项重载 */
    options.value
      .filter(item => {
        if (!item.asyncOptions) return false
        const deps = item.dependsOn
        if (!deps) return false
        return Array.isArray(deps) ? deps.includes(field) : deps === field
      })
      .forEach(item => loadAsyncOptions(item))

    /* 变化时校验 */
    if (config.value.validateOnChange) {
      nextTick(() => {
        validateField(field).catch(() => {})
      })
    }
  }

  /* ===== 验证 API ===== */
  const validate = async (): Promise<void> => {
    if (!formRef.value) {
      throw new Error('[C_Form] 表单引用不存在')
    }

    try {
      await formRef.value.validate()
      emit('validate-success', getModel())
    } catch (errors) {
      emit('validate-error', errors)
      throw errors
    }
  }

  const validateField = async (field: string | string[]): Promise<void> => {
    if (!formRef.value) {
      throw new Error('[C_Form] 表单引用不存在')
    }

    const fields = Array.isArray(field) ? field : [field]

    try {
      await formRef.value.validate()
    } catch (allErrors: unknown) {
      if (!Array.isArray(allErrors)) throw allErrors

      const targetErrors = allErrors.filter((errorGroup: unknown[]) =>
        errorGroup?.some(err => {
          const e = err as Record<string, unknown>
          return typeof e.field === 'string' && fields.includes(e.field)
        })
      )

      if (targetErrors.length > 0) {
        throw targetErrors
      }
    }
  }

  const clearValidation = (field?: string | string[]): void => {
    if (!formRef.value) return

    if (field) {
      const fields = Array.isArray(field) ? field : [field]
      fields.forEach(fieldName => {
        if (formModel[fieldName] !== undefined) {
          const currentValue = formModel[fieldName]
          formModel[fieldName] = currentValue
        }
      })
    } else {
      formRef.value.restoreValidation()
    }
  }

  const validateByFilter = async (
    filterFn: (option: FormOption) => boolean,
    context: string
  ): Promise<boolean> => {
    try {
      const fields = options.value.filter(filterFn).map(option => option.prop)
      if (fields.length === 0) return true
      await validateField(fields)
      return true
    } catch (error) {
      console.warn(`[C_Form] ${context}验证失败:`, error)
      return false
    }
  }

  const validateStep = async (stepIndex: number): Promise<boolean> => {
    const stepKey = config.value.steps?.steps?.[stepIndex]?.key
    if (!stepKey) return true
    return validateByFilter(
      option => option.layout?.step === stepKey,
      `步骤 ${stepIndex} `
    )
  }

  const validateTab = async (tabKey: string): Promise<boolean> => {
    return validateByFilter(
      option => option.layout?.tab === tabKey,
      `标签页 ${tabKey} `
    )
  }

  const validateDynamicFields = async (): Promise<boolean> => {
    return validateByFilter(
      option => Boolean(option.layout?.dynamic),
      '动态字段 '
    )
  }

  const validateCustomGroup = async (groupKey: string): Promise<boolean> => {
    return validateByFilter(
      option => option.layout?.group === groupKey,
      `自定义分组 ${groupKey} `
    )
  }

  /* ===== 数据 API ===== */
  const getModel = (): FormModel => ({ ...formModel })

  const setFields = (fields: FormModel): void => {
    Object.assign(formModel, fields)
  }

  const resetFields = (): void => {
    try {
      clearValidation()

      options.value.forEach(item => {
        const defaultValue =
          item.value !== undefined
            ? item.value
            : getDefaultValue(item.type as ComponentType)

        formModel[item.prop] = defaultValue
      })

      nextTick(() => markAsClean())
    } catch (error) {
      console.error('[C_Form] 重置表单失败:', error)
    }
  }

  const setFieldValue = async (
    field: string,
    value: unknown,
    shouldValidate: boolean = false
  ): Promise<void> => {
    formModel[field] = value
    if (shouldValidate) {
      await validateField(field)
    }
  }

  const getFieldValue = (field: string): unknown => formModel[field]

  const setFieldsValue = async (
    fields: FormModel,
    shouldValidate: boolean = false
  ): Promise<void> => {
    Object.assign(formModel, fields)
    if (shouldValidate) {
      await validate()
    }
  }

  /* ===== 提交 & 重置 ===== */
  const handleSubmit = async (): Promise<void> => {
    try {
      await validate()
      emit('submit', { model: getModel(), form: formRef.value! })
    } catch (error) {
      console.warn('[C_Form] 表单验证失败:', error)
    }
  }

  /* ===== 生命周期 ===== */
  onMounted(() => {
    initialize()

    watch(
      () => options.value,
      () => initialize(),
      { deep: true }
    )

    watch(
      () => formModel,
      val => emit('update:modelValue', { ...val }),
      { deep: true }
    )
  })

  return {
    formModel,
    formRules,
    visibleOptions,
    initialize,
    handleFieldChange,
    /* 验证 API */
    validate,
    validateField,
    validateStep,
    validateTab,
    validateDynamicFields,
    validateCustomGroup,
    clearValidation,
    /* 数据 API */
    getModel,
    setFields,
    resetFields,
    setFieldValue,
    getFieldValue,
    setFieldsValue,
    /* 操作 */
    handleSubmit,
    handleReset: resetFields,
    /* v0.8.0 新增 */
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
    asyncOptionsCache,
    asyncLoadingMap,
  }
}
