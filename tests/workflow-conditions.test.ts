import { expect, test } from 'bun:test'
import { isCompleteCondition } from '../src/components/C_WorkFlow/conditions'
const valid = {
  id: 'c1',
  name: '金额判断',
  field: 'amount',
  operator: 'equals',
  value: '0',
}
test('workflow conditions share strict text and operator validation without coercion', () => {
  expect(isCompleteCondition(valid)).toBe(true)
  for (const field of ['id', 'name', 'field', 'value']) {
    for (const value of ['', '  ', null, 0, false]) {
      expect(isCompleteCondition({ ...valid, [field]: value })).toBe(false)
    }
  }
  expect(isCompleteCondition({ ...valid, operator: 'unknown' })).toBe(false)
  expect(isCompleteCondition(null)).toBe(false)
  expect(isCompleteCondition([])).toBe(false)
  expect(valid.value).toBe('0')
})
