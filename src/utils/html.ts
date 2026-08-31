import createDOMPurify, { type DOMPurify } from 'dompurify'

let purifier: DOMPurify | null = null

function getPurifier() {
  if (typeof window === 'undefined') return null
  purifier ??= createDOMPurify(window)
  return purifier
}

/** Escape text for SSR, where a browser DOM sanitizer is not available. */
export function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Sanitize user-provided rich HTML before passing it to `v-html`. */
export function sanitizeRichHtml(value: string): string {
  const instance = getPurifier()
  if (!instance) return escapeHtmlText(value)
  return instance.sanitize(value, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [
      'style',
      'form',
      'input',
      'button',
      'iframe',
      'object',
      'embed',
    ],
    FORBID_ATTR: ['style'],
    ADD_DATA_URI_TAGS: ['img'],
  }) as string
}

/** Sanitize SVG generated or supplied to visual components. */
export function sanitizeSvg(value: string): string {
  const instance = getPurifier()
  if (!instance) return ''
  return instance.sanitize(value, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ['foreignObject', 'script'],
    FORBID_ATTR: ['onload', 'onclick', 'onerror'],
  }) as string
}
