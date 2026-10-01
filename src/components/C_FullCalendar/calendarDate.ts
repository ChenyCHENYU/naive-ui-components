const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Build same-day event times from the date picker's local calendar date. */
export function buildLocalEventRange(
  dateValue: number | null,
  startTime: string,
  endTime: string
): { start: Date; end: Date } | null {
  if (dateValue === null || !Number.isFinite(dateValue)) return null
  const startMatch = TIME_PATTERN.exec(startTime)
  const endMatch = TIME_PATTERN.exec(endTime)
  if (!startMatch || !endMatch) return null

  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2])
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2])
  if (endMinutes <= startMinutes) return null

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return null
  const makeDate = (minutes: number) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      Math.floor(minutes / 60),
      minutes % 60
    )
  const start = makeDate(startMinutes)
  const end = makeDate(endMinutes)
  // A daylight-saving transition can make a requested local time nonexistent.
  if (
    start.getHours() * 60 + start.getMinutes() !== startMinutes ||
    end.getHours() * 60 + end.getMinutes() !== endMinutes
  )
    return null
  return { start, end }
}
