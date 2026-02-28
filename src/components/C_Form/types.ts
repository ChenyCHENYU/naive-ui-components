/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 表单相关类型 - 统一管理所有表单相关的类型定义
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import type { VNode, DefineComponent, CSSProperties, ComputedRef } from "vue";
import type { FormInst, UploadFileInfo } from "naive-ui/es";
import type { FieldRule } from "@robot-admin/form-validate";

/**
 * 支持的布局类型
 * @description 定义表单支持的所有布局模式
 */
export type LayoutType =
  | "default"
  | "inline"
  | "grid"
  | "card"
  | "tabs"
  | "steps"
  | "dynamic"
  | "custom";

/**
 * 标签位置类型
 * @description 表单标签的显示位置
 */
export type LabelPlacement = "left" | "top";

/**
 * 支持的表单控件类型
 * @description 所有支持的表单输入控件类型
 */
export type ComponentType =
  | "input"
  | "textarea"
  | "inputNumber"
  | "select"
  | "checkbox"
  | "radio"
  | "switch"
  | "slider"
  | "rate"
  | "datePicker"
  | "daterange"
  | "timePicker"
  | "cascader"
  | "colorPicker"
  | "upload"
  | "editor";

/**
 * 选项项接口
 * @description 用于 select、checkbox、radio 等组件的选项配置
 */
export interface OptionItem {
  value: string | number | boolean;
  label: string;
  disabled?: boolean;
  [key: string]: any;
}

/* =================== 布局配置类型 =================== */

/**
 * 标签页配置接口
 * @description 用于标签页布局的单个标签页配置
 */
export interface TabConfig {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
}

/**
 * 步骤配置接口
 * @description 用于步骤布局的单个步骤配置
 */
export interface StepConfig {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
  required?: boolean;
}

/**
 * 分组配置接口
 * @description 用于卡片布局和自定义布局的分组配置
 */
export interface GroupConfig {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  defaultExpanded?: boolean;
}

/**
 * 动态字段配置接口
 * @description 用于动态布局的字段配置
 */
export interface DynamicFieldConfig {
  id: string;
  type: ComponentType | string;
  prop: string;
  label: string;
  visible: boolean;
  removable: boolean;
  created: number;
  placeholder?: string;
  layout?: { span?: number };
  rules?: FieldRule[];
}

/**
 * 表单项布局配置
 * @description 单个表单项的布局相关配置
 */
export interface ItemLayoutConfig {
  span?: number;
  offset?: number;
  width?: string | number;
  group?: string;
  tab?: string;
  step?: string;
  dynamic?: boolean;
  customRender?: boolean;
  enhanced?: boolean;
  class?: string;
  style?: CSSProperties | Record<string, any>;
  hidden?: boolean;
}

/**
 * 网格布局配置
 * @description 网格布局的详细配置选项
 */
export interface GridLayoutConfig {
  cols?: number;
  gutter?: number;
  yGutter?: number;
  xGap?: number;
  yGap?: number;
}

/**
 * 内联布局配置
 * @description 内联布局的详细配置选项
 */
export interface InlineLayoutConfig {
  gap?: number;
  align?: "start" | "center" | "end" | "baseline" | "stretch";
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
}

/**
 * 卡片布局配置
 * @description 卡片布局的详细配置选项
 */
export interface CardLayoutConfig {
  groups?: GroupConfig[];
  spacing?: number;
  bordered?: boolean;
}

/**
 * 标签页布局配置
 * @description 标签页布局的详细配置选项
 */
export interface TabsLayoutConfig {
  tabs?: TabConfig[];
  placement?: "top" | "right" | "bottom" | "left";
  defaultTab?: string;
}

/**
 * 步骤布局配置
 * @description 步骤布局的详细配置选项
 */
export interface StepsLayoutConfig {
  steps?: StepConfig[];
  vertical?: boolean;
  size?: "small" | "medium";
  defaultStep?: number;
  showStepHeader?: boolean;
  validateBeforeNext?: boolean;
  prevButtonText?: string;
  nextButtonText?: string;
}

/**
 * 动态布局配置
 * @description 动态布局的详细配置选项
 */
export interface DynamicLayoutConfig {
  grid?: {
    cols?: number;
    gutter?: number;
  };
  controls?: {
    showControls?: boolean;
    showItemControls?: boolean;
    showStats?: boolean;
  };
  dynamic?: {
    allowAdd?: boolean;
    allowRemove?: boolean;
    allowToggle?: boolean;
    maxFields?: number;
  };
}

/**
 * 自定义渲染布局配置
 * @description 自定义渲染布局的详细配置选项
 */
