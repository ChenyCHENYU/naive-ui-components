import { describe, expect, test } from 'bun:test'
import { evaluateSafeExpression } from '../src/components/C_FormulaEditor/utils/safeExpression'
import {
  formatCellValue,
  getCellClass,
  processExcelSheet,
} from '../src/components/C_FilePreview/data'
import { resolvePreviewUrl } from '../src/components/C_FilePreview/fileUrl'
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
    expect(evaluateSafeExpression('TRUE OR FALSE', fields, {})).toBe(true)
    expect(evaluateSafeExpression('FALSE AND TRUE', fields, {})).toBe(false)
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
    const sheet = processExcelSheet(
      {
        '!ref': 'A1:B2',
        A1: { v: 0 },
        B1: { v: 'Flag' },
        A2: { v: 0 },
        B2: { v: false },
      },
      []
    )
    expect(sheet.columns[0]?.title).toBe('0')
    expect(sheet.data[1]?.col_0?.value).toBe(0)
    expect(sheet.data[1]?.col_1?.value).toBe(false)
  })

  test('accepts HTTPS and same-origin file URLs only', () => {
    const base = 'http://localhost:5173/demo'
    expect(resolvePreviewUrl('/files/report.pdf', base)).toBe(
      'http://localhost:5173/files/report.pdf'
    )
    expect(resolvePreviewUrl('https://files.example/report.pdf', base)).toBe(
      'https://files.example/report.pdf'
    )
    expect(
      resolvePreviewUrl('http://files.example/report.pdf', base)
    ).toBeNull()
    expect(resolvePreviewUrl('javascript:alert(1)', base)).toBeNull()
    expect(resolvePreviewUrl('data:text/html,<script>', base)).toBeNull()
    expect(
      resolvePreviewUrl('https://user:pass@files.example/a.pdf', base)
    ).toBeNull()
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
