import type { Condition, WorkflowConditionField } from './types'

const operators = new Set<Condition['operator']>([
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'contains',
])

function validFieldValue(
  condition: Partial<Condition>,
  fields: readonly WorkflowConditionField[]
) {
  const field = fields.find(item => item.key === condition.field)
  if (
    !field ||
    (field.operators && !field.operators.includes(condition.operator!))
  )
    return false
  const value = condition.value!
  switch (field.type) {
    case 'number':
      return Number.isFinite(Number(value))
    case 'boolean':
      return value === 'true' || value === 'false'
    case 'date':
      return (
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        Number.isFinite(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value
      )
    default:
      return true
  }
}

/** 编辑保存与整体流程检查共用条件边界，导入数据也遵循同一口径。 */
export function isCompleteCondition(
  value: unknown,
  fields?: readonly WorkflowConditionField[]
): value is Condition {
  if (!value || typeof value !== 'object') return false
  const condition = value as Partial<Condition>
  if (condition.isDefault === true)
    return (
      [condition.id, condition.name].every(
        field => typeof field === 'string' && field.trim().length > 0
      ) &&
      typeof condition.field === 'string' &&
      typeof condition.value === 'string' &&
      operators.has(condition.operator as Condition['operator'])
    )
  const complete =
    [condition.id, condition.name, condition.field, condition.value].every(
      field => typeof field === 'string' && field.trim().length > 0
    ) && operators.has(condition.operator as Condition['operator'])
  if (!complete || !fields) return complete
  return validFieldValue(condition, fields)
}
