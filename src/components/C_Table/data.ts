/*
 * @Description: 表格配置中心 — 编辑组件映射、表单生成、显示值处理
 * @Migration: naive-ui-components 组件库迁移版本
 */

import { h } from "vue";
import { NInput, NInputNumber, NSwitch, NDatePicker, NSelect } from "naive-ui";
import type { TableColumn, EditType } from "./types";

/* ================= 编辑组件映射 ================= */

export const EDIT_COMPONENTS: Record<EditType, any> = {
  number: NInputNumber,
  switch: NSwitch,
  input: NInput,
  email: NInput,
  mobile: NInput,
  date: (props: any) =>
    h(NDatePicker, { ...props, type: "date", format: "yyyy-MM-dd" }),
  select: (props: any) =>
    h(NSelect, { ...props, options: props.options || [] }),
  textarea: (props: any) => h(NInput, { ...props, type: "textarea", rows: 3 }),
};

/* ================= 表单选项生成 ================= */

interface FormOption {
  prop: string;
  label: string;
  type: string;
  placeholder: string;
  rules: any[];
  attrs: any;
  layout: { span: number };
  show: boolean;
}

type ComponentType = string;

const EDIT_TO_FORM_TYPE: Record<string, ComponentType> = {
  number: "inputNumber",
  date: "datePicker",
  textarea: "textarea",
  select: "select",
  switch: "switch",
};

/**
 * 根据可编辑列配置自动生成表单选项（用于编辑弹窗）
 */
export const generateFormOptions = (columns: TableColumn[]): FormOption[] =>
  columns.map((column) => {
    const rules: any[] = (column as any).required
      ? [
          {
            required: true,
            message: `请输入${(column as any).title}`,
            trigger: ["blur", "input"],
            validator: async (_: any, value: any) => {
              if (!value && value !== 0 && value !== false)
                throw new Error(`请输入${(column as any).title}`);
            },
          },
        ]
      : [];

    return {
      prop: (column as any).key,
      label: (column as any).title || (column as any).key,
      type: EDIT_TO_FORM_TYPE[(column as any).editType || "input"] || "input",
      placeholder: `请输入${(column as any).title}`,
      rules,
      attrs: (column as any).editProps || {},
      layout: { span: 1 },
      show: true,
    };
  });
