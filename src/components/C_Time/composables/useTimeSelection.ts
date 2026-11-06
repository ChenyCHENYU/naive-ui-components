import { ref, computed, watch } from 'vue'
import type { TemporalValueMode } from '../../../core/temporalField'
import { formatLocalTime, parseLocalTime } from '../../../utils/localTime'
import type { TimeModelValue, TimeMode, TimeRuntimeProps } from '../types'

type RuntimeModel = TimeModelValue<TimeMode, TemporalValueMode>

type EmitFn = {
  (event: 'update:modelValue', value: RuntimeModel): void
  (event: 'change', value: RuntimeModel): void
  (
    event: 'change-range',
    startTime: number | null,
    endTime: number | null
  ): void
  (event: 'change-single', time: number | null): void
  (event: 'change-start', time: number | null): void
  (event: 'change-end', time: number | null): void
}

/** 时间选择器逻辑 — 管理时间段/单选模式、智能限制 */
export function useTimeSelection(
  props: TimeRuntimeProps<TimeMode | undefined, TemporalValueMode>,
  emit: EmitFn
) {
  const mode = computed(() => props.mode ?? 'range')

  /* ==================== 响应式状态 ==================== */
  const startTime = ref<number | null>(props.defaultStartTime ?? null)
  const endTime = ref<number | null>(props.defaultEndTime ?? null)
  const singleTime = ref<number | null>(props.defaultSingleTime ?? null)

  /* ==================== 计算属性 ==================== */
  const timeFormat = computed(() => {
    if (props.format && props.format !== 'HH:mm') return props.format
    const fields = [
      props.useHours !== false && 'HH',
      props.useMinutes !== false && 'mm',
      props.useSeconds && 'ss',
    ].filter(Boolean)
    return fields.join(':') || 'HH:mm'
  })

  const allowedHours = computed(() => steppedValues(24, props.hourStep))
  const allowedMinutes = computed(() => steppedValues(60, props.minuteStep))
  const allowedSeconds = computed(() => steppedValues(60, props.secondStep))

  function steppedValues(limit: number, rawStep?: number): number[] {
    const step = Number.isInteger(rawStep) && (rawStep ?? 0) > 0 ? rawStep! : 1
    return Array.from(
      { length: Math.ceil(limit / step) },
      (_, index) => index * step
    )
  }

  function timeOfDay(value: number): number {
    const date = new Date(value)
    return (
      (endFields.value.hours ? date.getHours() * 3600 : 0) +
      (endFields.value.minutes ? date.getMinutes() * 60 : 0) +
      (endFields.value.seconds ? date.getSeconds() : 0)
    )
  }

  const valueFormat = computed(() => props.valueFormat ?? timeFormat.value)

  // Match the native picker columns, including forwarded format overrides.
  function visibleFields(format: string) {
    return {
      hours: /H|h|K|k/.test(format),
      minutes: format.includes('m'),
      seconds: format.includes('s'),
    }
  }

  function pickerAttrs(overrides?: Record<string, unknown>) {
    const format =
      typeof overrides?.format === 'string'
        ? overrides.format
        : typeof props.attrs?.format === 'string'
          ? props.attrs.format
          : timeFormat.value
    const attrs = {
      size: props.size,
      clearable: props.clearable,
      valueFormat: props.valueFormat,
      ...props.attrs,
      ...overrides,
      format,
    }
    const fields = visibleFields(format)
    return {
      hours: fields.hours ? allowedHours.value : undefined,
      minutes: fields.minutes ? allowedMinutes.value : undefined,
      seconds: fields.seconds ? allowedSeconds.value : undefined,
      ...attrs,
    }
  }

  const mergedAttrs = computed(() => pickerAttrs())
  const mergedStartAttrs = computed(() => pickerAttrs(props.startTimeProps))
  const mergedEndAttrs = computed(() => pickerAttrs(props.endTimeProps))
  const endFields = computed(() => visibleFields(mergedEndAttrs.value.format))

  const isLocked = (attrs: Record<string, unknown>) =>
    props.disabled ||
    props.readonly ||
    attrs.disabled === true ||
    attrs.readonly === true
  const startTimeDisabled = computed(() => isLocked(mergedStartAttrs.value))
  const endTimeDisabled = computed(
    () =>
      isLocked(mergedEndAttrs.value) ||
      (mode.value === 'range' && startTime.value === null)
  )
  const singleTimeDisabled = computed(() => isLocked(mergedAttrs.value))

  const formatted = (value: number | null) =>
    value === null ? null : formatLocalTime(value, valueFormat.value)
  const timestamp = (value: unknown): number | null => {
    if (props.valueMode === 'formatted') {
      return typeof value === 'string'
        ? parseLocalTime(value, valueFormat.value)
        : null
    }
    return typeof value === 'number' && Number.isFinite(value) ? value : null
  }

  function emitModel() {
    let value: RuntimeModel
    if (props.valueMode === 'formatted') {
      value =
        mode.value === 'range'
          ? [formatted(startTime.value), formatted(endTime.value)]
          : formatted(singleTime.value)
    } else {
      value =
        mode.value === 'range'
          ? [startTime.value, endTime.value]
          : singleTime.value
    }
    emit('update:modelValue', value)
    emit('change', value)
  }

  /* ==================== 时间限制函数 ==================== */
  const isEndHourDisabled = (hour: number): boolean => {
    if (startTime.value === null || !endFields.value.hours) return false
    const startHour = new Date(startTime.value).getHours()
    return (
      hour < startHour ||
      (hour === startHour &&
        !endFields.value.minutes &&
        !endFields.value.seconds)
    )
  }

  const isEndMinuteDisabled = (
    minute: number,
    selectedHour: number | null
  ): boolean => {
    if (startTime.value === null || !endFields.value.minutes) return false
    const startDate = new Date(startTime.value)
    if (endFields.value.hours && selectedHour !== startDate.getHours())
      return false
    return endFields.value.seconds
      ? minute < startDate.getMinutes()
      : minute <= startDate.getMinutes()
  }

  const isEndSecondDisabled = (
    second: number,
    selectedMinute: number | null,
    selectedHour: number | null
  ): boolean => {
    if (startTime.value === null || !endFields.value.seconds) return false
    const startDate = new Date(startTime.value)
    return (
      (!endFields.value.hours || selectedHour === startDate.getHours()) &&
      (!endFields.value.minutes || selectedMinute === startDate.getMinutes()) &&
      second <= startDate.getSeconds()
    )
  }

  /* ==================== 事件处理 ==================== */
  const handleStartTimeChange = (value: number | null) => {
    if (startTimeDisabled.value) return
    startTime.value = value
    if (value === null) {
      endTime.value = null
    } else if (
      props.enableTimeRestriction &&
      endTime.value !== null &&
      timeOfDay(endTime.value) <= timeOfDay(value)
    ) {
      endTime.value = null
    }
    emit('change-start', value)
    if (mode.value === 'range') emit('change-range', value, endTime.value)
    emitModel()
  }

  const handleEndTimeChange = (value: number | null) => {
    if (endTimeDisabled.value) return
    const accepted =
      props.enableTimeRestriction &&
      value !== null &&
      startTime.value !== null &&
      timeOfDay(value) <= timeOfDay(startTime.value)
        ? null
        : value
    endTime.value = accepted
    emit('change-end', accepted)
    if (mode.value === 'range') emit('change-range', startTime.value, accepted)
    emitModel()
  }

  const handleSingleTimeChange = (value: number | null) => {
    if (singleTimeDisabled.value) return
    singleTime.value = value
    emit('change-single', value)
    emitModel()
  }

  /* ==================== 模式切换监听 ==================== */
  watch(
    () =>
      [
        props.mode,
        props.valueMode,
        valueFormat.value,
        props.modelValue,
        props.defaultStartTime,
        props.defaultEndTime,
        props.defaultSingleTime,
      ] as const,
    () => {
      if (props.modelValue !== undefined) {
        if (mode.value === 'range') {
          startTime.value = Array.isArray(props.modelValue)
            ? timestamp(props.modelValue[0])
            : null
          endTime.value = Array.isArray(props.modelValue)
            ? timestamp(props.modelValue[1])
            : null
        } else {
          singleTime.value = Array.isArray(props.modelValue)
            ? null
            : timestamp(props.modelValue)
        }
        return
      }
      startTime.value = props.defaultStartTime ?? null
      endTime.value = props.defaultEndTime ?? null
      singleTime.value = props.defaultSingleTime ?? null
    },
    { immediate: true, deep: true }
  )

  /* ==================== 暴露方法 ==================== */
  const reset = () => {
    startTime.value = null
    endTime.value = null
    singleTime.value = null
    emitModel()
  }

  return {
    startTime,
    endTime,
    singleTime,
    timeFormat,
    allowedHours,
    allowedMinutes,
    allowedSeconds,
    startTimeDisabled,
    endTimeDisabled,
    singleTimeDisabled,
    mergedStartAttrs,
    mergedEndAttrs,
    mergedAttrs,
    isEndHourDisabled,
    isEndMinuteDisabled,
    isEndSecondDisabled,
    handleStartTimeChange,
    handleEndTimeChange,
    handleSingleTimeChange,
    reset,
  }
}
