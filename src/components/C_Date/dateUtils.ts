import { parseLocalTime } from '../../utils/localTime'

/** 只比较本地日历日期，保留当前时区的午夜边界。 */
export function localDayStart(
  value: number | string,
  pattern = 'yyyy-MM-dd'
): number {
  const date = new Date(
    typeof value === 'string' ? (parseLocalTime(value, pattern) ?? NaN) : value
  )
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}
