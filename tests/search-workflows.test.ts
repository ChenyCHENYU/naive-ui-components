import { describe, expect, test } from 'bun:test'
import { resolveSearchDateInput } from '../src/components/C_FormSearch/dateRange'
import { serializeSearch } from '../src/components/C_FormSearch/serializeSearch'
import {
  isSearchValueEmpty,
  resolveSearchResetValue,
  normalizeSearchFieldValue,
} from '../src/components/C_FormSearch/fieldValue'
import type {
  SearchFormItem,
  SearchNumberRangeValue,
} from '../src/components/C_FormSearch/types'

interface Query {
  tenant: string
  amount: number | null
  enabled: boolean | null
  period: [string, string] | null
  bounds: SearchNumberRangeValue
  keyword: string
}
const fields: SearchFormItem<Query>[] = [
  { prop: 'tenant', type: 'input', fixed: true },
  { prop: 'amount', type: 'number' },
  { prop: 'enabled', type: 'select' },
  {
    prop: 'period',
    type: 'date-range',
    valueMode: 'formatted',
    query: { keys: ['start', 'end'] },
  },
  {
    prop: 'bounds',
    type: 'number-range',
    query: { keys: ['minimum', 'maximum'] },
  },
  {
    prop: 'keyword',
    type: 'input',
    query: { name: 'q', serialize: value => String(value).trim() },
  },
]
const model: Query = {
  tenant: '001',
  amount: 0,
  enabled: false,
  period: ['2026-10-01', '2026-10-31'],
  bounds: [0, null],
  keyword: ' steel ',
}

describe('explicit search request encoding', () => {
  test('splits ranges and maps names without changing draft or primitive types', () => {
    const output = serializeSearch(model, fields)
    expect(output).toEqual({
      tenant: '001',
      amount: 0,
      enabled: false,
      start: '2026-10-01',
      end: '2026-10-31',
      minimum: 0,
      q: 'steel',
    })
    expect(model.keyword).toBe(' steel ')
    expect(model.period).toEqual(['2026-10-01', '2026-10-31'])
    expect(output.period).toBeUndefined()
  })
  test('clears both encoded endpoints and preserves explicit nulls when requested', () => {
    const empty = { ...model, period: null, bounds: null, keyword: '' }
    expect(serializeSearch(empty, fields)).toEqual({
      tenant: '001',
      amount: 0,
      enabled: false,
    })
    expect(serializeSearch(empty, fields, { omitEmpty: false })).toEqual({
      tenant: '001',
      amount: 0,
      enabled: false,
      start: null,
      end: null,
      minimum: null,
      maximum: null,
      q: '',
    })
  })
  test('retains unconfigured context and clones nested payload data', () => {
    const params = { name: 'a', context: { ids: ['001'] } }
    const output = serializeSearch(params, [{ type: 'input', prop: 'name' }])
    ;(output.context as { ids: string[] }).ids.push('2')
    expect(params.context.ids).toEqual(['001'])
  })
  test('rejects unsafe and colliding destinations instead of dropping a fixed scope', () => {
    expect(() =>
      serializeSearch({ name: 'a' }, [
        { type: 'input', prop: 'name', query: { name: '__proto__.polluted' } },
      ])
    ).toThrow('Unsafe')
    expect(() =>
      serializeSearch(model, [
        ...fields,
        { prop: 'tenant', type: 'input', query: { name: 'minimum' } },
      ])
    ).toThrow('Duplicate search query key')
  })
})

test('empty and reset semantics retain zero, false, fixed contexts and custom defaults', () => {
  for (const value of [0, false, '001', [null, 0]])
    expect(isSearchValueEmpty(value)).toBe(false)
  for (const value of [null, undefined, '', [], [null, null]])
    expect(isSearchValueEmpty(value)).toBe(true)
  expect(resolveSearchResetValue({ type: 'number', defaultValue: 0 }, 2)).toBe(
    0
  )
  expect(
    resolveSearchResetValue({ type: 'select', defaultValue: false }, true)
  ).toBe(false)
  expect(
    resolveSearchResetValue(
      { type: 'input', fixed: true, defaultValue: 'fallback' },
      '001'
    )
  ).toBe('001')
  expect(
    normalizeSearchFieldValue(
      { type: 'number', defaultValue: 0, attrs: { clearable: false } },
      null,
      2
    )
  ).toBe(0)
  expect(
    normalizeSearchFieldValue(
      { type: 'custom', defaultValue: { codes: [] } },
      null,
      { codes: ['a'] }
    )
  ).toEqual({ codes: [] })
})

test('explicit formatted date mode remains stable with null values, and timestamp zero stays valid', () => {
  expect(
    resolveSearchDateInput({ type: 'month', valueMode: 'formatted' }, null)
  ).toEqual({
    type: 'month',
    format: 'yyyy-MM',
    mode: 'formatted',
    value: null,
  })
  expect(resolveSearchDateInput({ type: 'date' }, 0)).toEqual({
    type: 'date',
    format: 'yyyy-MM-dd',
    mode: 'timestamp',
    value: 0,
  })
  expect(
    resolveSearchDateInput({ type: 'date-range', valueMode: 'formatted' }, [
      '2026-10-01',
      '2026-10-02',
    ]).value
  ).toEqual(['2026-10-01', '2026-10-02'])
  expect(resolveSearchDateInput({ type: 'date' }, Number.NaN).value).toBeNull()
})

test('query serializers receive isolated data rather than mutating a selected custom object', () => {
  const params = { custom: { ids: ['001'] } }
  const output = serializeSearch(params, [
    {
      type: 'custom',
      prop: 'custom',
      defaultValue: { ids: [] },
      query: {
        serialize: value => {
          const selected = value as { ids: string[] }
          selected.ids.push('002')
          return selected.ids
        },
      },
    },
  ])
  expect(output.custom).toEqual(['001', '002'])
  expect(params.custom.ids).toEqual(['001'])
})
