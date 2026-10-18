/** Percentages describe the space remaining after the gutter. Pixel limits are real panel sizes. */
export interface SplitBoundsInput {
  minSize: number
  maxSize: number
  minFirstSize: number
  minSecondSize: number
  availableLength: number
}

export const finiteSize = (value: number | undefined, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const normalizeGutterSize = (value: number | undefined) =>
  Math.max(4, finiteSize(value, 6))

/** Intersect responsive pixel minima with normalized percentage bounds. */
export function getSplitBounds(input: SplitBoundsInput) {
  const first = Math.max(0, Math.min(100, finiteSize(input.minSize, 0)))
  const second = Math.max(0, Math.min(100, finiteSize(input.maxSize, 100)))
  const percentMin = Math.min(first, second)
  const percentMax = Math.max(first, second)
  const available = Math.max(0, finiteSize(input.availableLength, 0))
  if (!available) return { min: percentMin, max: percentMax }

  const minFirst = Math.max(0, finiteSize(input.minFirstSize, 0))
  const minSecond = Math.max(0, finiteSize(input.minSecondSize, 0))
  const min = Math.max(percentMin, (minFirst / available) * 100)
  const max = Math.min(percentMax, 100 - (minSecond / available) * 100)
  if (min <= max) return { min, max }

  // A small container cannot satisfy both pixel minima. Share the remaining space
  // proportionally instead of producing negative widths or overflowing its parent.
  const ratio =
    minFirst + minSecond ? (minFirst / (minFirst + minSecond)) * 100 : 50
  const fallback = Math.max(percentMin, Math.min(percentMax, ratio))
  return { min: fallback, max: fallback }
}

/** Normalize finite percentages to the current safe display range. */
export function clampSplitSize(size: number, min: number, max: number) {
  return Math.min(max, Math.max(min, finiteSize(size, 50)))
}
