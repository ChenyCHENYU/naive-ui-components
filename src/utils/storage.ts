/** SSR-safe localStorage helpers. Storage failures never break component state. */

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function serialize(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  const serialized = JSON.stringify(value)
  return serialized === undefined ? String(value) : serialized
}

/** Store a value. Returns false when storage is unavailable or full. */
export function setItem<T>(key: string, value: T): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(key, serialize(value))
    return true
  } catch {
    return false
  }
}

/** Read and safely deserialize a value. */
export function getItem<T = unknown>(key: string): T | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    const data = storage.getItem(key)
    if (data === null) return null
    try {
      return JSON.parse(data) as T
    } catch {
      return data as T
    }
  } catch {
    return null
  }
}

/** Remove one value. Returns whether the storage operation was available. */
export function removeItem(key: string): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Clear localStorage for backward compatibility.
 * Prefer `removeItem` in components so unrelated application data is preserved.
 */
export function removeAllItem(): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.clear()
    return true
  } catch {
    return false
  }
}
