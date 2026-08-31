export type DatePickerMode =
  'date' | 'datetime' | 'daterange' | 'datetimerange' | 'smart-range'

export type DateValue = string | null
export type DateRangeValue = [string, string] | null
export type DateModelValue = DateValue | DateRangeValue

export interface DateProps {
  modelValue?: DateModelValue
  mode?: DatePickerMode
  placeholder?: string
  startPlaceholder?: string
  endPlaceholder?: string
  disabled?: boolean
  disabledBeforeToday?: boolean
  disabledAfterToday?: boolean
  valueFormat?: string
  startDateProps?: Record<string, unknown>
  endDateProps?: Record<string, unknown>
  /** @deprecated Use modelValue. */
  singleDate?: DateValue
  /** @deprecated Use modelValue. */
  singleDateTime?: DateValue
  /** @deprecated Use modelValue. */
  dateRange?: DateRangeValue
  /** @deprecated Use modelValue. */
  dateTimeRange?: DateRangeValue
  /** @deprecated Use modelValue. */
  smartRange?: DateRangeValue
}

export interface DateEmits {
  'update:modelValue': [value: DateModelValue]
  'update:singleDate': [value: DateValue]
  'update:singleDateTime': [value: DateValue]
  'update:dateRange': [value: DateRangeValue]
  'update:dateTimeRange': [value: DateRangeValue]
  'update:smartRange': [value: DateRangeValue]
  change: [value: DateModelValue]
}

export interface DateExpose {
  clearAll: () => void
}
