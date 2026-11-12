import { createVNode, nextTick } from 'vue'
import { C_Select, C_AutoComplete } from '../../internal/sourceControls'
import type { OptionSource, OptionValue } from '../../core/optionSource'
import type {
  SelectProps,
  SelectValue,
  SelectModelValue,
  SelectSelection,
  SelectOptionItem,
} from '../C_Select/types'
import type {
  AutoCompleteProps,
  AutoCompleteOptionItem,
} from '../C_AutoComplete/types'
import type { TableColumn } from './types'

/** 类型化候选回调只读业务行，模型更新继续经过表格自己的草稿入口。 */
export interface TableEditorContext<T extends object, V = unknown> {
  row: Readonly<T>
  index: number
  updateValue: (value: V) => void
}

type RowSource<
  T extends object,
  R extends object,
  V extends OptionValue,
  F extends object,
> =
  | OptionSource<R, V, F>
  | ((row: Readonly<T>, index: number) => OptionSource<R, V, F>)

/** 返回现有 editRender；来源与完整候选记录从传入对象推导。 */
export function createTableSelectEditor<
  T extends object = object,
  R extends object = SelectOptionItem,
  V extends SelectValue = SelectValue,
  M extends boolean = false,
  Tag extends boolean = false,
  F extends object = Record<string, unknown>,
>(
  options: Omit<SelectProps<V, M, Tag, R, F>, 'modelValue' | 'source'> & {
    source?: RowSource<T, R, V, F>
    onSelect?: (
      selection: SelectSelection<NoInfer<R>, M>,
      context: TableEditorContext<T, SelectModelValue<V, M, Tag>>
    ) => void
  }
): NonNullable<TableColumn<T>['editRender']> {
  const { source, onSelect, ...attrs } = options
  return (value, row, index, context) =>
    createVNode(C_Select, {
      ...attrs,
      modelValue: value,
      size: attrs.size ?? context.size,
      source: typeof source === 'function' ? source(row, index) : source,
      disabled: context.disabled || attrs.disabled,
      'onUpdate:modelValue': context.onUpdate,
      onSelect: async (selection: SelectSelection<R, M>) => {
        await nextTick()
        onSelect?.(selection, { row, index, updateValue: context.onUpdate })
      },
    })
}

/** 自由文本与候选记录保持分离，复用自动补全的原始来源及渲染契约。 */
export function createTableAutoCompleteEditor<
  T extends object = object,
  R extends object = AutoCompleteOptionItem,
  F extends object = Record<string, unknown>,
>(
  options: Omit<AutoCompleteProps<R, F>, 'modelValue' | 'source'> & {
    source?: RowSource<T, R, OptionValue, F>
    onSelect?: (
      record: NoInfer<R>,
      context: TableEditorContext<T, string>
    ) => void
  }
): NonNullable<TableColumn<T>['editRender']> {
  const { source, onSelect, ...attrs } = options
  return (value, row, index, context) =>
    createVNode(C_AutoComplete, {
      ...attrs,
      modelValue: value,
      size: attrs.size ?? context.size,
      source: typeof source === 'function' ? source(row, index) : source,
      disabled: context.disabled || attrs.disabled,
      'onUpdate:modelValue': context.onUpdate,
      onSelect: async (record: R) => {
        await nextTick()
        onSelect?.(record, { row, index, updateValue: context.onUpdate })
      },
    })
}
