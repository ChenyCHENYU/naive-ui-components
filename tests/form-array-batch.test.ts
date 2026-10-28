import { describe, expect, test } from 'bun:test'
import { useFormArray } from '../src/composables/useFormArray'
import { createBatchPatch, getRetryableKeys } from '../src/core/batchPatch'

describe('repeatable form identity and scalar patch', () => {
  test('moving/deleting rows preserves identity and isolates caller models', () => {
    const input = [{ name: 'A', nested: { quantity: 1 } }]
    const rows = useFormArray(input, { maxRows: 2 })
    const first = rows.items.value[0]
    const second = rows.append({ name: 'B', nested: { quantity: 2 } })
    expect(rows.move(second, first.key)).toBe(true)
    expect(rows.items.value[1]).toBe(first)
    first.value.nested.quantity = 9
    expect(input[0].nested.quantity).toBe(1)
    const values = rows.getValues()
    values[1].nested.quantity = 4
    expect(first.value.nested.quantity).toBe(9)
    expect(() => rows.append(input[0])).toThrow(RangeError)
    expect(rows.remove(second)).toBe(true)
    expect(rows.items.value[0].key).toBe(first.key)
    expect(rows.move('missing', null)).toBe(false)
  })
  test('patch distinguishes keep, clear and falsy assignments', () => {
    interface Form {
      name: string | null
      count: number
      active: boolean
      note: string
    }
    expect(
      createBatchPatch<Form>([
        { field: 'name', operation: 'clear' },
        { field: 'count', operation: 'set', value: 0 },
        { field: 'active', operation: 'set', value: false },
        { field: 'note', operation: 'keep' },
      ])
    ).toEqual({ name: null, count: 0, active: false })
    expect(
      createBatchPatch<Form>([{ field: 'note', operation: 'set', value: '' }])
    ).toEqual({ note: '' })
    expect(() =>
      createBatchPatch<Form>([
        { field: 'count', operation: 'keep' },
        { field: 'count', operation: 'set', value: 2 },
      ])
    ).toThrow(TypeError)
  })
  test('retry is explicit, unique and excludes successful rows', () => {
    expect(
      getRetryableKeys([
        { key: 0, status: 'failure', retryable: true },
        { key: 0, status: 'failure', retryable: true },
        { key: 1, status: 'success', retryable: true },
        { key: 2, status: 'failure' },
        { key: '1', status: 'conflict', retryable: true },
        { key: 3, status: 'failure', retryable: true },
        { key: 3, status: 'success' },
      ])
    ).toEqual([0, '1'])
  })
})
