import { expect, test } from 'bun:test'
import {
  createOptionValueBinder,
  createOptionValueBinding,
} from '../src/core/options'

test('native option values preserve false, strings, numbers and colliding strings', () => {
  const values = [
    false,
    'false',
    true,
    'true',
    0,
    '0',
    '001',
    '__c_option_boolean_false__',
  ]
  const options = values.map(value => ({ value, label: String(value) }))
  const binding = createOptionValueBinding(options, values)
  const native = binding.options!.map(option => option.value!)
  expect(new Set(native).size).toBe(values.length)
  expect(binding.decode(native)).toEqual(values)
  expect(binding.decode(native, binding.options)).toEqual(values)
  expect(binding.value).toEqual(native)
  expect(binding.fallbackOption(native[0]!).label).toBe('false')
  expect(binding.fallbackOption('__c_option_boolean_false__').label).toBe(
    '__c_option_boolean_false__'
  )
  expect(options.map(option => option.value)).toEqual(values)
})

test('unknown boolean models have readable fallback labels while null and multiselect remain distinct', () => {
  const unknown = createOptionValueBinding([], false)
  expect(unknown.decode(unknown.value as string)).toBe(false)
  expect(unknown.fallbackOption(unknown.value as string).label).toBe('false')
  const typed = String(unknown.value)
  expect(unknown.decode(typed, { value: typed, label: typed })).toBe(typed)
  expect(createOptionValueBinding([], null).value).toBeNull()
  const empty = createOptionValueBinding([], [])
  expect(empty.value).toEqual([])
  expect(empty.decode([])).toEqual([])
})

test('an external or typed token string only invalidates its colliding boolean encoding', () => {
  const existing = '__c_option_boolean_false__'
  const bind = createOptionValueBinder([
    { value: existing, label: '已有字符串' },
    { value: false, label: '停用' },
    { value: 0, label: '零' },
  ])
  const before = bind([false, 0])
  const typed = before.options![1]!.value as string
  expect(typed).not.toBe(existing)
  expect(before.decode([typed], [{ value: typed, label: typed }])).toEqual([
    typed,
  ])
  const after = bind([false, typed, 0])
  expect(after.options![0]).toBe(before.options![0])
  expect(after.options![2]).toBe(before.options![2])
  expect(after.options![1]!.value).not.toBe(typed)
  expect(after.decode(after.value)).toEqual([false, typed, 0])
  expect(after.fallbackOption(typed).label).toBe(typed)
  expect(after.fallbackOption(after.options![1]!.value!).label).toBe('false')
  expect(before.decode([typed])).toEqual([false])
})

test('custom fallback keeps labels and boolean ownership without mutating supplied options', () => {
  const token = '__c_option_boolean_false__'
  const binding = createOptionValueBinding([], [false, token])
  const supplied = Object.freeze({ label: '历史选项', class: 'historical' })
  const fallback = binding.resolveFallbackOption(() => supplied)
  expect(typeof fallback).toBe('function')
  if (fallback === false) throw new Error('expected fallback')
  const native = binding.value as string[]
  const selected = native.map(fallback)
  expect(selected.map(option => option.label)).toEqual(['历史选项', '历史选项'])
  expect(binding.decode(native, selected)).toEqual([false, token])
  expect(Reflect.ownKeys(supplied)).toEqual(['label', 'class'])
  expect(binding.resolveFallbackOption(false)).toBe(false)
  expect(
    binding.decode([native[0]], [{ value: native[0], label: native[0] }])
  ).toEqual([native[0]])
})
