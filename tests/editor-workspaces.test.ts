/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 编辑工作区的解析、隔离试算、重置与异步预览契约
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, reactive, ref } from 'vue'
import { useFormulaEditor } from '../src/components/C_FormulaEditor/composables/useFormulaEditor'
import { useFormulaEvaluator } from '../src/components/C_FormulaEditor/composables/useFormulaEvaluator'
import { useFormulaParser } from '../src/components/C_FormulaEditor/composables/useFormulaParser'
import {
  compileSafeExpression,
  evaluateSafeExpression,
} from '../src/components/C_FormulaEditor/utils/safeExpression'
import { DEFAULT_FUNCTIONS } from '../src/components/C_FormulaEditor/constants'
import { useCronEditor } from '../src/components/C_Cron/composables/useCronEditor'
import { useCronParser } from '../src/components/C_Cron/composables/useCronParser'
import type { FormulaEditorProps } from '../src/components/C_FormulaEditor/types'
import type { CronProps } from '../src/components/C_Cron/types'

const variables = [{ name: '任务', field: 'tasks', type: 'number' as const }]

describe('公式编译与试算共用语法规则', () => {
  test('字符串里的括号和变量名称不会参与引用分析', () => {
    const parser = useFormulaParser(ref(variables), ref(DEFAULT_FUNCTIONS))
    expect(parser.validate('IF(TRUE, "[不存在] (", "x")').valid).toBe(true)
    expect(
      parser.tokenize('"[不存在]"').filter(item => item.type === 'variable')
    ).toEqual([])
    expect(parser.validate('-(2 + 3)').valid).toBe(true)
    expect(evaluateSafeExpression('-(2 + 3)', new Map(), {})).toBe(-5)
  })
  test('既有独立求值 composable 也正确处理引用和多组数据', () => {
    const evaluator = useFormulaEvaluator(ref(variables))
    expect(
      evaluator.extractVariableNames('IF(TRUE, "[不存在]", [任务])')
    ).toEqual(['任务'])
    expect(evaluator.evaluate('[任务] * 2', { tasks: 3 }).result).toBe(6)
    expect(evaluator.evaluate('[任务] * 2', { tasks: 4 }).result).toBe(8)
  })
  test('精确拒绝完整语法和函数参数错误', () => {
    const parser = useFormulaParser(ref(variables), ref(DEFAULT_FUNCTIONS))
    for (const value of [
      '1 2',
      '1 + * 2',
      '(1 + 2',
      'IF(TRUE, 1)',
      'ROUND(1, 2, 3)',
      'SUM()',
      '[未知] + 1',
      'missing + 1',
    ])
      expect(parser.validate(value).valid).toBe(false)
    expect(parser.validate('1 + * 2').position).toBe(4)
  })
  test('未执行的条件分支无需数据，编译结果可以多次试算', () => {
    const compiled = compileSafeExpression('IF([任务] > 0, 100 / [任务], 0)')
    const fields = new Map([['任务', 'tasks']])
    expect(compiled.evaluate(fields, { tasks: 0 })).toBe(0)
    expect(compiled.evaluate(fields, { tasks: 5 })).toBe(20)
    for (const value of [
      'TRUE ? 1 : [缺失]',
      'IF(TRUE, 1, [缺失])',
      'TRUE OR [缺失]',
      'FALSE AND [缺失]',
      'OR(TRUE, [缺失])',
      'AND(FALSE, [缺失])',
    ])
      expect(() => evaluateSafeExpression(value, new Map(), {})).not.toThrow()
  })
  test('修改试算数据不重复解析、不修改调用方数据，零与空值区分', async () => {
    const scope = effectScope()
    const props = reactive<FormulaEditorProps>({
      modelValue: '[任务] * 2',
      config: { variables, sampleData: { tasks: 3 } },
    })
    const editor = scope.run(() => useFormulaEditor(props))!
    try {
      const compiled = editor.analysis.value.compiled
      expect(editor.evalResult.value.result).toBe(6)
      editor.updateSample('tasks', 0)
      expect(editor.evalResult.value.result).toBe(0)
      expect(editor.analysis.value.compiled).toBe(compiled)
      expect(props.config?.sampleData?.tasks).toBe(3)
      editor.updateSample('tasks', null)
      expect(editor.evalResult.value.success).toBe(false)
      editor.formula.value = '1 + 2'
      expect(editor.evalResult.value.result).toBe(3)
      props.modelValue = '10'
      await nextTick()
      editor.reset()
      expect(editor.formula.value).toBe('[任务] * 2')
      expect(editor.evalResult.value.result).toBe(6)
      props.config!.disabled = true
      editor.updateSample('tasks', 99)
      expect(editor.evalResult.value.result).toBe(6)
    } finally {
      scope.stop()
    }
  })
})

describe('Cron 工作区不显示过期计划', () => {
  test('空指定值不扩大成每秒执行；不指定日期自动交给星期', () => {
    const parser = useCronParser()
    parser.cronValue.value.second.mode = 'specific'
    parser.cronValue.value.second.specificValues = []
    expect(parser.validation.value.valid).toBe(false)
    expect(parser.expression.value.startsWith('*')).toBe(false)
    parser.cronValue.value.day.mode = 'none'
    parser.handleDayWeekExclusion('day')
    expect(parser.cronValue.value.week.mode).toBe('every')
  })
  test('隐藏预览不计算，草稿错误清空结果，重置恢复初始值', async () => {
    const scope = effectScope()
    const props = reactive<CronProps>({
      modelValue: '* * * * * ?',
      config: { showPreview: false, previewCount: 0 },
    })
    const editor = scope.run(() => useCronEditor(props))!
    try {
      expect(editor.preview.computing.value).toBe(false)
      expect(editor.options.value.previewCount).toBe(1)
      props.config!.showPreview = true
      await nextTick()
      await Bun.sleep(30)
      expect(editor.preview.nextExecutions.value.length).toBe(1)
      editor.draft.value = 'broken'
      await nextTick()
      expect(editor.preview.nextExecutions.value).toEqual([])
      expect(editor.expression.value).toBe('* * * * * ?')
      expect(editor.apply()).toBe(false)
      editor.apply('0 30 8 * * ?')
      editor.reset()
      expect(editor.expression.value).toBe('* * * * * ?')
      expect(editor.validation.value.valid).toBe(true)
    } finally {
      scope.stop()
    }
    await Bun.sleep(10)
    expect(editor.preview.nextExecutions.value).toEqual([])
  })
})
