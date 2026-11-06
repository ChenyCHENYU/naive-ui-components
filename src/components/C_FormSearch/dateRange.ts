import { resolveSingleTemporalInput } from '../../core/temporalField'

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

const DATE_FORMATS = {
  date: { type: 'date', format: 'yyyy-MM-dd' },
  month: { type: 'month', format: 'yyyy-MM' },
  'date-range': { type: 'datetimerange', format: 'yyyy-MM-dd HH:mm' },
} as const

type DateInput =
  | { mode: 'formatted'; value: string | [string, string] | null }
  | { mode: 'timestamp'; value: number | [number, number] | null }

/** 日期控件的模型模式独立于显示格式，null 初值使用显式 valueMode 决定回写通道。 */
export function resolveSearchDateInput(
  field: { type: string; valueMode?: 'formatted' | 'timestamp' },
  value: unknown
): DateInput & {
  type: (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS]['type']
  format: string
} {
  const type =
    field.type === 'date' || field.type === 'month' ? field.type : 'date-range'
  const parsed =
    type === 'date-range'
      ? resolveDateRangeInput(value)
      : resolveSingleTemporalInput(value)
  const mode = field.valueMode ?? parsed.mode
  const metadata = DATE_FORMATS[type]
  return mode === 'formatted'
    ? {
        ...metadata,
        mode,
        value: parsed.mode === 'formatted' ? parsed.value : null,
      }
    : {
        ...metadata,
        mode,
        value: parsed.mode === 'timestamp' ? parsed.value : null,
      }
}
