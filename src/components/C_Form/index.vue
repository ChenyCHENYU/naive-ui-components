<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Description: 表单组件 — 薄 UI 壳 + 厚 Composable 引擎
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <NForm
    ref="formRef"
    :model="formModel"
    :rules="formRules"
    :validate-on-rule-change="false"
    :label-placement="resolved.labelPlacement"
    :label-width="resolved.labelWidth"
    :size="resolved.size"
    :disabled="resolved.disabled"
    :readonly="resolved.readonly"
    v-bind="$attrs"
  >
    <!-- 布局组件渲染 -->
    <component
      :is="layoutComponent"
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
    />

    <!-- 表单操作按钮区域（只在特定布局中显示） -->
    <NFormItem
      v-if="showActions"
      style="margin-top: 20px"
    >
      <slot
        name="action"
        :form="formRef"
        :model="formModel"
        :validate="validate"
        :validateField="validateField"
        :reset="resetFields"
        :setFields="setFields"
        :getModel="getModel"
        :clearValidation="clearValidation"
        :submit="submit"
        :reloadOptions="reloadOptions"
        :submitting="isSubmitting"
      >
        <NSpace>
          <NButton
            type="primary"
            :loading="isSubmitting"
            :disabled="isSubmitting"
            @click="handleSubmit"
            >{{ resolved.submitText || t('common.submit') }}</NButton
          >
          <NButton
            :disabled="isSubmitting"
            @click="handleReset"
            >{{ resolved.resetText || t('common.reset') }}</NButton
          >
        </NSpace>
      </slot>
    </NFormItem>
  </NForm>
</template>

<script lang="ts" setup generic="T extends object = FormRecord">
  import {
    computed,
    defineAsyncComponent,
    ref,
    getCurrentInstance,
    type Component,
    type ComputedRef,
  } from 'vue'
  import {
    type FormInst,
    NForm,
    NFormItem,
    NButton,
    NSpace,
    NInput,
    NInputNumber,
    NSwitch,
    NSlider,
    NRate,
    NDatePicker,
    NTimePicker,
    NCascader,
    NColorPicker,
    NSelect,
    NCheckboxGroup,
    NCheckbox,
    NRadioGroup,
    NRadio,
    NUpload,
    NTooltip,
  } from 'naive-ui'
  import { useComponentLocale } from '../../config'
  import type {
    FormOption,
    LayoutType,
    LayoutConfig,
    SubmitEventPayload,
    FormModel,
    FormRecord,
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
    type ComponentMap,
    type FormRenderer,
  } from './composables/useFormRenderer'

  /* ===== 布局组件静态映射（取代 DynamicComponent） ===== */
  import DefaultLayout from './layouts/Default/index.vue'
  import InlineLayout from './layouts/Inline/index.vue'
  import GridLayout from './layouts/Grid/index.vue'
  import CardLayout from './layouts/Card/index.vue'
  import TabsLayout from './layouts/Tabs/index.vue'
  import StepsLayout from './layouts/Steps/index.vue'
  import DynamicLayout from './layouts/Dynamic/index.vue'
  import CustomLayout from './layouts/Custom/index.vue'

  defineOptions({ name: 'C_Form' })

  const C_Editor = defineAsyncComponent(() =>
    import('../C_Editor').then(module => module.C_Editor)
  )

  const LAYOUT_MAP: Record<LayoutType, Component> = {
    default: DefaultLayout,
    inline: InlineLayout,
    grid: GridLayout,
    card: CardLayout,
    tabs: TabsLayout,
    steps: StepsLayout,
    dynamic: DynamicLayout,
    custom: CustomLayout,
  } as const

  /* ===== Naive UI 组件映射 ===== */
  /*
   * 库代码是预构建产物，resolveComponent 无法在运行时解析未全局注册的组件。
   * 直接 import 即可。naive-ui 作为 peerDependency，与消费项目共享同一份实例。
   */
  const COMPONENT_MAP: ComponentMap = {
    NFormItem,
    NInput,
    NInputNumber,
    NSwitch,
    NSlider,
    NRate,
    NDatePicker,
    NTimePicker,
    NCascader,
    NColorPicker,
    NSelect,
    NCheckboxGroup,
    NCheckbox,
    NRadioGroup,
    NRadio,
    NUpload,
    NButton,
    NSpace,
    NTooltip,
    C_Editor,
  } as ComponentMap

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

  /* ================= 配置解析 ================= */

  const globalConfig = useFormGlobalConfig()
  const resolved = computed(() =>
    resolveFormConfig(
      mergeFormConfig(props.config as unknown as FormConfig, globalConfig)
    )
  )
  const { t } = useComponentLocale(() => resolved.value.locale)

  /* ================= 响应式状态 ================= */

  const formRef = ref<FormInst | null>(null)
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
    modelValueRef as ComputedRef<FormModel | undefined>
  )

  /* ===== 渲染引擎 ===== */
  const currentInstance = getCurrentInstance()
  const { formItems } = useFormRenderer({
    formModel,
    visibleOptions,
    config: resolved,
    handleFieldChange,
    componentMap: COMPONENT_MAP,
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
    () => LAYOUT_MAP[resolved.value.layout] || LAYOUT_MAP.default
  )

  const mergedLayoutConfig = computed<LayoutConfig>(() => ({
    type: resolved.value.layout,
    grid: resolved.value.grid,
    inline: resolved.value.inline,
    card: resolved.value.card,
    tabs: resolved.value.tabs,
    steps: resolved.value.steps,
    dynamic: resolved.value.dynamic,
    custom: resolved.value.custom,
  }))

  const showActions = computed(() => calcShowActions(resolved.value))

  const layoutRuntimeProps = computed(() =>
    resolved.value.layout === 'steps'
      ? {
          beforeStepChange: handleStepBeforeChange,
          validateStep: handleStepValidate,
        }
      : resolved.value.layout === 'tabs'
        ? {
            beforeTabChange: handleTabBeforeChange,
            validateTab: handleTabValidate,
          }
        : {}
  )

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

  const handleStepValidate = async (stepIndex: number): Promise<boolean> => {
    try {
      const valid = await validateStep(stepIndex)
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