export interface CustomLayoutConfig {
  groups?: GroupConfig[];
  rendering?: {
    mode?: "basic" | "enhanced";
    animations?: boolean;
    tooltips?: boolean;
  };
  display?: {
    showIntro?: boolean;
    showModeSwitch?: boolean;
    showGroupActions?: boolean;
    showStats?: boolean;
  };
}

/**
 * 完整布局配置
 * @description 包含所有布局类型的配置选项
 */
export interface LayoutConfig {
  type?: LayoutType;
  grid?: GridLayoutConfig;
  inline?: InlineLayoutConfig;
  card?: CardLayoutConfig;
  tabs?: TabsLayoutConfig;
  steps?: StepsLayoutConfig;
  dynamic?: DynamicLayoutConfig;
  custom?: CustomLayoutConfig;
}

/* =================== 表单配置类型 =================== */

/**
 * 表单配置项接口
 * @description 单个表单项的完整配置
 */
export interface FormOption {
  id?: string;
  type: ComponentType | string;
  prop: string;
  label?: string;
  value?: any;
  placeholder?: string;
  rules?: FieldRule[];
  attrs?: Record<string, any>;
  children?: OptionItem[];
  show?: boolean;
  layout?: ItemLayoutConfig;
  help?: string;
  required?: boolean;
  dependsOn?: string | string[];
  showWhen?: (formModel: Record<string, any>) => boolean;
}

/* =================== 组件 Props 类型 =================== */

/**
 * 布局组件通用 Props
 * @description 所有布局组件的通用属性接口
 */
export interface LayoutProps {
  formItems: VNode[];
  layoutConfig?: LayoutConfig;
  options?: FormOption[];
}

/* =================== 事件类型定义 =================== */

/**
 * 表单提交事件参数
 */
export interface SubmitEventPayload {
  model: Record<string, any>;
  form: FormInst;
}

/**
 * 文件上传相关事件参数
 */
export interface UploadEventPayload {
  file: UploadFileInfo;
  fileList: UploadFileInfo[];
  event?: Event;
}

/* =================== 组件实例类型 =================== */

/**
 * C_Form 组件实例暴露的方法
 * @description 表单组件实例对外暴露的所有方法
 */
export interface FormInstance {
  validate(): Promise<void>;
  validateField(field: string | string[]): Promise<void>;
  validateStep(stepIndex: number): Promise<boolean>;
  validateTab(tabKey: string): Promise<boolean>;
  validateDynamicFields(): Promise<boolean>;
  validateCustomGroup(groupKey: string): Promise<boolean>;
  clearValidation(field?: string | string[]): void;
  getModel(): Record<string, any>;
  setFields(fields: Record<string, any>): void;
  resetFields(): void;
  setFieldValue(
    field: string,
    value: any,
    shouldValidate?: boolean,
  ): Promise<void>;
  getFieldValue(field: string): any;
  setFieldsValue(
    fields: Record<string, any>,
    shouldValidate?: boolean,
  ): Promise<void>;
  formRef: FormInst | null;
  formModel: Record<string, any>;
  initialize(): void;
  layoutType: ComputedRef<LayoutType>;
  shouldShowDefaultActions: ComputedRef<boolean>;
}

/* =================== 布局组件类型 =================== */

/**
 * 布局组件定义类型
 */
export type LayoutComponent = DefineComponent<LayoutProps>;

/* =================== 工具类型 =================== */

/**
 * 表单数据模型类型（泛型）
 */
export type FormModel<T = Record<string, any>> = T;

/**
 * 表单验证规则映射
 */
export type FormRulesMap = Record<string, FieldRule[]>;

/**
 * 字段值变化回调
 */
export type FieldChangeCallback = (
  field: string,
  value: any,
  formModel: Record<string, any>,
) => void;

/**
 * 渲染模式类型
 */
export type RenderMode = "basic" | "enhanced";

/**
 * 对齐方式类型
 */
export type AlignType = "start" | "center" | "end";

/**
 * 步骤尺寸类型
 */
export type StepSize = "small" | "medium";

/**
 * 标签页位置类型
 */
export type TabsPlacement = "top" | "right" | "bottom" | "left";

/**
 * 动态表单配置接口
 */
export interface DynamicFormConfig {
  maxFields: number;
  autoSave: boolean;
  enableSort: boolean;
  showControls: boolean;
  showItemControls: boolean;
}

/**
 * 动态表单状态接口
 */
export interface DynamicFormState {
  config: DynamicFormConfig;
  baseFields: FormOption[];
  dynamicFields: DynamicFieldConfig[];
  hiddenFieldIds: Set<string>;
  fieldCounter: number;
  isInitialized: boolean;
}
