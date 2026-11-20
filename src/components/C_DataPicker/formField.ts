import { createVNode, nextTick } from 'vue'
import { isDataEqual } from '../../utils/data'
import type { FormRenderer } from '../C_Form/composables/useFormRenderer'
import type { FormModel } from '../C_Form/types'
import C_DataPicker from './index.vue'
import { normalizePickerFieldValue } from './source'
import type { DataPickerEmits, DataPickerProps } from './types'

type FieldValue = DataPickerEmits<object>['update:modelValue'][0]

export interface DataPickerFieldSelection<T extends object> {
  /** Only resolved records. A non-empty value can contain unresolved entries. */
  rows: readonly T[]
  value: Readonly<FieldValue>
  previousValue: Readonly<FieldValue>
}

function readFieldPatch(patch: FormModel | undefined): FormModel | undefined {
  if (patch === undefined) return
  if (typeof patch?.then === 'function') {
    // Reject asynchronous writes at the boundary and observe a misconfigured promise.
    void Promise.resolve(patch).catch(() => undefined)
    throw new TypeError('[C_DataPicker] mapFields 必须同步返回字段对象')
  }
  if (Object.prototype.toString.call(patch) !== '[object Object]')
    throw new TypeError('[C_DataPicker] mapFields 必须返回字段对象')
  return patch
}

/** 将表单字段的值、可写状态和展示方式接入选择器。 */
export function createDataPickerField<
  T extends object,
  TFilters extends object = Record<string, unknown>,
>(
  options: Omit<
    DataPickerProps<T, TFilters>,
    'modelValue' | 'disabled' | 'readonly'
  > & {
    /** 选择值变化时同步返回关联字段，由表单与主字段一起提交。 */
    mapFields?: (
      selection: DataPickerFieldSelection<NoInfer<T>>
    ) => FormModel | undefined
    onSelect?: (...args: DataPickerEmits<NoInfer<T>>['select']) => void
    'onUpdate:modelValue'?: (
      ...args: DataPickerEmits<T>['update:modelValue']
    ) => void
  }
): FormRenderer {
  const {
    mapFields,
    onSelect,
    'onUpdate:modelValue': onUpdate,
    ...settings
  } = options
  return (field, _item, _config, context) => {
    const { value, disabled, readonly, presentation } = field
    const update = field['onUpdate:value']
    const commitValue = mapFields ? context?.commitValue : undefined
    if (mapFields && !commitValue)
      throw new TypeError('[C_DataPicker] mapFields 需要表单的关联字段提交能力')
    let pendingValue: FieldValue | undefined
    const props = {
      ...settings,
      modelValue: normalizePickerFieldValue(value),
      disabled: disabled === true,
      readonly: readonly === true,
      presentation:
        presentation === 'inline' ||
        presentation === 'modal' ||
        presentation === 'popover'
          ? presentation
          : options.presentation,
      'onUpdate:modelValue': async (next: FieldValue) => {
        if (commitValue) {
          // The picker emits the selected records next in the same operation.
          pendingValue = next
          return
        }
        if (Array.isArray(update)) update.forEach(handler => handler(next))
        else update?.(next)
        await nextTick()
        return onUpdate?.(next)
      },
      onSelect: async (...args: DataPickerEmits<T>['select']) => {
        if (commitValue && mapFields && pendingValue !== undefined) {
          const next = pendingValue
          pendingValue = undefined
          const committed = commitValue(next, previous => {
            const previousValue = normalizePickerFieldValue(previous)
            if (isDataEqual(next, previousValue)) return
            return readFieldPatch(
              mapFields({ rows: args[0], value: next, previousValue })
            )
          })
          if (!committed) return
          await nextTick()
          await Promise.all([
            Promise.resolve().then(() => onUpdate?.(next)),
            Promise.resolve().then(() => onSelect?.(...args)),
          ])
          return
        }
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
