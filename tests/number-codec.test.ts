import { describe, expect, test } from 'bun:test'
import { createNumberCodec } from '../src/core/numberCodec'

describe('numeric value boundary', () => {
  test('preserves exact decimal storage and does not round it for display', () => {
    const codec = createNumberCodec({
      storage: 'decimal-string',
      fractionDigits: 2,
    })
    expect(codec.parse('90071992547409931234.005')).toBe(
      '90071992547409931234.005'
    )
    expect(() => codec.parse(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError)
    expect(codec.format('90071992547409931234.005')).toBe(
      '90071992547409931234.01'
    )
    expect(codec.format('-1.005')).toBe('-1.01')
    expect(codec.format('-0.004')).toBe('0.00')
  })
  test('zero precision, empty values and valid zero stay distinct', () => {
    const codec = createNumberCodec({ fractionDigits: 0, prefix: '¥' })
    expect(codec.parse('')).toBeNull()
    expect(codec.parse(null)).toBeNull()
    expect(codec.parse(0)).toBe(0)
    expect(codec.format(0)).toBe('¥0')
    expect(codec.format(1.5)).toBe('¥2')
    expect(codec.format(null)).toBe('—')
    expect(() => codec.parse(false)).toThrow(TypeError)
  })
  test('number conversion refuses precision loss instead of silently changing values', () => {
    const codec = createNumberCodec()
    expect(codec.parse('0.1000')).toBe(0.1)
    expect(codec.parse(0.0000001)).toBe(0.0000001)
    expect(codec.parse('001.20')).toBe(1.2)
    expect(() => codec.parse('9007199254740993')).toThrow(RangeError)
    expect(() => codec.parse('1.234567890123456789')).toThrow(RangeError)
    for (const value of ['Infinity', 'NaN', '1e20', '1,200', '1.', '0x10'])
      expect(() => codec.parse(value)).toThrow()
  })
  test('format options are captured and bounded', () => {
    const options = {
      storage: 'decimal-string' as const,
      fractionDigits: 2,
      useGrouping: true,
    }
    const codec = createNumberCodec(options)
    options.fractionDigits = 0
    expect(codec.format('1234567.985')).toBe('1,234,567.99')
    expect(() => createNumberCodec({ fractionDigits: -1 })).toThrow(RangeError)
    expect(() => createNumberCodec({ fractionDigits: 101 })).toThrow(RangeError)
    expect(() => codec.parse('1'.repeat(1001))).toThrow(TypeError)
  })
})
