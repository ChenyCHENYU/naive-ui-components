export type TimeMode = 'range' | 'single'
export type TimeRangeValue = [number | null, number | null]
/** 静态 mode 保留单值或范围；动态 mode 使用完整联合类型。 */
export type TimeModelValue<M extends TimeMode | undefined = TimeMode> =
  M extends 'single' ? number | null : TimeRangeValue | null

export interface TimeRuntimeProps<M extends TimeMode | undefined = TimeMode> {
  /** 标准双向绑定；range 为元组，single 为单值 */
  modelValue?: TimeModelValue<NoInfer<M>>
  mode?: M
  startPlaceholder?: string
  endPlaceholder?: string
  placeholder?: string
  format?: string
  useHours?: boolean
  useMinutes?: boolean
  useSeconds?: boolean
  hourStep?: number
  minuteStep?: number
  secondStep?: number
  startTimeProps?: Record<string, any>
  endTimeProps?: Record<string, any>
  attrs?: Record<string, any>
  defaultStartTime?: number | null
  defaultEndTime?: number | null
  defaultSingleTime?: number | null
  enableTimeRestriction?: boolean
}

/** 显式模式保留 undefined；省略模式时只允许默认分支的模型。 */
export type TimeProps<M extends TimeMode | undefined = TimeMode> = Omit<
  TimeRuntimeProps<M>,
  'mode' | 'modelValue'
> &
  (
    | { mode: M; modelValue?: TimeModelValue<NoInfer<M>> }
    | ('range' extends M
        ? { mode?: undefined; modelValue?: TimeRangeValue | null }
        : never)
  )

export interface TimeEmits<M extends TimeMode | undefined = TimeMode> {
  'update:modelValue': [value: TimeModelValue<M>]
  change: [value: TimeModelValue<M>]
  'change-range': [startTime: number | null, endTime: number | null]
  'change-single': [time: number | null]
  'change-start': [time: number | null]
  'change-end': [time: number | null]
}

export interface TimeExpose {
  reset: () => void
  /** 公开实例的顶层 Ref 已由 Vue 解包，直接读取值。 */
  startTime: number | null
  endTime: number | null
  singleTime: number | null
}
