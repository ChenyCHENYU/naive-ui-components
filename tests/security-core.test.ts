import { describe, expect, test } from 'bun:test'
import { evaluateSafeExpression } from '../src/components/C_FormulaEditor/utils/safeExpression'
import {
  formatCellValue,
  getCellClass,
} from '../src/components/C_FilePreview/data'
import { getDefaultAvatar } from '../src/components/C_WorkFlow/data'
import { getItem, removeItem, setItem } from '../src/utils/storage'

describe('safe formula evaluation', () => {
  const fields = new Map([
    ['完成值', 'completed'],
    ['目标值', 'target'],
  ])

  test('supports arithmetic, comparisons, functions, and conditions', () => {
    const result = evaluateSafeExpression(
      'IF(AND([完成值] >= 10, [目标值] > 0), ROUND([完成值] / [目标值], 2), 0)',
      fields,
      { completed: 10, target: 3 }
    )

    expect(result).toBe(3.33)
  })

  test('supports infix logical operators and string comparisons', () => {
    expect(
      evaluateSafeExpression(
        '[完成值] > 5 AND "ready" == "ready" ? 1 : 0',
        fields,
        {
          completed: 6,
          target: 10,
        }
      )
    ).toBe(1)
  })

  test('rejects property traversal and inherited prototype values', () => {
    expect(() =>
      evaluateSafeExpression('constructor.constructor("return 1")', fields, {
        completed: 1,
        target: 1,
      })
    ).toThrow('不受支持')

    expect(() =>
      evaluateSafeExpression('[危险值]', new Map([['危险值', '__proto__']]), {})
    ).toThrow('缺少样例数据')
  })

  test('bounds expression size', () => {
    expect(() =>
      evaluateSafeExpression('1'.repeat(10_001), fields, {})
    ).toThrow('公式长度不能超过')
  })

  test('rejects non-finite arithmetic results', () => {
    expect(() => evaluateSafeExpression('1 / 0', fields, {})).toThrow(
      '有限数值'
    )
  })
})

describe('SSR and spreadsheet data safety', () => {
  test('storage helpers fail safely without a browser', () => {
    expect(getItem('missing')).toBeNull()
    expect(setItem('key', { value: 1 })).toBe(false)
    expect(removeItem('key')).toBe(false)
  })

  test('keeps numeric zero visible in spreadsheet previews', () => {
    expect(formatCellValue(0)).toBe('0')
    expect(getCellClass(0)).toBe('cell-number')
  })

  test('generates workflow avatars locally and escapes SVG text', () => {
    const avatar = getDefaultAvatar('<script>')
    const svg = decodeURIComponent(avatar.split(',')[1] ?? '')

    expect(avatar.startsWith('data:image/svg+xml')).toBe(true)
    expect(svg).toContain('&lt;S')
    expect(svg).not.toContain('<script>')
    expect(avatar.startsWith('http')).toBe(false)
  })
})
