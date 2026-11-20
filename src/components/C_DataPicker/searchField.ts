import { createVNode, nextTick } from 'vue'
import type { SearchFieldContext } from '../C_FormSearch/types'
import C_DataPicker from './index.vue'
import { normalizePickerFieldValue } from './source'
import type { DataPickerEmits, DataPickerProps } from './types'

/** 接到 Search 的自定义字段，提交仍由搜索区统一管理。 */
export function createDataPickerSearchField<
  T extends object,
  TFilters extends object = Record<string, unknown>,
>(
  options: Omit<
    DataPickerProps<T, TFilters>,
    'modelValue' | 'disabled' | 'readonly'
  > & {
    onSelect?: (...args: DataPickerEmits<NoInfer<T>>['select']) => void
  }
) {
  const { onSelect, ...settings } = options
  return ({
    value,
    updateValue,
    disabled,
    readonly,
  }: Pick<
    SearchFieldContext,
    'value' | 'updateValue' | 'disabled' | 'readonly'
  >) =>
    createVNode(C_DataPicker, {
      ...settings,
      modelValue: normalizePickerFieldValue(value),
      disabled,
      readonly,
      'onUpdate:modelValue': updateValue,
      onSelect: async (...args: DataPickerEmits<T>['select']) => {
        // 关联字段回填读取的是已更新的搜索草稿。
        await nextTick()
        onSelect?.(...args)
      },
    })
}
