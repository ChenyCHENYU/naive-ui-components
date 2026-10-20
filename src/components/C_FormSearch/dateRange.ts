export type DateRangeInput =
  | { mode: 'formatted'; value: [string, string] }
  | { mode: 'timestamp'; value: [number, number] | null }

/** 搜索日期范围模型，同时支持时间戳和显式格式化日期。 */
export type SearchDateRangeValue = DateRangeInput['value']

/** Keep existing timestamp models while accepting explicitly formatted ranges. */
export const resolveDateRangeInput = (value: unknown): DateRangeInput => {
  if (Array.isArray(value) && value.length === 2) {
    if (value.every(item => typeof item === 'string')) {
      return { mode: 'formatted', value: [value[0], value[1]] }
    }
    if (
      value.every(item => typeof item === 'number' && Number.isFinite(item))
    ) {
      return { mode: 'timestamp', value: [value[0], value[1]] }
    }
  }
  return { mode: 'timestamp', value: null }
}
