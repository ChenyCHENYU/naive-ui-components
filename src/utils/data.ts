import { isProxy, toRaw } from 'vue'

export type DataObject = Record<string, unknown>

const UNSAFE_PATH_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor'])

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
  if (Object.prototype.hasOwnProperty.call(target, path)) return true
  let current: unknown = target
  for (const segment of parseDataPath(path)) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return false
    }
    current = (current as DataObject)[segment]
  }
  return true
}

/** Read a nested path while preserving legacy literal dotted keys. */
export function getDataPath(target: DataObject, path: string): unknown {
  if (Object.prototype.hasOwnProperty.call(target, path)) return target[path]
  return parseDataPath(path).reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as DataObject)[segment]
  }, target)
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
    const existing = current[segment]
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
  const parent = segments.reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as DataObject)[segment]
  }, target)
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
    seen.set(rawValue, result)
    rawValue.forEach(item => result.push(cloneFallback(item, seen)))
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
      result[key] = cloneFallback((rawValue as DataObject)[key], seen)
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

// eslint-disable-next-line complexity -- Equality is a single dispatcher for supported structured data types.
function equalObjects(
  left: object,
  right: object,
  compared: WeakMap<object, object>
): boolean {
  if (compared.get(left) === right) return true
  compared.set(left, right)

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
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) =>
        deepEqualInternal(item, right[index], compared)
      )
    )
  }

  if (left instanceof Map || right instanceof Map) {
    if (!(left instanceof Map) || !(right instanceof Map)) return false
    if (left.size !== right.size) return false
    return [...left.entries()].every(([key, value]) => {
      if (!right.has(key)) return false
      return deepEqualInternal(value, right.get(key), compared)
    })
  }

  if (left instanceof Set || right instanceof Set) {
    if (!(left instanceof Set) || !(right instanceof Set)) return false
    if (left.size !== right.size) return false
    return [...left].every(value => right.has(value))
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
        compared
      )
  )
}

function deepEqualInternal(
  left: unknown,
  right: unknown,
  compared: WeakMap<object, object>
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
  return equalObjects(rawLeft, rawRight, compared)
}

/** Cycle-safe equality for dirty checking and derived state. */
export function isDataEqual(left: unknown, right: unknown): boolean {
  return deepEqualInternal(left, right, new WeakMap())
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
