/** Fails explicitly for invalid limits so callers cannot disable the preview budget. */
export function resolvePreviewLimit(
  value: number | undefined,
  fallback: number,
  name: string
): number {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`previewLimits.${name} 必须为有限正整数`)
  return value
}

export const MAX_EXCEL_PREVIEW_CELLS = 100_000
