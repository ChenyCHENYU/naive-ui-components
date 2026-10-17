import { defineAsyncComponent, type Component } from 'vue'
import {
  NButton,
  NCheckbox,
  NCheckboxGroup,
  NFormItem,
  NInput,
  NInputNumber,
  NRadio,
  NRadioGroup,
  NSelect,
  NSpace,
  NSwitch,
  NTooltip,
} from 'naive-ui'
import type { ComponentMap } from './composables/useFormRenderer'
import type { LayoutType } from './types'
import DefaultLayout from './layouts/Default/index.vue'
import InlineLayout from './layouts/Inline/index.vue'
import GridLayout from './layouts/Grid/index.vue'

export const SYNCHRONOUS_FORM_LAYOUTS: readonly LayoutType[] = [
  'default',
  'inline',
  'grid',
]

/** Definitions are shared; each async module loads only when its field is used. */
export const FORM_COMPONENTS: ComponentMap = {
  NFormItem,
  NInput,
  NInputNumber,
  NSwitch,
  NSelect,
  NCheckboxGroup,
  NCheckbox,
  NRadioGroup,
  NRadio,
  NButton,
  NSpace,
  NTooltip,
  NSlider: defineAsyncComponent(
    () => import('../../internal/naive-fields/slider')
  ),
  NRate: defineAsyncComponent(() => import('../../internal/naive-fields/rate')),
  NDatePicker: defineAsyncComponent(
    () => import('../../internal/naive-fields/date-picker')
  ),
  NTimePicker: defineAsyncComponent(
    () => import('../../internal/naive-fields/time-picker')
  ),
  NCascader: defineAsyncComponent(
    () => import('../../internal/naive-fields/cascader')
  ),
  NColorPicker: defineAsyncComponent(
    () => import('../../internal/naive-fields/color-picker')
  ),
  NUpload: defineAsyncComponent(
    () => import('../../internal/naive-fields/upload')
  ),
  C_Editor: defineAsyncComponent(() =>
    import('../C_Editor').then(module => module.C_Editor)
  ),
}

export const FORM_LAYOUTS: Record<LayoutType, Component> = {
  default: DefaultLayout,
  inline: InlineLayout,
  grid: GridLayout,
  card: defineAsyncComponent(() => import('./layouts/Card/index.vue')),
  tabs: defineAsyncComponent(() => import('./layouts/Tabs/index.vue')),
  steps: defineAsyncComponent(() => import('./layouts/Steps/index.vue')),
  dynamic: defineAsyncComponent(() => import('./layouts/Dynamic/index.vue')),
  custom: defineAsyncComponent(() => import('./layouts/Custom/index.vue')),
}
