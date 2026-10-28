/** 跨表单与网格共享的错误定位地址；只表达身份，不依赖具体控件。 */
export interface ValidationTarget {
  section?: string
  tab?: string
  rowKey?: string | number
  field?: string
}

export interface ValidationIssue {
  key: string
  source: string
  message: string
  target?: ValidationTarget
}

/** 内部统一地址编码；规则标识保持不透明，数值与字符串行身份不可碰撞。 */
export function validationIssueKey(
  source: string,
  message: string,
  target: ValidationTarget = {},
  ruleKey?: string
): string {
  return JSON.stringify([
    source,
    ruleKey ?? null,
    target.section ?? null,
    target.tab ?? null,
    target.rowKey === undefined
      ? null
      : [typeof target.rowKey, String(target.rowKey)],
    target.field ?? null,
    message,
  ])
}

function issueFromError(
  value: object,
  source: string,
  target: ValidationTarget
): ValidationIssue | null {
  const record = value as { message?: unknown; field?: unknown }
  if (typeof record.message !== 'string' || !record.message) return null
  const field = typeof record.field === 'string' ? record.field : target.field
  const address = { ...target, field }
  return {
    key: validationIssueKey(source, record.message, address),
    source,
    message: record.message,
    target: address,
  }
}

function isUnreadObject(value: unknown, seen: Set<object>): value is object {
  return value !== null && typeof value === 'object' && !seen.has(value)
}

/** 将 Naive/async-validator 错误数组转换为可导航的问题，不修改原错误。 */
export function collectValidationIssues(
  error: unknown,
  source: string,
  target: ValidationTarget = {}
): ValidationIssue[] {
  const pending: unknown[] = [error]
  const seen = new Set<object>()
  const issues: ValidationIssue[] = []
  const keys = new Set<string>()
  while (pending.length) {
    const value = pending.pop()
    if (!isUnreadObject(value, seen)) continue
    seen.add(value)
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index--)
        pending.push(value[index])
      continue
    }
    const issue = issueFromError(value, source, target)
    if (!issue || keys.has(issue.key)) continue
    keys.add(issue.key)
    issues.push(issue)
  }
  if (!issues.length)
    issues.push({
      key: validationIssueKey(
        source,
        '请检查该区域的输入',
        target,
        'validation'
      ),
      source,
      message: '请检查该区域的输入',
      target: { ...target },
    })
  return issues
}
