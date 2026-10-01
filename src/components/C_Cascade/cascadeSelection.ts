import type { CascadeItem, CascadeValue } from './types'

function requestedValues(
  modelValue: CascadeValue | undefined,
  current: Array<string | number | null>
) {
  if (!modelValue) return current
  return [
    modelValue.primary?.value ?? null,
    modelValue.secondary?.value ?? null,
    modelValue.tertiary?.value ?? null,
  ]
}

/** Keep only a valid ancestor-to-child path; numeric zero is a valid value. */
export function normalizeCascadeSelection(
  data: CascadeItem[],
  modelValue?: CascadeValue,
  current: Array<string | number | null> = [null, null, null]
): Array<string | number | null> {
  const requested = requestedValues(modelValue, current)
  const selected: Array<string | number | null> = [null, null, null]
  let options = data
  for (let level = 0; level < selected.length; level++) {
    const value = requested[level]
    if (value === null) break
    const item = options.find(option => option.value === value)
    if (!item) break
    selected[level] = item.value
    options = item.children ?? []
  }
  return selected
}
