import { describe, expect, test } from 'bun:test'
import { resolveDateRangeInput } from '../src/components/C_FormSearch/dateRange'

describe('C_FormSearch date range model', () => {
  test('preserves numeric timestamp ranges for existing consumers', () => {
    expect(resolveDateRangeInput([0, 86_400_000])).toEqual({
      mode: 'timestamp',
      value: [0, 86_400_000],
    })
    expect(resolveDateRangeInput(null)).toEqual({
      mode: 'timestamp',
      value: null,
    })
  })

  test('uses formatted values only for string ranges', () => {
    expect(resolveDateRangeInput(['2026-10-01', '2026-10-02'])).toEqual({
      mode: 'formatted',
      value: ['2026-10-01', '2026-10-02'],
    })
    expect(resolveDateRangeInput(['2026-10-01', 0])).toEqual({
      mode: 'timestamp',
      value: null,
    })
  })
})
