/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Description: C_Form 状态引擎 Composable — 表单数据、校验规则、验证 API
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  reactive,
  computed,
  ref,
  watch,
  nextTick,
  onMounted,
  type ComputedRef,
  type Ref,
} from "vue";
import type { FormInst, FormRules } from "naive-ui/es/form";
import { mergeRules } from "@robot-admin/form-validate";
import type {
  FormOption,
  FormModel,
  ComponentType,
  SubmitEventPayload,
} from "../types";
import type { ResolvedFormConfig } from "./useFormConfig";

/* =================== 默认值映射 =================== */

/** 各控件类型的默认空值 */
const DEFAULT_VALUES: Record<ComponentType, unknown> = {
  input: "",
  textarea: "",
  editor: "",
  select: null,
  datePicker: null,
  daterange: null,
  timePicker: null,
  cascader: null,
  colorPicker: null,
  checkbox: null,
  upload: [],
  radio: "",
  inputNumber: null,
  slider: null,
  rate: null,
  switch: null,
} as const;

const getDefaultValue = (type: ComponentType): unknown => {
  return DEFAULT_VALUES[type] ?? null;
};

/* =================== Composable =================== */

/**
 * C_Form 状态引擎 — 管理表单数据模型、校验规则、验证 API、字段操作
 * @param options - 表单配置项（响应式）
 * @param config - 解析后的表单配置（响应式）
 * @param formRef - NForm 实例引用
 * @param emit - 组件事件发射器
 */
