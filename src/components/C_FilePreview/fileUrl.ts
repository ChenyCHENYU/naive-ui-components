/** Allow secure remote files and local development files without executable URL schemes. */
export function resolvePreviewUrl(
  value: string,
  baseUrl: string
): string | null {
  if (!value.trim()) return null
  try {
    const base = new URL(baseUrl)
    const target = new URL(value, base)
    if (target.username || target.password) return null
    if (target.protocol === 'https:') return target.href
    if (target.protocol === 'http:' && target.origin === base.origin) {
      return target.href
    }
  } catch {
    // Invalid URLs must not reach fetch or window.open.
  }
  return null
}
