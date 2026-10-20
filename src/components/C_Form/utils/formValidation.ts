/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 验证库与 Naive UI 的表单规则边界，复用规则逻辑并收敛类型差异
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import {
  BasicRules,
  toNaiveRule,
  type NaiveRule,
  type RuleSpec,
} from '@robot-admin/form-validate'
import type { FormItemRule } from 'naive-ui'

/** 原生规则、验证库规则和框架无关规则均可直接作为字段配置。 */
export type FormValidationRule = FormItemRule | NaiveRule | RuleSpec

/** 预设的官方规则兼容性由验证包负责，组件层直接转出。 */
export {
  PRESET_RULES,
  NAIVE_COMBOS,
  SPEC_RULES,
} from '@robot-admin/form-validate'
export type { RuleSpec } from '@robot-admin/form-validate'

/** 自带 validate 的框架无关规则在此转换，其余规则直接交给 Naive 引擎。 */
function isRuleSpec(rule: FormValidationRule): rule is RuleSpec {
  return 'validate' in rule && typeof rule.validate === 'function'
}

/** 转换规则时复制对象和触发器，不修改业务配置或重复实现验证算法。 */
export function resolveFormRules(
  rules: readonly FormValidationRule[] = []
): FormItemRule[] {
  return rules.map(rule => {
    const native = isRuleSpec(rule) ? toNaiveRule(rule) : rule
    return {
      ...native,
      ...(Array.isArray(native.trigger)
        ? { trigger: [...native.trigger] }
        : {}),
    }
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
