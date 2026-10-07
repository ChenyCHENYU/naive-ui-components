/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 公式配置、语法编译、隔离试算值和重置的统一编排
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { computed, ref, watch } from 'vue'
import type { FormulaEditorProps, FormulaVariable } from '../types'
import { DEFAULT_FUNCTIONS } from '../constants'
import { useFormulaParser } from './useFormulaParser'

type SampleValue = number | string | boolean

/** 调整试算值只求值已编译的语法树，不改调用方数据、不重复解析公式。 */
export function useFormulaEditor(props: FormulaEditorProps) {
  const options = computed(() => ({
    variables: props.config?.variables ?? props.variables ?? [],
    functions: props.config?.functions ?? props.functions ?? DEFAULT_FUNCTIONS,
    sampleData: props.config?.sampleData ?? props.sampleData ?? {},
    disabled: props.config?.disabled ?? props.disabled ?? false,
    placeholder:
      props.config?.placeholder ??
      props.placeholder ??
      '例如：[完成值] / [目标值] * 100',
    height: props.config?.height ?? props.height ?? 'auto',
    showPreview: props.config?.showPreview ?? props.showPreview ?? true,
    showKeyboard: props.config?.showKeyboard ?? props.showKeyboard ?? true,
    showVariablePanel:
      props.config?.showVariablePanel ?? props.showVariablePanel ?? true,
    editableSampleData:
      props.config?.editableSampleData ?? props.editableSampleData ?? true,
    templates: props.config?.templates ?? props.templates ?? [],
  }))
  const initialFormula = props.modelValue ?? ''
  const formula = ref(initialFormula)
  const overrides = ref<Record<string, SampleValue | null>>({})
  const parser = useFormulaParser(
    computed(() => options.value.variables),
    computed(() => options.value.functions)
  )
  const analysis = computed(() => parser.analyze(formula.value))
  const sampleData = computed(() => {
    const data = new Map(Object.entries(options.value.sampleData))
    for (const [field, value] of Object.entries(overrides.value)) {
      if (value === null) data.delete(field)
      else data.set(field, value)
    }
    return Object.fromEntries(data)
  })
  const fields = computed(
    () =>
      new Map(
        options.value.variables.map(variable => [variable.name, variable.field])
      )
  )
  const usedVariables = computed(() => {
    const references = analysis.value.tokens
      .filter(token => token.type === 'variable')
      .map(token => token.value)
    const directFields = analysis.value.tokens
      .filter(token => token.type === 'text')
      .map(token => token.value)
    const used = options.value.variables.filter(
      variable =>
        references.includes(variable.name) ||
        directFields.includes(variable.field)
    )
    return used.map((variable: FormulaVariable) => ({
      ...variable,
      value: sampleData.value[variable.field],
    }))
  })
  const evalResult = computed<{
    success: boolean
    result: unknown
    error?: string
  }>(() => {
    if (!analysis.value.validation.valid)
      return {
        success: false,
        result: undefined,
        error: analysis.value.validation.message,
      }
    if (!analysis.value.compiled) return { success: true, result: undefined }
    try {
      return {
        success: true,
        result: analysis.value.compiled.evaluate(
          fields.value,
          sampleData.value
        ),
      }
    } catch (error) {
      return {
        success: false,
        result: undefined,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
  /** 不允许只读状态从预览区域写入，空数字视为未提供而不是零。 */
  function updateSample(field: string, value: SampleValue | null): void {
    if (!options.value.disabled && options.value.editableSampleData)
      overrides.value = { ...overrides.value, [field]: value }
  }
  /** 重置公式和试算数据到初始配置。 */
  function reset(): void {
    formula.value = initialFormula
    overrides.value = {}
  }
  watch(
    () => props.modelValue,
    value => {
      if (value !== undefined && value !== formula.value) formula.value = value
    }
  )
  watch(
    () => options.value.sampleData,
    () => {
      overrides.value = {}
    }
  )
  return {
    options,
    formula,
    analysis,
    evalResult,
    usedVariables,
    updateSample,
    reset,
  }
}
