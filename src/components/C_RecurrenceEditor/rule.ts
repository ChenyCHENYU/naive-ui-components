import type {
  RecurrenceEnd,
  RecurrenceFrequency,
  RecurrenceRule,
  RecurrenceWeekday,
} from './types'

export const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const
export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'] as const
export const ORDINALS = [1, 2, 3, 4, 5, -1] as const

const isFrequency = (value: string): value is RecurrenceFrequency =>
  FREQUENCIES.some(frequency => frequency === value)
const isWeekday = (value: string): value is RecurrenceWeekday =>
  WEEKDAYS.some(day => day === value)
const isOrdinal = (value: number): value is (typeof ORDINALS)[number] =>
  ORDINALS.some(ordinal => ordinal === value)
const isPositive = (value: number, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= 1 && value <= max

/** Validate an exact calendar date, including leap years, without local time conversion. */
export function isDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
    return false
  const day = new Date(`${value}T00:00:00Z`)
  return (
    Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === value
  )
}

function formatWeekdays({ frequency, weekdays }: RecurrenceRule) {
  if (!weekdays?.length) return ''
  if (frequency !== 'weekly' || !weekdays.every(isWeekday))
    throw new RangeError('Invalid weekly weekdays')
  const selected = new Set(weekdays)
  return `BYDAY=${WEEKDAYS.filter(day => selected.has(day)).join(',')}`
}

function formatMonth({ frequency, monthPattern }: RecurrenceRule) {
  if (!monthPattern) return ''
  if (frequency !== 'monthly')
    throw new RangeError('A month pattern requires monthly frequency')
  if (monthPattern.type === 'date' && isPositive(monthPattern.day, 31))
    return `BYMONTHDAY=${monthPattern.day}`
  if (
    monthPattern.type === 'weekday' &&
    isOrdinal(monthPattern.ordinal) &&
    isWeekday(monthPattern.day)
  ) {
    return `BYDAY=${monthPattern.ordinal}${monthPattern.day}`
  }
  throw new RangeError('Invalid month pattern')
}

function formatEnd(end?: RecurrenceEnd) {
  if (!end) return ''
  if (end.type === 'count' && isPositive(end.count)) return `COUNT=${end.count}`
  if (end.type === 'until' && isDateOnly(end.date))
    return `UNTIL=${end.date.replace(/-/g, '')}`
  throw new RangeError('Invalid recurrence end')
}

/** Encode the editor's supported date-based subset of RFC 5545. */
export function formatRecurrenceRule(rule: RecurrenceRule | null): string {
  if (!rule) return ''
  const { frequency, interval = 1, end } = rule
  if (!isFrequency(frequency) || !isPositive(interval))
    throw new RangeError('Invalid recurrence frequency or interval')
  return [
    `FREQ=${frequency.toUpperCase()}`,
    interval === 1 ? '' : `INTERVAL=${interval}`,
    formatWeekdays(rule),
    formatMonth(rule),
    formatEnd(end),
  ]
    .filter(Boolean)
    .join(';')
}

function readTokens(input: string) {
  const tokens = new Map<string, string>()
  for (const pair of input.split(';')) {
    const match = /^(FREQ|INTERVAL|BYDAY|BYMONTHDAY|COUNT|UNTIL)=([^=]+)$/.exec(
      pair
    )
    if (!match || tokens.has(match[1]))
      throw new RangeError(`Unsupported recurrence part: ${pair}`)
    tokens.set(match[1], match[2])
  }
  return tokens
}

function readInteger(tokens: Map<string, string>, key: string) {
  const value = tokens.get(key)
  if (value === undefined) return
  if (!/^\d+$/.test(value)) throw new RangeError(`Invalid ${key}`)
  return Number(value)
}

function readPattern(
  tokens: Map<string, string>,
  frequency: RecurrenceFrequency
): Partial<RecurrenceRule> {
  const monthDay = readInteger(tokens, 'BYMONTHDAY')
  const byDay = tokens.get('BYDAY')
  if (monthDay !== undefined) {
    if (byDay) throw new RangeError('Use one month pattern')
    return { monthPattern: { type: 'date', day: monthDay } }
  }
  if (!byDay) return {}
  if (frequency === 'weekly') {
    const days = byDay.split(',')
    if (!days.every(isWeekday)) throw new RangeError('Invalid weekly weekdays')
    return { weekdays: days }
  }
  const [, ordinal, day] = /^([+]?[1-5]|-1)([A-Z]{2})$/.exec(byDay) ?? []
  const index = Number(ordinal)
  if (!isOrdinal(index) || !day || !isWeekday(day))
    throw new RangeError('Unsupported monthly pattern')
  return { monthPattern: { type: 'weekday', ordinal: index, day } }
}

function readEnd(tokens: Map<string, string>): RecurrenceEnd | undefined {
  const count = readInteger(tokens, 'COUNT')
  const until = tokens.get('UNTIL')
  if (until && count !== undefined)
    throw new RangeError('Use one recurrence end')
  if (count !== undefined) return { type: 'count', count }
  if (!until) return
  if (!/^\d{8}$/.test(until))
    throw new RangeError('UNTIL must use a calendar date')
  return {
    type: 'until',
    date: `${until.slice(0, 4)}-${until.slice(4, 6)}-${until.slice(6)}`,
  }
}

/** Reject unsupported tokens so an edited rule cannot silently lose its constraints. */
export function parseRecurrenceRule(text: string): RecurrenceRule | null {
  const input = text
    .trim()
    .toUpperCase()
    .replace(/^RRULE:/, '')
  if (!input) return null
  const tokens = readTokens(input)
  const frequency = tokens.get('FREQ')?.toLowerCase() ?? ''
  if (!isFrequency(frequency))
    throw new RangeError('Unsupported recurrence frequency')
  const rule = { frequency, ...readPattern(tokens, frequency) }
  const interval = readInteger(tokens, 'INTERVAL')
  const end = readEnd(tokens)
  if (interval !== undefined) rule.interval = interval
  if (end !== undefined) rule.end = end
  formatRecurrenceRule(rule)
  return rule
}
