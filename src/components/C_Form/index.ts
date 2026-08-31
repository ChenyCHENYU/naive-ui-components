export { default as C_Form } from './index.vue'

/* 导出类型定义 */
export type {
  FormOption,
  FormModel,
  FormInstance,
  FormMode,
  LayoutType,
  LayoutConfig,
  LabelPlacement,
  ComponentType,
  OptionItem,
  AsyncOptionsContext,
  FormErrorContext,
  FormRecord,
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

/* 导出 Composables */
export {
  resolveFormConfig,
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
