import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RecurrenceWeekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'
export type RecurrenceMonthPattern =
  | { type: 'date'; day: number }
  | { type: 'weekday'; ordinal: 1 | 2 | 3 | 4 | 5 | -1; day: RecurrenceWeekday }
export type RecurrenceEnd =
  { type: 'count'; count: number } | { type: 'until'; date: string }

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  interval?: number
  weekdays?: readonly RecurrenceWeekday[]
  monthPattern?: RecurrenceMonthPattern
  end?: RecurrenceEnd
}

export interface RecurrenceEditorProps {
  modelValue: RecurrenceRule | null
  disabled?: boolean
  density?: ComponentDensity
  locale?: ComponentLocale
}
