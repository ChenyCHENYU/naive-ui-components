import type {
  FilterField,
  FilterGroup,
  FilterIssue,
  FilterIssueCode,
  FilterLogic,
  FilterOperator,
  FilterRule,
  FilterValidationOptions,
  FilterValue,
} from './types'

const equality = ['eq', 'ne'] as const
const empty = ['isEmpty', 'isNotEmpty'] as const
const ordered = ['gt', 'gte', 'lt', 'lte'] as const
const operatorsByType = {
  text: ['contains', ...equality, 'startsWith', 'endsWith', ...empty],
  number: [...equality, ...ordered, ...empty],
  date: [...equality, ...ordered, ...empty],
  select: [...equality, ...empty],
  boolean: [...equality, ...empty],
} satisfies Record<FilterField['type'], readonly FilterOperator[]>

export const createFilterGroup = <K extends string = string>(
  id = 'root'
): FilterGroup<K> => ({
  type: 'group',
  id,
  operator: 'and',
  children: [],
})

/** Resolve a bounded nesting budget for both editing and validation. */
export function resolveFilterDepth(maxDepth?: number) {
  return maxDepth !== undefined && Number.isFinite(maxDepth)
    ? Math.max(0, Math.min(8, Math.trunc(maxDepth)))
    : 4
}

/** Return the supported operators in the order the field presents them. */
export function getFilterOperators(
  field: FilterField
): readonly FilterOperator[] {
  const defaults: readonly FilterOperator[] = operatorsByType[field.type] ?? []
  return field.operators
    ? [...new Set(field.operators)].filter(operator =>
        defaults.includes(operator)
      )
    : defaults
}

/** Index the first usable definition for each field key. */
export function getFilterFields<K extends string>(
  fields: readonly FilterField<K>[]
) {
  const byKey = new Map<K, FilterField<K>>()
  for (const field of fields) {
    if (
      field.key &&
      !byKey.has(field.key) &&
      getFilterOperators(field).length
    ) {
      byKey.set(field.key, field)
    }
  }
  return byKey
}

/** Empty checks are complete without a value editor. */
export function hasFilterValue(operator: FilterOperator) {
  return operator !== 'isEmpty' && operator !== 'isNotEmpty'
}

/** Recognize the two supported group operators. */
export function isFilterLogic(value: unknown): value is FilterLogic {
  return value === 'and' || value === 'or'
}

/** Check the shape needed to render or traverse a group. */
export function isFilterGroup<K extends string>(
  value: unknown
): value is FilterGroup<K> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'group' &&
    'children' in value &&
    Array.isArray(value.children)
  )
}

/** Identify a rule before checking its field and value against the current schema. */
export function isFilterRule<K extends string>(
  value: unknown
): value is FilterRule<K> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'rule'
  )
}

/** Validate date-only values without applying the browser's local time zone. */
export function isFilterDate(value: FilterValue): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const timestamp = Date.parse(value)
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value
  )
}

function isFieldValueValid(field: FilterField, value: FilterValue) {
  switch (field.type) {
    case 'text':
      return typeof value === 'string' && value.trim().length > 0
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'date':
      return isFilterDate(value)
    case 'select':
      return field.options.some(item => item.value === value && !item.disabled)
    case 'boolean':
      return typeof value === 'boolean'
  }
}

function getFilterRuleIssue<K extends string>(
  rule: FilterRule<K>,
  fields: ReadonlyMap<K, FilterField<K>>
): FilterIssueCode | undefined {
  const field = fields.get(rule.field)
  if (!field) return 'unknownField'
  if (!getFilterOperators(field).includes(rule.operator))
    return 'invalidOperator'
  if (
    hasFilterValue(rule.operator)
      ? !isFieldValueValid(field, rule.value)
      : rule.value !== null
  ) {
    return 'invalidValue'
  }
}

/** Reports unusable drafts without rewriting persisted rules or executing the query. */
export function validateFilter<K extends string>(
  value: FilterGroup<K> | null | undefined,
  fields: readonly FilterField<K>[],
  options?: FilterValidationOptions
): FilterIssue[] {
  if (value == null) return []
  if (!isFilterGroup<K>(value)) return [{ code: 'invalidNode', path: [] }]
  const issues: FilterIssue[] = []
  const byKey = getFilterFields(fields)
  const maxDepth = resolveFilterDepth(options?.maxDepth)
  const ids = new Set<string>()
  const checkId = (id: unknown, path: number[]) => {
    if (typeof id !== 'string' || !id)
      issues.push({ code: 'invalidNode', path })
    else if (ids.has(id)) issues.push({ code: 'duplicateId', path })
    else ids.add(id)
  }
  const visit = (node: unknown, path: number[], depth: number) => {
    if (!isFilterGroup<K>(node) && !isFilterRule<K>(node)) {
      issues.push({ code: 'invalidNode', path })
      return
    }
    checkId(node.id, path)

    if (isFilterRule<K>(node)) {
      const code = getFilterRuleIssue(node, byKey)
      if (code) issues.push({ code, path })
      return
    }
    if (depth > maxDepth) {
      issues.push({ code: 'maxDepth', path })
      return
    }
    if (!isFilterLogic(node.operator))
      issues.push({ code: 'invalidOperator', path })
    if (path.length && !node.children.length)
      issues.push({ code: 'emptyGroup', path })
    // for...of visits holes in malformed arrays so they are reported too.
    for (const [index, child] of node.children.entries())
      visit(child, [...path, index], depth + 1)
  }
  visit(value, [], 0)
  return issues
}
