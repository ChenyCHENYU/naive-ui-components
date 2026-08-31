/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: 安全公式求值引擎
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { computed, type Ref } from 'vue'
import type { FormulaVariable } from '../types'
import { evaluateSafeExpression } from '../utils/safeExpression'

/**
 * 公式求值引擎
 * 将公式中的 [变量名] 替换为实际值后计算结果
 */
export function useFormulaEvaluator(variables: Ref<FormulaVariable[]>) {
  /** 构建 变量名 → field 映射 */
  const variableMap = computed(() => {
    const map = new Map<string, string>()
    for (const v of variables.value) {
      map.set(v.name, v.field)
    }
    return map
  })

  /**
   * 求值：用样例数据计算公式结果
   */
  function evaluate(
    formula: string,
    sampleData: Record<string, number | string | boolean>
  ): { success: boolean; result: unknown; error?: string } {
    if (!formula.trim()) {
      return { success: true, result: undefined }
    }

    try {
      const result = evaluateSafeExpression(
        formula,
        variableMap.value,
        sampleData
      )
      return { success: true, result }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      return { success: false, result: undefined, error: message }
    }
  }

  /**
   * 从公式中提取使用到的变量名列表
   */
  function extractVariableNames(formula: string): string[] {
    const names: string[] = []
    const regex = /\[([^\]]+)\]/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(formula)) !== null) {
      if (!names.includes(match[1])) {
        names.push(match[1])
      }
    }
    return names
  }

  return {
    evaluate,
    extractVariableNames,
    variableMap,
  }
}
