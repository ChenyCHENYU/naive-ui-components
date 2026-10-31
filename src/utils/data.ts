import { isProxy, toRaw } from 'vue'

export type DataObject = Record<string, unknown>

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor'])

function hasOwnDataKey(target: object, key: string): boolean {
  // Vue 的 has trap 会追踪缺失键和新增 literal dotted key；不读取继承 getter。
  Reflect.has(target, key)
  return Object.prototype.hasOwnProperty.call(target, key)
}

function getOwnDataValue(target: unknown, key: string): unknown {
  return target !== null &&
    typeof target === 'object' &&
    hasOwnDataKey(target, key)
    ? (target as DataObject)[key]
    : undefined
}

/** Parse dot/bracket notation and reject prototype-polluting path segments. */
export function parseDataPath(path: string): string[] {
  const segments = path
    .replace(/\[([^\]]+)\]/g, '.$1')
    .split('.')
    .map(segment => segment.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
  if (segments.length === 0) throw new TypeError('Data path cannot be empty')
  if (segments.some(segment => UNSAFE_PATH_SEGMENTS.has(segment))) {
    throw new TypeError(`Unsafe data path: ${path}`)
  }
  return segments
}

/** Check a nested path while preserving legacy literal dotted keys. */
export function hasDataPath(target: DataObject, path: string): boolean {
  if (hasOwnDataKey(target, path)) return true
  let current: unknown = target
  for (const segment of parseDataPath(path)) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !hasOwnDataKey(current, segment)
    ) {
      return false
    }
    current = (current as DataObject)[segment]
  }
  return true
}

/** Read a nested path while preserving legacy literal dotted keys. */
export function getDataPath(target: DataObject, path: string): unknown {
  if (hasOwnDataKey(target, path)) return target[path]
  return parseDataPath(path).reduce<unknown>(getOwnDataValue, target)
}

/** Safely write a nested path, creating arrays and objects as needed. */
export function setDataPath(
  target: DataObject,
  path: string,
  value: unknown
): void {
  if (Object.prototype.hasOwnProperty.call(target, path)) {
    target[path] = value
    return
  }
  const segments = parseDataPath(path)
  let current: DataObject = target
  segments.forEach((segment, index) => {
    if (index === segments.length - 1) {
      current[segment] = value
      return
    }
    // 只沿当前模型拥有的分支写入，不能借用原型上的共享对象。
    const existing = getOwnDataValue(current, segment)
    if (existing === null || typeof existing !== 'object') {
      current[segment] = /^\d+$/.test(segments[index + 1]) ? [] : {}
    }
    current = current[segment] as DataObject
  })
}

/** Delete a nested path without traversing unsafe prototype segments. */
export function deleteDataPath(target: DataObject, path: string): void {
  if (Object.prototype.hasOwnProperty.call(target, path)) {
    delete target[path]
    return
  }
  const segments = parseDataPath(path)
  const last = segments.pop()
  if (!last) return
  const parent = segments.reduce<unknown>(getOwnDataValue, target)
  if (parent && typeof parent === 'object') delete (parent as DataObject)[last]
}

function unwrap<T>(value: T): T {
  return (isProxy(value) ? toRaw(value) : value) as T
}

// eslint-disable-next-line complexity -- The branches intentionally dispatch supported structured data types.
function cloneFallback<T>(value: T, seen: WeakMap<object, unknown>): T {
  const rawValue = unwrap(value)

  if (rawValue === null || typeof rawValue !== 'object') return rawValue
  if (seen.has(rawValue)) return seen.get(rawValue) as T
  if (rawValue instanceof Date) return new Date(rawValue.getTime()) as T
  if (rawValue instanceof RegExp) return new RegExp(rawValue) as T
  if (rawValue instanceof ArrayBuffer) return rawValue.slice(0) as T

  if (Array.isArray(rawValue)) {
    const result: unknown[] = []
    result.length = rawValue.length
    seen.set(rawValue, result)
    rawValue.forEach((item, index) => {
      result[index] = cloneFallback(item, seen)
    })
    return result as T
  }

  if (rawValue instanceof Map) {
    const result = new Map<unknown, unknown>()
    seen.set(rawValue, result)
    rawValue.forEach((mapValue, key) => {
      result.set(cloneFallback(key, seen), cloneFallback(mapValue, seen))
    })
    return result as T
  }

  if (rawValue instanceof Set) {
    const result = new Set<unknown>()
    seen.set(rawValue, result)
    rawValue.forEach(item => result.add(cloneFallback(item, seen)))
    return result as T
  }

  const prototype = Object.getPrototypeOf(rawValue)
  if (prototype !== Object.prototype && prototype !== null) return rawValue

  const result: DataObject = {}
  seen.set(rawValue, result)
  Reflect.ownKeys(rawValue).forEach(key => {
    if (typeof key === 'string') {
      const cloned = cloneFallback((rawValue as DataObject)[key], seen)
      if (key === '__proto__') {
        // 原始数据键不能调用 Object.prototype 的原型 setter。
        Object.defineProperty(result, key, {
          value: cloned,
          enumerable: true,
          configurable: true,
          writable: true,
        })
      } else result[key] = cloned
    }
  })
  return result as T
}

/** Clone data without dropping Date, File, Map, Set or `undefined` values. */
export function cloneData<T>(value: T): T {
  const rawValue = unwrap(value)

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(rawValue)
    } catch {
      // Functions and a few host objects are not structured-cloneable.
    }
  }

  return cloneFallback(rawValue, new WeakMap())
}

