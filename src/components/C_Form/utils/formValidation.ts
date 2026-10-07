/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 验证库与 Naive UI 的表单规则边界，复用规则逻辑并收敛类型差异
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import {
  BasicRules,
  NAIVE_COMBOS as validationCombos,
  PRESET_RULES as validationPresets,
  toNaiveRule,
  type NaiveRule,
  type RuleSpec,
} from '@robot-admin/form-validate'
import type { FormItemRule } from 'naive-ui'

/** 原生规则、验证库规则和框架无关规则均可直接作为字段配置。 */
export type FormValidationRule = FormItemRule | NaiveRule | RuleSpec

// 保留验证库的精确字段类型与可组合能力，同时兼容 Naive UI 的调用签名。
type NativePresetRule = FormItemRule &
  Pick<NaiveRule, 'trigger' | 'validator' | 'required' | 'message'>

type NativeRuleFactories<T> = {
  readonly [Key in keyof T]: T[Key] extends (
    ...args: infer Args
  ) => infer Result
    ? (
        ...args: Args
      ) => Result extends readonly NaiveRule[]
        ? NativePresetRule[]
        : Result extends NaiveRule
          ? NativePresetRule
          : Result
    : T[Key]
}

/** 运行时保持验证库的工厂对象，只有公开类型在组件包内统一适配。 */
export const PRESET_RULES = validationPresets as unknown as NativeRuleFactories<
  typeof validationPresets
>
export const NAIVE_COMBOS = validationCombos as unknown as NativeRuleFactories<
  typeof validationCombos
>
export { SPEC_RULES } from '@robot-admin/form-validate'
export type { RuleSpec } from '@robot-admin/form-validate'

/** 转换规则时复制对象和触发器，不修改业务配置或重复实现验证算法。 */
export function resolveFormRules(
  rules: readonly FormValidationRule[] = []
): FormItemRule[] {
  return rules.map(rule => {
    const native =
      'validate' in rule && typeof rule.validate === 'function'
        ? toNaiveRule(rule as RuleSpec)
        : rule
    return {
      ...native,
      ...(Array.isArray(native.trigger)
        ? { trigger: [...native.trigger] }
        : {}),
    } as FormItemRule
  })
}

/** 必填判断复用验证库，提示文案仍由组件的语言配置提供。 */
export function createRequiredFormRule(
  label: string,
  message: string
): FormItemRule {
  return resolveFormRules([
    { ...BasicRules.required(label, ['input', 'change', 'blur']), message },
  ])[0]
}
