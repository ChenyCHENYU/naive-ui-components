import { createVNode, mergeProps, nextTick } from 'vue'
import { C_Select, C_AutoComplete } from '../../internal/sourceControls'
import type {
  AutoCompleteOptionItem,
  AutoCompleteProps,
} from '../C_AutoComplete/types'
import type {
  SelectOptionItem,
  SelectModelValue,
  SelectProps,
  SelectSelection,
  SelectValue,
} from '../C_Select/types'
import type { FormRenderer, RendererProps } from './composables/useFormRenderer'

/** 来源由业务对象推导，选择回调可直接使用整行记录回填关联字段。 */
export function createSelectField<
  V extends SelectValue = SelectValue,
  M extends boolean = false,
  T extends boolean = false,
  R extends object = SelectOptionItem<V>,
  F extends object = Record<string, unknown>,
>(
  options: Omit<
    SelectProps<V, M, T, R, F>,
    'modelValue' | 'disabled' | 'readonly'
  > & {
    onSelect?: (selection: SelectSelection<NoInfer<R>, NoInfer<M>>) => void
    'onUpdate:modelValue'?: (
      value: SelectModelValue<NoInfer<V>, NoInfer<M>, NoInfer<T>>
    ) => void
  }
): FormRenderer {
  const { onSelect, 'onUpdate:modelValue': onUpdate, ...settings } = options
  return field => {
    const {
      value,
      'onUpdate:value': update,
      disabled,
      readonly,
      ...attrs
    } = field
    return createVNode(
      C_Select,
      mergeProps(attrs, settings, {
        modelValue: value,
        disabled: disabled === true,
        readonly: readonly === true,
        'onUpdate:modelValue': async (next: SelectModelValue<V, M, T>) => {
          updateField(update, next)
          await nextTick()
          return onUpdate?.(next)
        },
        onSelect: async (selection: SelectSelection<R, M>) => {
          // 等待主字段的受控模型发布后回填其它字段，避免旧外部模型覆盖新选择。
          await nextTick()
          return onSelect?.(selection)
        },
      })
    )
  }
}

/** 自动补全保留自由文本，选中建议时交付来源的完整业务记录。 */
export function createAutoCompleteField<
  R extends object = AutoCompleteOptionItem,
  F extends object = Record<string, unknown>,
>(
  options: Omit<
    AutoCompleteProps<R, F>,
    'modelValue' | 'disabled' | 'readonly'
  > & {
    onSelect?: (row: NoInfer<R>) => void
    'onUpdate:modelValue'?: (value: string) => void
  }
): FormRenderer {
  const { onSelect, 'onUpdate:modelValue': onUpdate, ...settings } = options
  return field => {
    const {
      value,
      'onUpdate:value': update,
      disabled,
      readonly,
      ...attrs
    } = field
    return createVNode(
      C_AutoComplete,
      mergeProps(attrs, settings, {
        modelValue: typeof value === 'string' ? value : '',
        disabled: disabled === true,
        readonly: readonly === true,
        'onUpdate:modelValue': async (next: string) => {
          updateField(update, next)
          await nextTick()
          return onUpdate?.(next)
        },
        onSelect: async (row: R) => {
          await nextTick()
          return onSelect?.(row)
        },
      })
    )
  }
}

function updateField(update: RendererProps['onUpdate:value'], value: unknown) {
  if (Array.isArray(update)) update.forEach(handler => handler(value))
  else update?.(value)
}
