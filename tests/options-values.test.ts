import { expect, test } from 'bun:test'
import { createOptionValueBinding } from '../src/core/options'

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
