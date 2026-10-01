const blockedKeys = new Set(['__proto__', 'prototype', 'constructor'])

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/** Merge config objects without mutating presets or traversing prototype keys. */
export function mergeGanttOptions(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const seen = new WeakMap<object, Record<string, unknown>>()

  const merge = (
    current: Record<string, unknown>,
    incoming: Record<string, unknown>
  ): Record<string, unknown> => {
    const prior = seen.get(incoming)
    if (prior) return prior

    const result = { ...current }
    seen.set(incoming, result)
    for (const [key, value] of Object.entries(incoming)) {
      if (blockedKeys.has(key)) continue
      result[key] = isPlainRecord(value)
        ? merge(isPlainRecord(current[key]) ? current[key] : {}, value)
        : value
    }
    return result
  }

  return merge(target, source)
}
