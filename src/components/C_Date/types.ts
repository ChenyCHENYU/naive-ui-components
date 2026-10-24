export type DatePickerMode =
  'date' | 'datetime' | 'daterange' | 'datetimerange' | 'smart-range'

export type DateValue = string | null
export type DateRangeValue = [string, string] | null
/** 静态 mode 保留单值或范围；动态 mode 使用完整联合类型。 */
export type DateModelValue<
  M extends DatePickerMode | undefined = DatePickerMode,
> = M extends 'date' | 'datetime' | undefined ? DateValue : DateRangeValue

export interface DateRuntimeProps<
  M extends DatePickerMode | undefined = DatePickerMode,
> {
  modelValue?: DateModelValue<NoInfer<M>>
  mode?: M
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

/** 显式模式保留 undefined；省略模式时只允许默认分支的模型。 */
export type DateProps<M extends DatePickerMode | undefined = DatePickerMode> =
  Omit<DateRuntimeProps<M>, 'mode' | 'modelValue'> &
    (
      | { mode: M; modelValue?: DateModelValue<NoInfer<M>> }
      | ('date' extends M
          ? { mode?: undefined; modelValue?: DateValue }
          : never)
    )

export interface DateEmits<
  M extends DatePickerMode | undefined = DatePickerMode,
> {
  'update:modelValue': [value: DateModelValue<M>]
  /** @deprecated Use update:modelValue with mode="date". */
  'update:singleDate': [value: DateValue]
  /** @deprecated Use update:modelValue with mode="datetime". */
  'update:singleDateTime': [value: DateValue]
  /** @deprecated Use update:modelValue with mode="daterange". */
  'update:dateRange': [value: DateRangeValue]
  /** @deprecated Use update:modelValue with mode="datetimerange". */
  'update:dateTimeRange': [value: DateRangeValue]
  /** @deprecated Use update:modelValue with mode="smart-range". */
  'update:smartRange': [value: DateRangeValue]
  change: [value: DateModelValue<M>]
}

export interface DateExpose {
  clearAll: () => void
}
