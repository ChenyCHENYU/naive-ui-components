export { default as C_Form } from './index.vue'

/* 导出类型定义 */
export type {
  FormOption,
  FormModel,
  FormInstance,
  FormActionSlotProps,
  FormTabActionsSlotProps,
  FormStepActionsSlotProps,
  FormSlots,
  FormMode,
  LayoutType,
  LayoutConfig,
  LabelPlacement,
  ComponentType,
  OptionItem,
  AsyncOptionsContext,
  FormErrorContext,
  FormRecord,
  FieldPath,
  FieldPathValue,
  MaybePromise,
  SubmitEventPayload,
  GridLayoutConfig,
  TabsLayoutConfig,
  StepsLayoutConfig,
  DynamicFormConfig,
  DynamicFieldConfig,
  DynamicFormState,
  DynamicFormController,
  CardLayoutConfig,
  InlineLayoutConfig,
  CustomLayoutConfig,
} from './types'

export { defineFormConfig, defineFormOptions, useCForm } from './helpers'
export type { UseCFormOptions } from './helpers'

/* 导出 Composables */
export {
  resolveFormConfig,
  mergeFormConfig,
  useFormGlobalConfig,
  FORM_GLOBAL_CONFIG_KEY,
  shouldShowActions,
  FORM_DEFAULTS,
  LAYOUTS_WITH_OWN_CONTROLS,
} from './composables/useFormConfig'
export type {
  FormConfig,
  ResolvedFormConfig,
  LayoutCallbacks,
} from './composables/useFormConfig'

export { useFormState } from './composables/useFormState'
export {
  useFormRenderer,
  registerRenderer,
  unregisterRenderer,
} from './composables/useFormRenderer'
export type {
  ComponentMap,
  FormRenderer,
  FormRendererContext,
  RendererProps,
  UseFormRendererOptions,
} from './composables/useFormRenderer'

export { useFormDirty } from './composables/useFormDirty'
export type { UseFormDirtyReturn } from './composables/useFormDirty'

export {
  useDynamicFormState,
  DYNAMIC_FORM_STATE_KEY,
  FIELD_TYPE_OPTIONS,
} from './composables/useDynamicFormState'
export type { DynamicFormStateType } from './composables/useDynamicFormState'