interface ComparisonContext {
  pairs: WeakMap<object, WeakSet<object>>
  additions: [object, object][]
}

const isObjectValue = (value: unknown): value is object =>
  value !== null && typeof value === 'object'

/** An unordered candidate may fail after visiting shared children; discard only its pairs. */
function tryCollectionCandidate(
  context: ComparisonContext,
  compare: () => boolean
): boolean {
  const start = context.additions.length
  if (compare()) return true
  while (context.additions.length > start) {
    const [left, right] = context.additions.pop()!
    context.pairs.get(left)?.delete(right)
  }
  return false
}

function equalMapValue(
  key: unknown,
  value: unknown,
  right: Map<unknown, unknown>,
  context: ComparisonContext
): boolean {
  return right.has(key) && deepEqualInternal(value, right.get(key), context)
}

/** Primitive keys retain native O(N) lookup; object keys match together with their values. */
function equalMaps(
  left: Map<unknown, unknown>,
  right: Map<unknown, unknown>,
  context: ComparisonContext
): boolean {
  if (left.size !== right.size) return false
  const matched = new Set<object>()
  let candidates: [object, unknown][] | undefined
  for (const [key, value] of left) {
    if (!isObjectValue(key)) {
      if (!equalMapValue(key, value, right, context)) return false
      continue
    }
    if (
      !matched.has(key) &&
      tryCollectionCandidate(context, () =>
        equalMapValue(key, value, right, context)
      )
    ) {
      matched.add(key)
      continue
    }
    candidates ??= [...right].filter((entry): entry is [object, unknown] =>
      isObjectValue(entry[0])
    )
    const match = candidates.find(
      ([otherKey, otherValue]) =>
        otherKey !== key &&
        !matched.has(otherKey) &&
        tryCollectionCandidate(
          context,
          () =>
            deepEqualInternal(key, otherKey, context) &&
            deepEqualInternal(value, otherValue, context)
        )
    )
    if (!match) return false
    matched.add(match[0])
  }
  return true
}

/** Set object members are unordered structural values, including cloned cyclic objects. */
function equalSets(
  left: Set<unknown>,
  right: Set<unknown>,
  context: ComparisonContext
): boolean {
  if (left.size !== right.size) return false
  const matched = new Set<object>()
  let candidates: object[] | undefined
  for (const value of left) {
    if (!isObjectValue(value)) {
      if (!right.has(value)) return false
      continue
    }
    if (!matched.has(value) && right.has(value)) {
      matched.add(value)
      continue
    }
    candidates ??= [...right].filter(isObjectValue)
    const match = candidates.find(
      other =>
        !matched.has(other) &&
        tryCollectionCandidate(context, () =>
          deepEqualInternal(value, other, context)
        )
    )
    if (!match) return false
    matched.add(match)
  }
  return true
}

// eslint-disable-next-line complexity -- Equality is a single dispatcher for supported structured data types.
function equalObjects(
  left: object,
  right: object,
  context: ComparisonContext
): boolean {
  let rights = context.pairs.get(left)
  if (rights?.has(right)) return true
  if (!rights) {
    rights = new WeakSet()
    context.pairs.set(left, rights)
  }
  rights.add(right)
  context.additions.push([left, right])

  if (left instanceof Date || right instanceof Date) {
    return (
      left instanceof Date &&
      right instanceof Date &&
      left.getTime() === right.getTime()
    )
  }

  if (left instanceof RegExp || right instanceof RegExp) {
    return (
      left instanceof RegExp &&
      right instanceof RegExp &&
      left.source === right.source &&
      left.flags === right.flags
    )
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (
      !Array.isArray(left) ||
      !Array.isArray(right) ||
      left.length !== right.length
    )
      return false
    // 数组保持值语义：空位与显式 undefined 等价，长度与有效值仍严格比较。
    for (let index = 0; index < left.length; index++) {
      if (!deepEqualInternal(left[index], right[index], context)) return false
    }
    return true
  }

  if (left instanceof Map || right instanceof Map) {
    if (!(left instanceof Map) || !(right instanceof Map)) return false
    return equalMaps(left, right, context)
  }

  if (left instanceof Set || right instanceof Set) {
    if (!(left instanceof Set) || !(right instanceof Set)) return false
    return equalSets(left, right, context)
  }

  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false

  return leftKeys.every(
    key =>
      Object.prototype.hasOwnProperty.call(right, key) &&
      deepEqualInternal(
        (left as DataObject)[key],
        (right as DataObject)[key],
        context
      )
  )
}

function deepEqualInternal(
  left: unknown,
  right: unknown,
  context: ComparisonContext
): boolean {
  const rawLeft = unwrap(left)
  const rawRight = unwrap(right)
  if (Object.is(rawLeft, rawRight)) return true
  if (
    rawLeft === null ||
    rawRight === null ||
    typeof rawLeft !== 'object' ||
    typeof rawRight !== 'object'
  ) {
    return false
  }
  return equalObjects(rawLeft, rawRight, context)
}

/** Cycle-safe equality for dirty checking and derived state. */
export function isDataEqual(left: unknown, right: unknown): boolean {
  return deepEqualInternal(left, right, {
    pairs: new WeakMap(),
    additions: [],
  })
}

/** Replace a reactive record while removing keys absent from the source. */
export function replaceDataObject(
  target: DataObject,
  source: DataObject
): void {
  const next = cloneData(source)
  Object.keys(target).forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(next, key)) delete target[key]
  })
  Object.assign(target, next)
}
