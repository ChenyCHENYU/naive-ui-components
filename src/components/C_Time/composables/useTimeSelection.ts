import { ref, computed, watch } from 'vue'
import type { TimeModelValue, TimeProps } from '../types'

type EmitFn = {
  (event: 'update:modelValue', value: TimeModelValue): void
  (event: 'change', value: TimeModelValue): void
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
export function useTimeSelection(props: TimeProps, emit: EmitFn) {
  /* ==================== 响应式状态 ==================== */
  const startTime = ref<number | null>(props.defaultStartTime ?? null)
  const endTime = ref<number | null>(props.defaultEndTime ?? null)
  const singleTime = ref<number | null>(props.defaultSingleTime ?? null)

  /* ==================== 计算属性 ==================== */
  const timeFormat = computed(() => {
    if (props.useSeconds) {
      return props.format?.includes('ss') ? props.format : 'HH:mm:ss'
    }
    return props.format ?? 'HH:mm'
  })

  const endTimeDisabled = computed(
    () => props.mode === 'range' && startTime.value === null
  )

  const mergedStartAttrs = computed(() => ({
    ...props.attrs,
    ...props.startTimeProps,
  }))

  const mergedEndAttrs = computed(() => ({
    ...props.attrs,
    ...props.endTimeProps,
  }))

  const mergedAttrs = computed(() => ({ ...props.attrs }))

  const emitModel = () => {
    const value: TimeModelValue =
      props.mode === 'range'
        ? [startTime.value, endTime.value]
        : singleTime.value
    emit('update:modelValue', value)
    emit('change', value)
  }

  /* ==================== 时间限制函数 ==================== */
  const isEndHourDisabled = (hour: number): boolean => {
    if (startTime.value === null) return false
    return hour < new Date(startTime.value).getHours()
  }

  const isEndMinuteDisabled = (
    minute: number,
    selectedHour: number | null
  ): boolean => {
    if (startTime.value === null || selectedHour === null) return false
    const startDate = new Date(startTime.value)
    return (
      selectedHour === startDate.getHours() &&
      (props.useSeconds
        ? minute < startDate.getMinutes()
        : minute <= startDate.getMinutes())
    )
  }

  const isEndSecondDisabled = (
    second: number,
    selectedMinute: number | null,
    selectedHour: number | null
  ): boolean => {
    if (
      startTime.value === null ||
      !props.useSeconds ||
      selectedHour === null ||
      selectedMinute === null
    )
      return false
    const startDate = new Date(startTime.value)
    return (
      selectedHour === startDate.getHours() &&
      selectedMinute === startDate.getMinutes() &&
      second <= startDate.getSeconds()
    )
  }

  /* ==================== 事件处理 ==================== */
  const handleStartTimeChange = (value: number | null) => {
    startTime.value = value
    if (value === null) {
      endTime.value = null
    } else if (
      props.enableTimeRestriction &&
      endTime.value !== null &&
      endTime.value <= value
    ) {
      endTime.value = null
    }
    emit('change-start', value)
    if (props.mode === 'range') emit('change-range', value, endTime.value)
    emitModel()
  }

  const handleEndTimeChange = (value: number | null) => {
    endTime.value = value
    emit('change-end', value)
    if (props.mode === 'range') emit('change-range', startTime.value, value)
    emitModel()
  }

  const handleSingleTimeChange = (value: number | null) => {
    singleTime.value = value
    emit('change-single', value)
    emitModel()
  }

  /* ==================== 模式切换监听 ==================== */
  watch(
    () =>
      [
        props.mode,
        props.modelValue,
        props.defaultStartTime,
        props.defaultEndTime,
        props.defaultSingleTime,
      ] as const,
    // eslint-disable-next-line complexity -- Compatibility sync handles two modes and legacy defaults atomically.
    () => {
      if (props.modelValue !== undefined) {
        if (props.mode === 'range' && Array.isArray(props.modelValue)) {
          startTime.value = props.modelValue[0] ?? null
          endTime.value = props.modelValue[1] ?? null
        } else if (
          props.mode === 'single' &&
          !Array.isArray(props.modelValue)
        ) {
          singleTime.value = props.modelValue
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
    endTimeDisabled,
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
