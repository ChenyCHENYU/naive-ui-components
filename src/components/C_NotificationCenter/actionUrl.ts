export type NotificationAction = {
  kind: 'internal' | 'external'
  url: string
}

function hasUnsafeCharacters(url: string): boolean {
  return (
    url.includes('\\') ||
    url.startsWith('//') ||
    Array.from(url).some(character => character.charCodeAt(0) < 32)
  )
}

/** Validate an action before emitting it or handing it to browser navigation. */
export function resolveNotificationActionUrl(
  value: string | undefined
): NotificationAction | null {
  const url = value?.trim()
  if (!url || hasUnsafeCharacters(url)) return null

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        return null
      return { kind: 'external', url: parsed.href }
    } catch {
      return null
    }
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return null
  return { kind: 'internal', url }
}
