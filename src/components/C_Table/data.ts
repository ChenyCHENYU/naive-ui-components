/*
 * @Description: 表格配置中心 — 编辑组件映射、表单生成、显示值处理
 * @Migration: naive-ui-components 组件库迁移版本
 */

import { defineAsyncComponent, h, type Component } from 'vue'
import {
  NInput,
  NInputNumber,
  NSwitch,
  NSelect,
  type InputProps,
  type DatePickerProps,
} from 'naive-ui'
import type { ComponentType, FormOption } from '../C_Form/types'
import {
  isEditableDataColumn,
  resolveTableColumnRules,
} from './composables/tableValidation'
import type { TableColumn, EditType, DataRecord } from './types'

const NDatePicker = defineAsyncComponent(
  () => import('../../internal/naive-fields/date-picker')
)

/* ================= 编辑组件映射 ================= */

export const EDIT_COMPONENTS: Record<EditType, Component> = {
  number: NInputNumber,
  switch: NSwitch,
  input: NInput,
  email: NInput,
  mobile: NInput,
  date: (props: DatePickerProps) =>
    h(NDatePicker, { ...props, type: 'date', format: 'yyyy-MM-dd' }),
  select: NSelect,
  textarea: (props: InputProps) =>
    h(NInput, { ...props, type: 'textarea', rows: 3 }),
}

/* ================= 表单选项生成 ================= */

const EDIT_TO_FORM_TYPE: Partial<Record<EditType, ComponentType>> = {
  number: 'inputNumber',
  date: 'datePicker',
  textarea: 'textarea',
  select: 'select',
  switch: 'switch',
}

/**
 * 根据可编辑列配置自动生成表单选项（用于编辑弹窗）
 */
export const generateFormOptions = (
  columns: TableColumn[],
  getSource?: () => DataRecord
): FormOption[] =>
  columns.filter(isEditableDataColumn).map(column => {
    const attrs = { ...column.editProps }
    delete attrs.rules
    return {
      prop: String(column.key),
      label: column.title || String(column.key),
      type:
        EDIT_TO_FORM_TYPE[
          column.editType ??
            (column.dictionary !== undefined ? 'select' : 'input')
        ] ?? 'input',
      dictionary: column.dictionary,
      ...(column.dictionary !== undefined &&
      Array.isArray(column.editProps?.options)
        ? { children: column.editProps.options.map(option => ({ ...option })) }
        : {}),
      placeholder: column.editProps?.placeholder ?? `请输入${column.title}`,
      rules: resolveTableColumnRules(column, getSource),
      attrs,
      layout: { span: 1 },
      show: true,
    }
  })
