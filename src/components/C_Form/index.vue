<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Description: 表单组件 — 薄 UI 壳 + 厚 Composable 引擎
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <NForm
    ref="formRef"
    class="c-form"
    :class="densityEnabled && `c-form--${resolved.density}`"
    :style="densityStyle"
    :model="formModel"
    :rules="formRules"
    :validate-on-rule-change="false"
    :label-placement="resolved.labelPlacement"
    :label-width="resolved.labelWidth"
    :size="resolved.size"
    :disabled="resolved.disabled"
    :readonly="resolved.readonly"
    v-bind="$attrs"
    @submit.prevent="submit"
  >
    <!-- 布局组件渲染 -->
    <component
      :is="layoutComponent"
      :key="resolved.layout"
      :form-items="formItems"
      :layout-config="mergedLayoutConfig"
      :options="visibleOptions"
      :form-data="formModel"
      v-bind="layoutRuntimeProps"
      @tab-change="
        (tabKey: string, tabIndex: number) =>
          handleLayoutEvent('onTabChange', tabKey, tabIndex)
      "
      @step-change="handleStepChange"
      @field-add="handleLayoutEvent('onFieldAdd', $event)"
      @field-remove="handleLayoutEvent('onFieldRemove', $event)"
      @field-toggle="
        (id: string, visible: boolean) =>
          handleLayoutEvent('onFieldToggle', id, visible)
      "
      @fields-clear="handleLayoutEvent('onFieldsClear')"
      @render-mode-change="handleLayoutEvent('onRenderModeChange', $event)"
      @group-toggle="
        (key: string, collapsed: boolean) =>
          handleLayoutEvent('onGroupToggle', key, collapsed)
      "
      @group-reset="handleLayoutEvent('onGroupReset', $event)"
      @validate-success="forwardValidateSuccess"
      @validate-error="forwardValidateError"
      @fields-change="handleFieldsChange"
    >
      <template
        v-for="slotName in getForwardedSlotNames()"
        #[slotName]="slotProps"
      >
        <slot
          :name="slotName"
          v-bind="slotProps"
        />
      </template>
      <template #step-actions="slotProps">
        <slot
          name="step-actions"
          v-bind="slotProps"
          :submit="submit"
          :submitting="isSubmitting"
        >
          <NButton
            v-if="slotProps.isLastStep && resolved.showActions"
            type="primary"
            :size="resolved.size"
            :loading="isSubmitting || !validationReady"
            :disabled="
              !validationReady ||
              isSubmitting ||
              resolved.disabled ||
              resolved.readonly
            "
            @click="submit"
            >{{ resolved.submitText || t('common.submit') }}</NButton
          >
        </slot>
      </template>
    </component>

    <!-- 表单操作按钮区域（只在特定布局中显示） -->
    <NFormItem
      v-if="showActions"
      class="c-form-actions"
    >
      <slot
        name="action"
        v-bind="actionSlotProps"
      >
        <NSpace
          justify="end"
          :size="densityEnabled ? densityTokens.gap : undefined"
          style="width: 100%"
        >
          <NButton
            :size="resolved.size"
            :disabled="
              !validationReady ||
              isSubmitting ||
              resolved.disabled ||
              resolved.readonly
            "
            @click="handleReset"
            >{{ resolved.resetText || t('common.reset') }}</NButton
          >
          <slot
            name="action-extra"
            v-bind="actionSlotProps"
          />
          <NButton
            type="primary"
            :size="resolved.size"
            :loading="isSubmitting || !validationReady"
            :disabled="
              !validationReady ||
              isSubmitting ||
              resolved.disabled ||
              resolved.readonly
            "
            @click="handleSubmit"
            >{{ resolved.submitText || t('common.submit') }}</NButton
          >
        </NSpace>
      </slot>
    </NFormItem>
  </NForm>
</template>

