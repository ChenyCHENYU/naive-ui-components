import { describe, expect, test } from 'bun:test'
import { findNextCronExecutions } from '../src/components/C_Cron/cronSchedule'
import { useCronParser } from '../src/components/C_Cron/composables/useCronParser'

describe('C_Cron expression and preview contracts', () => {
  test('rejects malformed input without silently replacing the current rule', () => {
    const parser = useCronParser()
    const initial = parser.expression.value
    for (const invalid of [
      '0/0 0 0 * * ?',
      '0 0 0 ? ? ?',
      '0 0 0 1-2-3 * ?',
      '0 0 0 * * ? extra',
      '? 0 0 * * ?',
    ]) {
      expect(parser.validate(invalid).valid).toBe(false)
      expect(parser.parse(invalid)).toBe(false)
      expect(parser.expression.value).toBe(initial)
    }
  })

  test('generating a specific list does not sort its reactive input', () => {
    const parser = useCronParser()
    parser.cronValue.value.second = {
      ...parser.cronValue.value.second,
      mode: 'specific',
      specificValues: [5, 1],
    }
    expect(parser.expression.value.startsWith('1,5 ')).toBe(true)
    expect(parser.cronValue.value.second.specificValues).toEqual([5, 1])
  })

  test('second-level monthly schedules are previewed beyond six days', async () => {
    const now = new Date(2026, 0, 2, 10, 0, 0)
    const results = await findNextCronExecutions('* 0 0 1 * ?', 2, now)
    expect(results).toEqual([
      new Date(2026, 1, 1, 0, 0, 0),
      new Date(2026, 1, 1, 0, 0, 1),
    ])
  })

  test('day-of-month wildcard steps start at day one', async () => {
    const now = new Date(2026, 0, 2, 0, 0, 0)
    const results = await findNextCronExecutions('0 0 0 */5 * ?', 1, now)
    expect(results).toEqual([new Date(2026, 0, 6, 0, 0, 0)])
  })
})
