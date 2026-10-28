import { expect, test } from 'bun:test'
import { mergeSearchPreset } from '../src/components/C_FormSearch/fieldValue'
import type {
  SearchFormParams,
  SearchFormItem,
} from '../src/components/C_FormSearch/types'

test('preset preparation never partially modifies a model or permits prototype fields', () => {
  const current: SearchFormParams = { keyword: 'original', pageNum: 2 }
  const fields: SearchFormItem[] = [
    { type: 'input', prop: 'keyword' },
    { type: 'custom', prop: '__proto__' },
  ]
  const preset = JSON.parse('{"keyword":"new","__proto__":{"polluted":true}}')
  expect(() => mergeSearchPreset(current, fields, preset)).toThrow(TypeError)
  expect(current).toEqual({ keyword: 'original', pageNum: 2 })
  expect(
    Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')
  ).toBe(false)
})
