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
import { C_AutoComplete } from '../../internal/sourceControls'
import type { EditType } from './types'

const NDatePicker = defineAsyncComponent(
  () => import('../../internal/naive-fields/date-picker')
)

/* ================= 编辑组件映射 ================= */

export const EDIT_COMPONENTS: Record<EditType, Component> = {
  number: NInputNumber,
  autocomplete: C_AutoComplete,
  switch: NSwitch,
  input: NInput,
  email: NInput,
  mobile: NInput,
  date: (props: DatePickerProps) =>
    h(NDatePicker, {
      ...props,
      type: 'date',
      format: props.format ?? 'yyyy-MM-dd',
    }),
  select: NSelect,
  textarea: (props: InputProps) =>
    h(NInput, { ...props, type: 'textarea', rows: 3 }),
}
