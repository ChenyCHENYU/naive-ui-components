import { createVNode } from 'vue'
import type { FormRenderer } from '../C_Form/composables/useFormRenderer'
import C_DataPicker from './index.vue'
import { isPickerValue } from './data'
import type { DataPickerEmits, DataPickerProps } from './types'

/** 将表单字段的值、可写状态和展示方式接入选择器。 */
export function createDataPickerField<
  T extends object,
  TFilters extends object = Record<string, unknown>,
>(
  options: Omit<
    DataPickerProps<T, TFilters>,
    'modelValue' | 'disabled' | 'readonly'
  >
): FormRenderer {
  return field => {
    const { value, disabled, readonly, presentation } = field
    const modelValue =
      isPickerValue(value) ||
      (Array.isArray(value) && value.every(isPickerValue))
        ? value
        : null
    const update = field['onUpdate:value']
    const props = {
      ...options,
      modelValue,
      disabled: disabled === true,
      readonly: readonly === true,
      presentation:
        presentation === 'inline' || presentation === 'modal'
          ? presentation
          : options.presentation,
      'onUpdate:modelValue': (
        next: DataPickerEmits<T>['update:modelValue'][0]
      ) => {
        if (Array.isArray(update)) update.forEach(handler => handler(next))
        else update?.(next)
      },
    } satisfies DataPickerProps<T, TFilters> & {
      'onUpdate:modelValue': (
        ...args: DataPickerEmits<T>['update:modelValue']
      ) => void
    }
    return createVNode(C_DataPicker, props)
  }
}
