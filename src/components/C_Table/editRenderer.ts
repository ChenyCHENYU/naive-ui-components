import { h, createVNode, nextTick, type VNodeChild } from 'vue'
import type { TableColumn, ColumnWithKey, DataRecord, EditProps } from './types'
import { EDIT_COMPONENTS } from './editComponents'
import { C_Select, C_AutoComplete } from '../../internal/sourceControls'
import { bindTemporalField } from '../../core/temporalField'
import {
  createOptionValueBinding,
  needsOptionValueBinding,
} from '../../core/options'
import { shouldSummarizeSelectTags } from '../../core/selectPresentation'

export interface EditComponentContext {
  size?: 'small' | 'medium' | 'large'
  busy?: boolean
}

function resolveEditProps(
  column: TableColumn,
  value: unknown,
  onUpdate: (value: unknown) => void,
  context: EditComponentContext
) {
  const col = column as ColumnWithKey
  const editProps = { ...column.editProps }
  const { valueMode } = editProps
  delete editProps.source
  delete editProps.onSelect
  delete editProps.valueMode
  const props = {
    value,
    'onUpdate:value': onUpdate,
    placeholder: `请输入${col.title ?? ''}`,
    style: { width: '100%' },
    ...(context.size ? { size: context.size } : {}),
    ...editProps,
    ...(context.busy ? { disabled: true } : {}),
  }
  if (column.editType === 'date' && valueMode === 'formatted') {
    const { value, 'onUpdate:value': update, ...nativeProps } = props
    return {
      ...nativeProps,
      ...bindTemporalField({ mode: 'formatted', value }, update),
    }
  }
  return column.editType === 'select' ? resolveSelectEditProps(props) : props
}

function resolveSelectEditProps<
  T extends EditProps & {
    value: unknown
    'onUpdate:value': (value: unknown) => void
  },
>(props: T) {
  const selectProps = shouldSummarizeSelectTags(
    props.multiple,
    props.maxTagCount
  )
    ? { ...props, maxTagCount: 1, class: 'c-select--bounded' }
    : props
  if (!needsOptionValueBinding(props.options, props.value)) return selectProps
  const binding = createOptionValueBinding(props.options, props.value)
  const update = props['onUpdate:value']
  return {
    ...selectProps,
    value: binding.value,
    options: binding.options,
    fallbackOption: props.fallbackOption ?? binding.fallbackOption,
    'onUpdate:value': (
      next: Parameters<typeof binding.decode>[0],
      selected?: unknown
    ) => update(binding.decode(next, selected)),
  }
}

function isDisabled(column: TableColumn, context: EditComponentContext) {
  return (
    context.busy || column.editProps?.disabled || column.editProps?.readonly
  )
}

function usesSourceEditor(column: TableColumn) {
  return Boolean(
    column.editProps?.source ||
    column.editType === 'autocomplete' ||
    (column.editType === 'select' && column.editProps?.onSelect)
  )
}

function renderSourceEditor(
  column: TableColumn,
  value: unknown,
  onUpdate: (value: unknown) => void,
  row: DataRecord,
  index: number,
  context: EditComponentContext
) {
  const attrs = { ...column.editProps }
  const { source, onSelect } = attrs
  delete attrs.source
  delete attrs.onSelect
  delete attrs.rules
  return createVNode(
    column.editType === 'autocomplete' ? C_AutoComplete : C_Select,
    {
      ...attrs,
      source: typeof source === 'function' ? source(row, index) : source,
      modelValue: value,
      size: context.size,
      disabled: isDisabled(column, context),
      'onUpdate:modelValue': onUpdate,
      onSelect: async (record: object | object[] | null) => {
        await nextTick()
        onSelect?.(record, row, index)
      },
    }
  )
}

/** 行、单元格与弹窗共享编辑控件；旧的 size/busy 调用形态继续有效。 */
export function renderEditComponent(
  column: TableColumn,
  value: unknown,
  onUpdate: (value: unknown) => void,
  row: DataRecord = {},
  index = 0,
  ...controls: [
    size?: EditComponentContext['size'] | EditComponentContext,
    busy?: boolean,
  ]
): VNodeChild {
  const [size, busy = false] = controls
  const context = typeof size === 'object' ? size : { size, busy }
  if (column.editRender)
    return column.editRender(value, row, index, {
      onUpdate,
      size: context.size,
      disabled: isDisabled(column, context),
    })
  if (usesSourceEditor(column))
    return renderSourceEditor(column, value, onUpdate, row, index, context)
  const componentProps = resolveEditProps(column, value, onUpdate, context)
  const Component =
    EDIT_COMPONENTS[column.editType || 'input'] || EDIT_COMPONENTS.input
  return h(Component, componentProps)
}
