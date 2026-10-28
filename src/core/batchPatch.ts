/** 批改只表达显式标量变更，预览和后端事务由使用方组合。 */
export type PatchScalar = string | number | boolean | null
export type BatchFieldChange<T extends object> = {
  [K in Extract<keyof T, string>]: NonNullable<T[K]> extends Exclude<
    PatchScalar,
    null
  >
    ? | { field: K; operation: 'keep' }
      | { field: K; operation: 'set'; value: Exclude<T[K], undefined> }
      | (null extends T[K] ? { field: K; operation: 'clear' } : never)
    : never
}[Extract<keyof T, string>]

const UNSAFE_FIELDS = new Set(['__proto__', 'constructor', 'prototype'])

/** keep 不发送，clear 发送 null，set 保留 0/false/空串；不会修改原记录。 */
export function createBatchPatch<T extends object>(
  changes: readonly BatchFieldChange<T>[]
): Partial<T> {
  const patch: Record<string, PatchScalar> = {}
  const seen = new Set<string>()
  for (const change of changes) {
    if (UNSAFE_FIELDS.has(change.field) || seen.has(change.field))
      throw new TypeError(`批改字段必须安全且唯一：${change.field}`)
    seen.add(change.field)
    if (change.operation === 'keep') continue
    const value = change.operation === 'clear' ? null : change.value
    if (
      value !== null &&
      !['string', 'number', 'boolean'].includes(typeof value)
    )
      throw new TypeError('批改只支持显式标量值')
    if (typeof value === 'number' && !Number.isFinite(value))
      throw new TypeError('批改数值必须有限')
    Object.defineProperty(patch, change.field, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    })
  }
  return patch as Partial<T>
}

export interface BatchOperationResult<
  K extends string | number = string | number,
> {
  key: K
  status: 'success' | 'failure' | 'conflict' | 'skipped'
  message?: string
  retryable?: boolean
}

/** 失败重试仅包含后端明确允许的行，不把成功行再次提交。 */
export function getRetryableKeys<K extends string | number>(
  results: readonly BatchOperationResult<K>[]
): K[] {
  const latest = new Map(results.map(item => [item.key, item]))
  return [...latest.values()]
    .filter(
      item =>
        item.retryable &&
        (item.status === 'failure' || item.status === 'conflict')
    )
    .map(item => item.key)
}