<script lang="ts" setup generic="T extends object = FormRecord">
  import {
    computed,
    ref,
    getCurrentInstance,
    useAttrs,
    type ComputedRef,
    type CSSProperties,
    type Ref,
  } from 'vue'
  import { type FormInst, NForm, NFormItem, NButton, NSpace } from 'naive-ui'
  import { useComponentLocale } from '../../config'
  import { resolveComponentDensity } from '../../core/density'
  import type {
    FormOption,
    LayoutType,
    LayoutConfig,
    SubmitEventPayload,
    FormSlots,
    FormModel,
    FormRecord,
    FormActionSlotProps,
  } from './types'
  import {
    type FormConfig,
    type LayoutCallbacks,
    mergeFormConfig,
    resolveFormConfig,
    shouldShowActions as calcShowActions,
    useFormGlobalConfig,
  } from './composables/useFormConfig'
  import { useFormState } from './composables/useFormState'
  import {
    useFormRenderer,
    type FormRenderer,
  } from './composables/useFormRenderer'

  import {
    FORM_COMPONENTS,
    FORM_LAYOUTS,
    SYNCHRONOUS_FORM_LAYOUTS,
  } from './rendering'

  defineOptions({ name: 'C_Form' })

  /* ================= 组件属性定义 ================= */

  const props = withDefaults(
    defineProps<{
      /** 字段配置数组 */
      options: FormOption<T>[]
      /** 双向绑定表单数据 */
      modelValue?: FormModel<T>
      /** 统一配置对象（收拢原先 13 个分散 Props） */
      config?: FormConfig<T>
      /** 当前表单实例的自定义渲染器，不污染全局注册表 */
      renderers?: Record<string, FormRenderer>
    }>(),
    {
      config: () => ({}) as FormConfig<T>,
    }
  )

  /* ================= 组件事件定义（从 16 个精简到 4 个） ================= */

  const emit = defineEmits<{
    submit: [payload: SubmitEventPayload<T>]
    'update:modelValue': [model: FormModel<T>]
    'validate-success': [model: FormModel<T>]
    'validate-error': [errors: unknown]
  }>()

  defineSlots<FormSlots<T>>()

  /* ================= 配置解析 ================= */

  const globalConfig = useFormGlobalConfig()
  const nativeAttrs = useAttrs()
  const mergedConfig = computed(() =>
    mergeFormConfig(props.config as unknown as FormConfig, globalConfig)
  )
  const resolved = computed(() => {
    // NForm 的原生 attrs 一直最后透传，尺寸同时同步给字段和操作按钮。
    const { size } = nativeAttrs
    return resolveFormConfig({
      ...mergedConfig.value,
      ...(size === 'small' || size === 'medium' || size === 'large'
        ? { size }
        : {}),
    })
  })
  const densityEnabled = computed(
    () => mergedConfig.value.density !== undefined
  )
  const densityTokens = computed(() =>
    resolveComponentDensity(resolved.value.density)
  )
  const densityStyle = computed<CSSProperties | undefined>(() => {
    if (!densityEnabled.value) return undefined
    const { gap, rowGap, padding, formItemGap } = densityTokens.value
    return {
      '--c-form-gap': `${gap}px`,
      '--c-form-row-gap': `${rowGap}px`,
      '--c-form-padding': `${padding}px`,
      '--c-form-item-gap': `${formItemGap}px`,
    }
  })
  const { t } = useComponentLocale(() => resolved.value.locale)

  /* ================= 响应式状态 ================= */

  const formRef: Ref<FormInst | null> = ref<FormInst | null>(null)
  const mountedLayout = ref<LayoutType | null>(null)
  const validationReady = computed(
    () =>
      SYNCHRONOUS_FORM_LAYOUTS.includes(resolved.value.layout) ||
      mountedLayout.value === resolved.value.layout
  )
  const optionsRef = computed(() => props.options as unknown as FormOption[])
  const modelValueRef = computed(
    () => props.modelValue as unknown as FormModel | undefined
  )

  /* ===== 状态引擎 ===== */
  const {
    formModel,
    formRules,
    visibleOptions,
    initialize,
    handleFieldChange,
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
    handleSubmit,
    handleReset,
    /* v0.8.0 新增 */
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
    asyncOptionsCache,
    asyncLoadingMap,
    asyncErrorMap,
    reloadOptions,
    setFormItemRef,
    isSubmitting,
    submit,
  } = useFormState(
    optionsRef,
    resolved,
    formRef,
    emit as unknown as Parameters<typeof useFormState>[3],
    modelValueRef as ComputedRef<FormModel | undefined>,
    validationReady
  )

  const typedModel = computed(() => formModel.value as FormModel<T>)
  const typedGetModel = (): FormModel<T> => getModel() as FormModel<T>
  const actionSlotProps = computed<FormActionSlotProps<T>>(() => ({
    form: formRef.value,
    model: typedModel.value,
    validate,
    validateField,
    reset: resetFields,
    setFields,
    getModel: typedGetModel,
    clearValidation,
    submit,
    reloadOptions,
    submitting: isSubmitting.value,
  }))

  /* ===== 渲染引擎 ===== */
  const currentInstance = getCurrentInstance()
  /** 操作插槽由外层统一承接，避免动态转发覆盖默认步骤按钮和自定义操作。 */
  const getForwardedSlotNames = (): string[] =>
    Object.keys(currentInstance?.slots ?? {}).filter(
      name => !['action', 'action-extra', 'step-actions'].includes(name)
    )
  const { formItems } = useFormRenderer({
    formModel,
    visibleOptions,
    config: resolved,
    handleFieldChange,
    componentMap: FORM_COMPONENTS,
    instanceSlots: currentInstance?.slots,
    asyncOptionsCache,
    asyncLoadingMap,
    renderers: computed(() => props.renderers),
    setFormItemRef,
    onError: (error, field) =>
      resolved.value.onError?.(error, { source: 'render', field }),
  })

  /* ================= 计算属性 ================= */

  const layoutComponent = computed(
    () => FORM_LAYOUTS[resolved.value.layout] || FORM_LAYOUTS.default
  )

  const mergedLayoutConfig = computed<LayoutConfig>(() => {
    const config = resolved.value
    const layout = {
      type: config.layout,
      grid: config.grid,
      inline: config.inline,
      card: config.card,
      tabs: config.tabs,
      steps: config.steps,
      dynamic: config.dynamic,
      custom: config.custom,
    }
    if (!densityEnabled.value) return layout
    const { gap, rowGap } = densityTokens.value
    return {
      ...layout,
      grid: {
        gutter: gap,
        yGutter: config.grid?.gutter ?? rowGap,
        ...config.grid,
      },
      inline: { gap, rowGap, ...config.inline },
      card: { spacing: gap, ...config.card },
      tabs: { size: config.size, ...config.tabs },
      steps: {
        size: config.size === 'small' ? 'small' : 'medium',
        ...config.steps,
      },
      dynamic: {
        ...config.dynamic,
        grid: { gutter: gap, ...config.dynamic?.grid },
      },
    }
  })

  const showActions = computed(() => calcShowActions(resolved.value))

  const layoutRuntimeProps = computed(() => {
    const { layout } = resolved.value
    const controls =
      layout === 'steps'
        ? {
            beforeStepChange: handleStepBeforeChange,
            validateStep: handleStepValidate,
            submitting: isSubmitting.value,
            disabled: resolved.value.disabled || resolved.value.readonly,
          }
        : layout === 'tabs'
          ? {
              beforeTabChange: handleTabBeforeChange,
              validateTab: handleTabValidate,
            }
          : {}
    return {
      ...controls,
      controlSize: densityEnabled.value ? resolved.value.size : undefined,
      onVnodeMounted: () => {
        mountedLayout.value = layout
      },
    }
  })

  /* ================= 布局事件 → config 回调桥接 ================= */

  /** 通用布局事件桥接 */
  const handleLayoutEvent = (
    callbackName: keyof LayoutCallbacks,
    ...args: unknown[]
  ): void => {
    const callback = resolved.value[callbackName]
    if (typeof callback !== 'function') return
    try {
      const result = (callback as (...values: unknown[]) => unknown)(...args)
      if (result instanceof Promise) {
        void result.catch(error =>
          resolved.value.onError?.(error, { source: 'callback' })
        )
      }
    } catch (error) {
      resolved.value.onError?.(error, { source: 'callback' })
    }
  }

  /** 字段变化事件（保留回调通道） */
  const handleFieldsChange = (fields: FormOption[]): void => {
    resolved.value.onFieldsChange?.(fields)
  }

  /** 将内部标准模型安全桥接回消费端泛型模型。 */
  const forwardValidateSuccess = (model: FormModel): void => {
    emit('validate-success', model as FormModel<T>)
  }

  /** 转发验证错误。 */
  const forwardValidateError = (errors: unknown): void => {
    emit('validate-error', errors)
  }

  const handleTabBeforeChange = async (
    currentTab: string,
    targetTab: string
  ): Promise<boolean> => {
    try {
      const result = await resolved.value.onTabBeforeChange?.(
        currentTab,
        targetTab
      )
      return result !== false
    } catch (error) {
      resolved.value.onError?.(error, { source: 'callback' })
      return false
    }
  }

  const handleTabValidate = async (tabKey: string): Promise<boolean> => {
    const valid = await validateTab(tabKey)
    if (valid) resolved.value.onTabValidate?.(tabKey)
    return valid
  }

  /** Steps 布局事件 — 需要多参数特殊处理 */
  const handleStepChange = (stepIndex: number, stepKey: string): void => {
    resolved.value.onStepChange?.(stepIndex, stepKey)
  }

  const handleStepBeforeChange = async (
    currentStep: number,
    targetStep: number
  ): Promise<boolean> => {
    try {
      const result = await resolved.value.onStepBeforeChange?.(
        currentStep,
        targetStep
      )
      return result !== false
    } catch (error) {
      resolved.value.onError?.(error, { source: 'callback' })
      return false
    }
  }

  const handleStepValidate = async (
    stepIndex: number,
    stepKey: string
  ): Promise<boolean> => {
    try {
      const valid = await validateStep(stepKey)
      if (!valid) return false
      resolved.value.onStepValidate?.(stepIndex)
      return true
    } catch {
      return false
    }
  }

  /* ================= 组件暴露 ================= */

  defineExpose({
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
    formRef,
    formModel,
    initialize,
    layoutType: computed(() => resolved.value.layout),
    shouldShowDefaultActions: showActions,
    /* v0.8.0 脏检查 API */
    isDirty,
    getChangedFields,
    isFieldDirty,
    markAsClean,
    asyncLoadingMap,
    asyncErrorMap,
    reloadOptions,
    isSubmitting,
    submit,
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
