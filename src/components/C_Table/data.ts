/** 表格弹窗配置：复用既有 Form 局部 renderer 和同一套列编辑契约。 */
import { createVNode, Fragment } from 'vue'
import type { FormRenderer } from '../C_Form/composables/useFormRenderer'
import type { ComponentType, FormOption } from '../C_Form/types'
import { flattenTableColumns } from './helpers'
import { renderEditComponent } from './editRenderer'
import {
  isEditableDataColumn,
  isTableColumnEditable,
  resolveTableColumnRules,
} from './composables/tableValidation'
import type { TableColumn, EditType, DataRecord } from './types'

export { EDIT_COMPONENTS } from './editComponents'

const EDIT_TO_FORM_TYPE: Partial<Record<EditType, ComponentType>> = {
  number: 'inputNumber',
  date: 'datePicker',
  textarea: 'textarea',
  select: 'select',
  switch: 'switch',
}
const editorKey = (column: TableColumn) =>
  `__c-table-edit:${String(column.key)}`
const usesSharedEditor = (column: TableColumn) =>
  Boolean(
    column.editProps?.source ||
    column.editProps?.onSelect ||
    column.editRender ||
    column.editType === 'autocomplete'
  )
const formType = (column: TableColumn) =>
  usesSharedEditor(column)
    ? editorKey(column)
    : (EDIT_TO_FORM_TYPE[column.editType ?? 'input'] ?? 'input')

function editAttrs(column: TableColumn) {
  const attrs = { ...column.editProps }
  delete attrs.rules
  delete attrs.valueMode
  return attrs
}

function modalPermission(
  column: TableColumn,
  getSource: (() => DataRecord) | undefined,
  getOriginal: (() => DataRecord | undefined) | undefined,
  index: number
) {
  if (typeof column.editable !== 'function') return column.editable !== false
  // 弹窗尚未打开时没有业务行，不能用空模型执行用户的深层行谓词。
  const row = getOriginal ? getOriginal() : getSource?.()
  return row ? isTableColumnEditable(column, row, index) : false
}

/** 生成弹窗字段时保持旧静态控件入口，只有来源/自定义编辑器使用局部 renderer。 */
export const generateFormOptions = (
  columns: TableColumn[],
  getSource?: () => DataRecord,
  getOriginal?: () => DataRecord | undefined,
  getIndex: () => number = () => 0
): FormOption[] =>
  flattenTableColumns(columns)
    .filter(isEditableDataColumn)
    .map(column => {
      const attrs = editAttrs(column)
      const allowed = modalPermission(
        column,
        getSource,
        getOriginal,
        getIndex()
      )
      return {
        prop: String(column.key),
        label: column.title || String(column.key),
        type: formType(column),
        valueMode: column.editProps?.valueMode,
        ...(Array.isArray(attrs.options)
          ? { children: attrs.options.map(option => ({ ...option })) }
          : {}),
        placeholder: attrs.placeholder ?? `请输入${column.title}`,
        rules: allowed ? resolveTableColumnRules(column, getSource) : [],
        disabled: !allowed || attrs.disabled,
        attrs,
        layout: { span: 1 },
        show: true,
      }
    })

function controlSize(size: unknown) {
  return size === 'small' || size === 'medium' || size === 'large'
    ? size
    : undefined
}

/** 弹窗经 Form 的现有局部 renderer 入口复用同一个编辑器，不注册全局状态。 */
export function generateFormRenderers(
  columns: TableColumn[],
  getSource: () => DataRecord,
  getIndex: () => number
): Record<string, FormRenderer> {
  return Object.fromEntries(
    flattenTableColumns(columns)
      .filter(usesSharedEditor)
      .map(column => [
        editorKey(column),
        (field =>
          createVNode(Fragment, null, [
            renderEditComponent(
              column,
              field.value,
              value => {
                const update = field['onUpdate:value']
                if (Array.isArray(update))
                  update.forEach(handler => handler(value))
                else update?.(value)
              },
              getSource(),
              getIndex(),
              {
                busy: field.disabled === true || field.readonly === true,
                size: controlSize(field.size),
              }
            ),
          ])) satisfies FormRenderer,
      ])
  )
}