export function useFormState(
  options: ComputedRef<FormOption[]>,
  config: ComputedRef<ResolvedFormConfig>,
  formRef: Ref<FormInst | null>,
  emit: {
    (e: "update:modelValue", model: FormModel): void;
    (e: "validate-success", model: FormModel): void;
    (e: "validate-error", errors: unknown): void;
    (e: "submit", payload: SubmitEventPayload): void;
  },
) {
  /* ===== 响应式状态 ===== */
  const formModel = reactive<FormModel>({});
  const formRules = reactive<FormRules>({});

  /* ===== 可见字段 ===== */
  const visibleOptions = computed(() =>
    options.value.filter((item) => item.show !== false),
  );

  /* ===== 初始化 ===== */
  const initialize = (): void => {
    try {
      /* 清空现有规则 */
      Object.keys(formRules).forEach((key) => delete formRules[key]);

      /* 初始化表单数据和验证规则 */
      options.value.forEach((item) => {
        /*
         * 只为新增字段设置默认值，保留已有字段的用户输入
         * 解决 options 依赖 formData 时的循环重置问题
         */
        if (!(item.prop in formModel)) {
          formModel[item.prop] =
            item.value !== undefined
              ? item.value
              : getDefaultValue(item.type as ComponentType);
        }

        if (item.rules?.length) {
          /*
           * mergeRules 内部只调用 rule.validator?.()，
           * 原生 naive-ui 声明式规则（如 { required: true }）没有 validator 会被跳过。
           * 仅当所有规则都有 validator 时才走 mergeRules 串行验证，否则直接交给 naive-ui 处理。
           */
          const allHaveValidator = item.rules.every(
            (r) =>
              typeof (r as Record<string, unknown>).validator === "function",
          );
          formRules[item.prop] = allHaveValidator
            ? mergeRules(item.rules)
            : item.rules;
        }
      });
    } catch (error) {
      console.error("[C_Form] 初始化失败:", error);
    }
  };

  /* ===== 字段变化处理 ===== */
  const handleFieldChange = (field: string): void => {
    if (config.value.validateOnChange) {
      nextTick(() => {
        validateField(field).catch(() => {});
      });
    }
  };

  /* ===== 验证 API ===== */
  const validate = async (): Promise<void> => {
    if (!formRef.value) {
      throw new Error("[C_Form] 表单引用不存在");
    }

    try {
      await formRef.value.validate();
      emit("validate-success", getModel());
    } catch (errors) {
      emit("validate-error", errors);
      throw errors;
    }
  };

  const validateField = async (field: string | string[]): Promise<void> => {
    if (!formRef.value) {
      throw new Error("[C_Form] 表单引用不存在");
    }

    const fields = Array.isArray(field) ? field : [field];

    /*
     * naive-ui 的 Form.validate() 不支持直接传字段名数组，
     * 需要验证整个表单后过滤出目标字段的错误
     */
    try {
      await formRef.value.validate();
    } catch (allErrors: unknown) {
      /* allErrors 是 ValidateError[][] — 每个错误数组含 field 信息 */
      if (!Array.isArray(allErrors)) throw allErrors;

      /* 过滤出目标字段的错误 */
      const targetErrors = allErrors.filter((errorGroup: unknown[]) =>
        errorGroup?.some((err) => {
          const e = err as Record<string, unknown>;
          return typeof e.field === "string" && fields.includes(e.field);
        }),
      );

      if (targetErrors.length > 0) {
        throw targetErrors;
      }
      /* 目标字段无错误，其他字段的错误忽略 */
    }
  };

  const clearValidation = (field?: string | string[]): void => {
    if (!formRef.value) return;

    if (field) {
      const fields = Array.isArray(field) ? field : [field];
      fields.forEach((fieldName) => {
        if (formModel[fieldName] !== undefined) {
          const currentValue = formModel[fieldName];
          formModel[fieldName] = currentValue;
        }
      });
    } else {
      formRef.value.restoreValidation();
    }
  };

  const validateByFilter = async (
    filterFn: (option: FormOption) => boolean,
    context: string,
  ): Promise<boolean> => {
    try {
      const fields = options.value
        .filter(filterFn)
        .map((option) => option.prop);
      if (fields.length === 0) return true;
      await validateField(fields);
      return true;
    } catch (error) {
      console.warn(`[C_Form] ${context}验证失败:`, error);
      return false;
    }
  };

  const validateStep = async (stepIndex: number): Promise<boolean> => {
    const stepKey = config.value.steps?.steps?.[stepIndex]?.key;
    if (!stepKey) return true;

    return validateByFilter(
      (option) => option.layout?.step === stepKey,
      `步骤 ${stepIndex} `,
    );
  };

  const validateTab = async (tabKey: string): Promise<boolean> => {
    return validateByFilter(
      (option) => option.layout?.tab === tabKey,
      `标签页 ${tabKey} `,
    );
  };

  const validateDynamicFields = async (): Promise<boolean> => {
    return validateByFilter(
      (option) => Boolean(option.layout?.dynamic),
      "动态字段 ",
    );
  };

  const validateCustomGroup = async (groupKey: string): Promise<boolean> => {
    return validateByFilter(
      (option) => option.layout?.group === groupKey,
      `自定义分组 ${groupKey} `,
    );
  };

  /* ===== 数据 API ===== */
  const getModel = (): FormModel => ({ ...formModel });

  const setFields = (fields: FormModel): void => {
    Object.assign(formModel, fields);
  };

  const resetFields = (): void => {
    try {
      clearValidation();

      options.value.forEach((item) => {
        const defaultValue =
          item.value !== undefined
            ? item.value
            : getDefaultValue(item.type as ComponentType);

        formModel[item.prop] = defaultValue;
      });
    } catch (error) {
      console.error("[C_Form] 重置表单失败:", error);
    }
  };

  const setFieldValue = async (
    field: string,
    value: unknown,
    shouldValidate: boolean = false,
  ): Promise<void> => {
    formModel[field] = value;
    if (shouldValidate) {
      await validateField(field);
    }
  };

  const getFieldValue = (field: string): unknown => formModel[field];

  const setFieldsValue = async (
    fields: FormModel,
    shouldValidate: boolean = false,
  ): Promise<void> => {
    Object.assign(formModel, fields);
    if (shouldValidate) {
      await validate();
    }
  };

  /* ===== 提交 & 重置 ===== */
  const handleSubmit = async (): Promise<void> => {
    try {
      await validate();
      emit("submit", { model: getModel(), form: formRef.value! });
    } catch (error) {
      console.warn("[C_Form] 表单验证失败:", error);
    }
  };

  /* ===== 生命周期 ===== */
  onMounted(() => {
    initialize();

    watch(
      () => options.value,
      () => initialize(),
      { deep: true },
    );

    watch(
      () => formModel,
      (val) => emit("update:modelValue", { ...val }),
      { deep: true },
    );
  });

  return {
    formModel,
    formRules,
    visibleOptions,
    initialize,
    handleFieldChange,
    /* 验证 API */
    validate,
    validateField,
    validateStep,
    validateTab,
    validateDynamicFields,
    validateCustomGroup,
    clearValidation,
    /* 数据 API */
    getModel,
    setFields,
    resetFields,
    setFieldValue,
    getFieldValue,
    setFieldsValue,
    /* 操作 */
    handleSubmit,
    handleReset: resetFields,
  };
}
