/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 公式高亮与校验复用安全编译器，语法规则只维护一份
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { computed, type Ref } from 'vue'
import type {
  FormulaFunction,
  FormulaToken,
  FormulaValidation,
  FormulaVariable,
} from '../types'
import {
  compileSafeExpression,
  tokenizeSafeExpression,
} from '../utils/safeExpression'

interface FormulaAnalysis {
  tokens: FormulaToken[]
  validation: FormulaValidation
  compiled: ReturnType<typeof compileSafeExpression> | null
}

/** 在不执行公式、不需要试算值的情况下完成完整语法检查。 */
export function useFormulaParser(
  variables: Ref<FormulaVariable[]>,
  functions: Ref<FormulaFunction[]>
) {
  const variableNames = computed(
    () => new Set(variables.value.map(variable => variable.name))
  )
  const variableFields = computed(
    () => new Set(variables.value.map(variable => variable.field))
  )
  const functionNames = computed(
    () => new Set(functions.value.map(fn => fn.name.toUpperCase()))
  )
  let cached: {
    formula: string
    names: Set<string>
    fields: Set<string>
    functions: Set<string>
    analysis: FormulaAnalysis
  } | null = null

  /** 用原始字符区间保留空白和引号，字符串内的方括号不会变成变量标签。 */
  function tokenize(formula: string): FormulaToken[] {
    try {
      const lexical = tokenizeSafeExpression(formula)
      const tokens: FormulaToken[] = []
      let end = 0
      lexical.forEach((token, index) => {
        if (token.type === 'eof') return
        if (token.position > end)
          tokens.push({
            type: 'space',
            value: formula.slice(end, token.position),
            start: end,
            end: token.position,
          })
        const raw = formula
          .slice(token.position, lexical[index + 1]?.position ?? formula.length)
          .trimEnd()
        end = token.position + raw.length
        const next = lexical[index + 1]
        const type =
          token.type === 'variable'
            ? 'variable'
            : token.type === 'number'
              ? 'number'
              : next?.value === '(' &&
                  (token.type === 'identifier' ||
                    ['AND', 'OR', 'NOT'].includes(token.value))
                ? 'function'
                : token.type === 'operator'
                  ? 'operator'
                  : token.type === 'punctuation'
                    ? token.value === ','
                      ? 'comma'
                      : 'paren'
                    : 'text'
        tokens.push({
          type,
          value: type === 'variable' ? token.value : raw,
          start: token.position,
          end,
        })
      })
      if (end < formula.length)
        tokens.push({
          type: 'space',
          value: formula.slice(end),
          start: end,
          end: formula.length,
        })
      return tokens
    } catch {
      return formula
        ? [{ type: 'text', value: formula, start: 0, end: formula.length }]
        : []
    }
  }

  /** 对相同公式与变量定义复用编译结果，调整试算值时不重新解析。 */
  function analyze(formula: string): FormulaAnalysis {
    const names = variableNames.value
    const fields = variableFields.value
    const allowedFunctions = functionNames.value
    if (
      cached?.formula === formula &&
      cached.names === names &&
      cached.fields === fields &&
      cached.functions === allowedFunctions
    )
      return cached.analysis
    const analysis: FormulaAnalysis = {
      tokens: tokenize(formula),
      validation: {
        valid: true,
        message: formula.trim() ? '语法校验通过' : '尚未输入公式',
      },
      compiled: null,
    }
    if (formula.trim()) {
      try {
        analysis.compiled = compileSafeExpression(formula)
        for (const token of analysis.tokens) {
          if (token.type === 'variable' && !names.has(token.value))
            throw new Error(
              `第 ${token.start + 1} 个字符处：未知变量「${token.value}」`
            )
          if (
            token.type === 'function' &&
            !allowedFunctions.has(token.value.toUpperCase())
          )
            throw new Error(
              `第 ${token.start + 1} 个字符处：未知函数「${token.value}」`
            )
          if (
            token.type === 'text' &&
            /^[A-Za-z_]\w*$/.test(token.value) &&
            !['TRUE', 'FALSE'].includes(token.value.toUpperCase()) &&
            !fields.has(token.value)
          )
            throw new Error(
              `第 ${token.start + 1} 个字符处：未知字段「${token.value}」`
            )
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const position = /第 (\d+) 个字符/.exec(message)
        analysis.validation = {
          valid: false,
          message,
          ...(position ? { position: Number(position[1]) - 1 } : {}),
        }
        analysis.compiled = null
      }
    }
    cached = { formula, names, fields, functions: allowedFunctions, analysis }
    return analysis
  }

  /** 保持既有校验 API。 */
  function validate(formula: string): FormulaValidation {
    return analyze(formula).validation
  }
  /** 仅替换真实变量引用，保留字符串字面值与全部原始空白。 */
  function toEvalExpression(
    formula: string,
    variableMap: Map<string, string>
  ): string {
    let end = 0
    let result = ''
    for (const token of tokenize(formula).filter(
      item => item.type === 'variable'
    )) {
      result +=
        formula.slice(end, token.start) +
        (variableMap.get(token.value) ?? `__unknown_${token.value}__`)
      end = token.end
    }
    return result + formula.slice(end)
  }
  return {
    tokenize,
    analyze,
    validate,
    toEvalExpression,
    variableNames,
    functionNames,
  }
}
