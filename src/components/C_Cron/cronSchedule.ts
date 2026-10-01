/** Cron 表达式只支持编辑器生成的 6 字段形式。 */
function matchesPart(value: number, part: string, min: number): boolean {
  if (part === '*' || part === '?') return true
  if (part.includes('/')) {
    const [startPart, intervalPart] = part.split('/')
    const start = startPart === '*' ? min : Number(startPart)
    const interval = Number(intervalPart)
    return interval > 0 && value >= start && (value - start) % interval === 0
  }
  if (part.includes('-')) {
    const [start, end] = part.split('-').map(Number)
    return value >= start && value <= end
  }
  return part.split(',').some(item => Number(item) === value)
}

function matchesMinute(date: Date, parts: string[]): boolean {
  const [, minute, hour, day, month, week] = parts
  return (
    matchesPart(date.getMinutes(), minute, 0) &&
    matchesPart(date.getHours(), hour, 0) &&
    matchesPart(date.getDate(), day, 1) &&
    matchesPart(date.getMonth() + 1, month, 1) &&
    matchesPart(date.getDay() + 1, week, 1)
  )
}

function appendMatchingSeconds(
  results: Date[],
  minute: Date,
  seconds: number[],
  now: Date,
  target: number
): boolean {
  for (const second of seconds) {
    const candidate = new Date(minute.getTime() + second * 1000)
    if (candidate.getTime() <= now.getTime()) continue
    results.push(candidate)
    if (results.length >= target) return true
  }
  return false
}

function normalizePreviewCount(count: number): number {
  return Number.isFinite(count)
    ? Math.min(100, Math.max(1, Math.trunc(count)))
    : 10
}

function shouldYield(minuteIndex: number): boolean {
  return minuteIndex > 0 && minuteIndex % 10_000 === 0
}

/** 按分钟扫描一年，并仅在命中分钟内枚举秒，避免秒级规则缩短预览范围。 */
export async function findNextCronExecutions(
  expression: string,
  count: number,
  now = new Date(),
  isCancelled: () => boolean = () => false
): Promise<Date[]> {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 6) return []

  const seconds = Array.from({ length: 60 }, (_, second) => second).filter(
    second => matchesPart(second, parts[0], 0)
  )
  if (seconds.length === 0) return []

  const target = normalizePreviewCount(count)
  const results: Date[] = []
  const cursor = new Date(now)
  cursor.setSeconds(0, 0)
  const maxMinutes = 366 * 24 * 60

  for (let minuteIndex = 0; minuteIndex < maxMinutes; minuteIndex++) {
    if (isCancelled()) return []
    if (
      matchesMinute(cursor, parts) &&
      appendMatchingSeconds(results, cursor, seconds, now, target)
    ) {
      return results
    }
    cursor.setTime(cursor.getTime() + 60_000)
    if (shouldYield(minuteIndex)) {
      // eslint-disable-next-line no-await-in-loop -- 大范围预览主动让出主线程。
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
  }

  return results
}
