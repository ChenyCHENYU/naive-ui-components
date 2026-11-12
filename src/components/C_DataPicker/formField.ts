import { createVNode, nextTick } from 'vue'
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
  > & {
    onSelect?: (...args: DataPickerEmits<NoInfer<T>>['select']) => void
    'onUpdate:modelValue'?: (
      ...args: DataPickerEmits<T>['update:modelValue']
    ) => void
  }
): FormRenderer {
  const { onSelect, 'onUpdate:modelValue': onUpdate, ...settings } = options
  return field => {
    const { value, disabled, readonly, presentation } = field
    const modelValue =
      isPickerValue(value) ||
      (Array.isArray(value) && value.every(isPickerValue))
        ? value
        : null
    const update = field['onUpdate:value']
    const props = {
      ...settings,
      modelValue,
      disabled: disabled === true,
      readonly: readonly === true,
      presentation:
        presentation === 'inline' ||
        presentation === 'modal' ||
        presentation === 'popover'
          ? presentation
          : options.presentation,
      'onUpdate:modelValue': async (
        next: DataPickerEmits<T>['update:modelValue'][0]
      ) => {
        if (Array.isArray(update)) update.forEach(handler => handler(next))
        else update?.(next)
        await nextTick()
        return onUpdate?.(next)
      },
      onSelect: async (...args: DataPickerEmits<T>['select']) => {
        // 先发布当前字段，再让业务回填关联字段，保持同一个表单草稿。
        await nextTick()
        return onSelect?.(...args)
      },
    } satisfies DataPickerProps<T, TFilters> & {
      onSelect?: (...args: DataPickerEmits<T>['select']) => void
      'onUpdate:modelValue': (
        ...args: DataPickerEmits<T>['update:modelValue']
      ) => void
    }
    return createVNode(C_DataPicker, props)
  }
}
