const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

const getDate = (value: number | null): Date | null => {
  if (value === null || !Number.isFinite(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const setLocalTime = (day: Date, time: string): Date | null => {
  const match = TIME_PATTERN.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const date = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes
  )
  // 夏令时切换可能使某个本地时间不存在，不能静默顺延。
  return date.getHours() === hours && date.getMinutes() === minutes
    ? date
    : null
}

/** 使用本地日历日期构造区间；可选结束日期支持跨日事件。 */
export function buildLocalEventRange(
  dateValue: number | null,
  startTime: string,
  endTime: string,
  endDateValue: number | null = dateValue,
  allDay = false
): { start: Date; end: Date } | null {
  const date = getDate(dateValue)
  const endDate = getDate(endDateValue)
  if (!date || !endDate) return null
  if (allDay) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    // 界面选择包含最后一天，写回 FullCalendar 时转换为排他结束日。
    const end = new Date(
      endDate.getFullYear(),
      endDate.getMonth(),
      endDate.getDate() + 1
    )
    return end > start ? { start, end } : null
  }
  const start = setLocalTime(date, startTime)
  const end = setLocalTime(endDate, endTime)
  return start && end && end > start ? { start, end } : null
}
