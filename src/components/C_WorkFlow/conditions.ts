import type { Condition } from './types'

const operators = new Set<Condition['operator']>([
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'contains',
])

/** 编辑保存与整体流程检查共用条件边界，导入数据也遵循同一口径。 */
export function isCompleteCondition(value: unknown): value is Condition {
  if (!value || typeof value !== 'object') return false
  const condition = value as Partial<Condition>
  return (
    [condition.id, condition.name, condition.field, condition.value].every(
      field => typeof field === 'string' && field.trim().length > 0
    ) && operators.has(condition.operator as Condition['operator'])
  )
}
