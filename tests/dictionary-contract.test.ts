import { describe, expect, test } from 'bun:test'
import {
  createDictionaryLabelResolver,
  decodeDictionaryControlValue,
  encodeDictionaryControlValue,
  getDictionaryLabel,
  parseDictionaryValue,
  toDictionaryControlOptions,
  type DictionaryOption,
} from '../src/core/dictionary'

const options: readonly DictionaryOption[] = [
  { value: '001', label: '首项' },
  { value: 0, label: '零' },
  { value: false, label: '否' },
  { value: 'false', label: '字符串否' },
  { value: 'A', label: '重复' },
  { value: 'B', label: '重复' },
  { value: 'code-first', label: 'A' },
]

describe('字典纯值契约', () => {
  test('原值、空值与未知码展示不混淆，不用 label 替换存储值', () => {
    expect(getDictionaryLabel('001', options)).toBe('首项')
    expect(getDictionaryLabel(1, options)).toBe('1')
    expect(getDictionaryLabel(0, options)).toBe('零')
    expect(getDictionaryLabel(false, options)).toBe('否')
    expect(getDictionaryLabel('false', options)).toBe('字符串否')
    expect(getDictionaryLabel(null, options)).toBe('')
    expect(getDictionaryLabel('NEW', options)).toBe('NEW')
  })

  test('解析严格原码优先，字符串原码可恢复类型，重复标签明确歧义', () => {
    expect(parseDictionaryValue('A', options)).toEqual({ ok: true, value: 'A' })
    expect(parseDictionaryValue('0', options)).toEqual({ ok: true, value: 0 })
    expect(parseDictionaryValue('false', options)).toEqual({
      ok: true,
      value: 'false',
    })
    expect(parseDictionaryValue('否', options)).toEqual({
      ok: true,
      value: false,
    })
    expect(parseDictionaryValue('首项', options)).toEqual({
      ok: true,
      value: '001',
    })
    expect(parseDictionaryValue('重复', options)).toEqual({
      ok: false,
      reason: 'ambiguous',
      input: '重复',
    })
    expect(parseDictionaryValue('missing', options)).toEqual({
      ok: false,
      reason: 'unknown',
      input: 'missing',
    })
  })

  test('派生索引按快照创建，不因外部选项对象变更而暗改', () => {
    const source = [{ value: 0, label: '旧' }]
    const label = createDictionaryLabelResolver(source)
    source[0]!.label = '新'
    expect(label(0)).toBe('旧')
    expect(label(false)).toBe('false')
    expect(createDictionaryLabelResolver(source)(0)).toBe('新')
  })

  test('控件边界编码可逆，字符串即使像内部编码也不会碰撞', () => {
    const raw = [false, 'false', 0, '0', '001', '["boolean",false]']
    const encoded = encodeDictionaryControlValue(raw) as string[]
    expect(new Set(encoded).size).toBe(raw.length)
    expect(decodeDictionaryControlValue(encoded)).toEqual(raw)
    expect(decodeDictionaryControlValue(null)).toBeNull()
    expect(toDictionaryControlOptions(options)[2]).toEqual({
      value: '["boolean",false]',
      label: '否',
    })
    expect(options[2]!.value).toBe(false)
  })
})
