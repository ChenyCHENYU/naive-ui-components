import { format, isValid, parse } from 'date-fns'

/** 解析本地格式化值。按原格式回验，避免部分输入被补成有效日期。 */
export function parseLocalTime(value: string, pattern: string): number | null {
  try {
    const date = parse(value, pattern, new Date())
    return isValid(date) && format(date, pattern) === value
      ? date.getTime()
      : null
  } catch {
    return null
  }
}

/** 将控件内部时间戳转换成业务字符串。 */
export function formatLocalTime(value: number, pattern: string): string | null {
  try {
    return format(value, pattern)
  } catch {
    return null
  }
}
