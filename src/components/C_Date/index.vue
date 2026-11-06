<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-05-28
 * @Description: 日期选择器组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="inline-block">
    <NDatePicker
      v-if="mode === 'date'"
      v-model:formatted-value="singleDateModel"
      type="date"
      :placeholder="placeholder || '请选择日期'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="resolvedValueFormat"
      :readonly="readonly"
      :size="size"
      :format="format"
      :clearable="clearable"
      v-bind="$attrs"
    />

    <NDatePicker
      v-else-if="mode === 'datetime'"
      v-model:formatted-value="singleDateTimeModel"
      type="datetime"
      :placeholder="placeholder || '请选择日期时间'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="resolvedValueFormat"
      :readonly="readonly"
      :size="size"
      :format="format"
      :clearable="clearable"
      v-bind="$attrs"
    />

    <NDatePicker
      v-else-if="mode === 'daterange'"
      v-model:formatted-value="dateRangeModel"
      type="daterange"
      :start-placeholder="startPlaceholder || '开始日期'"
      :end-placeholder="endPlaceholder || '结束日期'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="resolvedValueFormat"
      :readonly="readonly"
      :size="size"
      :format="format"
      :clearable="clearable"
      v-bind="$attrs"
    />

    <NDatePicker
      v-else-if="mode === 'datetimerange'"
      v-model:formatted-value="dateTimeRangeModel"
      type="datetimerange"
      :start-placeholder="startPlaceholder || '开始日期时间'"
      :end-placeholder="endPlaceholder || '结束日期时间'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="resolvedValueFormat"
      :readonly="readonly"
      :size="size"
      :format="format"
      :clearable="clearable"
      v-bind="$attrs"
    />

    <div
      v-else-if="mode === 'smart-range'"
      class="inline-block"
    >
      <div class="flex gap-2.5 items-center">
        <NDatePicker
          class="flex-1"
          :formatted-value="startDate"
          @update:formatted-value="updateSmartStart"
          type="date"
          :placeholder="startPlaceholder || '请选择开始日期'"
          v-bind="{ size, format, clearable, ...startDateProps }"
          :disabled="disabled || startDateProps.disabled === true"
          :readonly="readonly || startDateProps.readonly === true"
          :is-date-disabled="smartStartDisabledDate"
          :value-format="resolvedValueFormat"
        />
        <NDatePicker
          class="flex-1"
          :formatted-value="endDate"
          @update:formatted-value="updateSmartEnd"
          type="date"
          :placeholder="endPlaceholder || '请选择结束日期'"
          v-bind="{ size, format, clearable, ...endDateProps }"
          :disabled="endDateDisabled || endDateProps.disabled === true"
          :readonly="readonly || endDateProps.readonly === true"
          :is-date-disabled="endDisabledDate"
          :value-format="resolvedValueFormat"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup generic="M extends DatePickerMode | undefined = 'date'">
  import { ref, watch, computed, useAttrs } from 'vue'
  import { NDatePicker } from 'naive-ui'
  import { parseLocalTime } from '../../utils/localTime'
  import { localDayStart } from './dateUtils'
  import type {
    DateRuntimeProps,
    DatePickerMode,
    DateModelValue,
    DateRangeValue,
    DateValue,
    DateEmits,
    DateExpose,
  } from './types'

  defineOptions({ name: 'C_Date' })

  const props = withDefaults(defineProps<DateRuntimeProps<M>>(), {
    placeholder: '',
    startPlaceholder: '',
    endPlaceholder: '',
    disabled: false,
    clearable: true,
    disabledBeforeToday: false,
    disabledAfterToday: false,
    startDateProps: () => ({}),
    endDateProps: () => ({}),
    singleDate: null,
    singleDateTime: null,
    dateRange: null,
    dateTimeRange: null,
    smartRange: null,
  })

  const emits = defineEmits<DateEmits<M>>()
  const attrs = useAttrs()
  const mode = computed(() => props.mode ?? 'date')

  /** 模式分支确定值形状；类型转换仅留在包的事件桥接边界。 */
  const modeValue = (value: DateModelValue): DateModelValue<M> =>
    value as DateModelValue<M>

  const resolvedValueFormat = computed(() => {
    if (props.valueFormat) return props.valueFormat
    return mode.value.includes('datetime')
      ? 'yyyy-MM-dd HH:mm:ss'
      : 'yyyy-MM-dd'
  })

  // —— 四种基础模式：computed getter/setter 实现受控绑定 ——
  // 后缀 Model 避免与同名 prop 产生 vue/no-dupe-keys 冲突
  const singleDateModel = computed<DateValue>({
    get: () =>
      props.modelValue !== undefined
        ? (props.modelValue as DateValue)
        : (props.singleDate ?? null),
    set: val => {
      emits('update:modelValue', modeValue(val))
      emits('update:singleDate', val)
      emits('change', modeValue(val))
    },
  })

  const singleDateTimeModel = computed<DateValue>({
    get: () =>
      props.modelValue !== undefined
        ? (props.modelValue as DateValue)
        : (props.singleDateTime ?? null),
    set: val => {
      emits('update:modelValue', modeValue(val))
      emits('update:singleDateTime', val)
      emits('change', modeValue(val))
    },
  })

  const dateRangeModel = computed<DateRangeValue>({
    get: () =>
      props.modelValue !== undefined
        ? (props.modelValue as DateRangeValue)
        : (props.dateRange ?? null),
    set: val => {
      emits('update:modelValue', modeValue(val))
      emits('update:dateRange', val)
      emits('change', modeValue(val))
    },
  })

  const dateTimeRangeModel = computed<DateRangeValue>({
    get: () =>
      props.modelValue !== undefined
        ? (props.modelValue as DateRangeValue)
        : (props.dateTimeRange ?? null),
    set: val => {
      emits('update:modelValue', modeValue(val))
      emits('update:dateTimeRange', val)
      emits('change', modeValue(val))
    },
  })

  // —— smart-range：两个独立 ref（prop 名为 smartRange，start/endDate 无命名冲突）——
  const startDate = ref<DateValue>(null)
  const endDate = ref<DateValue>(null)
  const endDateDisabled = computed(
    () => props.disabled || startDate.value === null
  )
  const smartRangeValue = computed(() =>
    props.modelValue === undefined
      ? props.smartRange
      : (props.modelValue as DateRangeValue)
  )
  const startDay = computed(() => {
    if (startDate.value === null) return null
    const timestamp = parseLocalTime(startDate.value, resolvedValueFormat.value)
    return timestamp === null ? null : localDayStart(timestamp)
  })
  let awaitingClear = false

  watch(
    [mode, smartRangeValue],
    ([nextMode, value], [previousMode]) => {
      // 父组件回写刚发出的 null 时保留待补全的开始日期。
      const isClearEcho =
        awaitingClear && previousMode === nextMode && value === null
      awaitingClear = false
      if (nextMode !== 'smart-range' || isClearEcho) return
      startDate.value = value?.[0] ?? null
      endDate.value = value?.[1] ?? null
    },
    { immediate: true, deep: true }
  )

  function publishSmartRange() {
    const start = startDate.value
    const end = endDate.value
    const value: DateRangeValue =
      start !== null && end !== null ? [start, end] : null
    awaitingClear =
      value === null && start !== null && smartRangeValue.value != null
    emits('update:modelValue', modeValue(value))
    emits('update:smartRange', value)
    emits('change', modeValue(value))
  }

  function updateSmartStart(value: DateValue, timestamp?: number | null) {
    if (smartEndpointLocked(props.startDateProps)) return
    const start =
      value === null
        ? null
        : (timestamp ?? parseLocalTime(value, resolvedValueFormat.value))
    if (value !== null && (start === null || smartStartDisabledDate(start)))
      return
    startDate.value = value
    const end =
      endDate.value === null
        ? null
        : parseLocalTime(endDate.value, resolvedValueFormat.value)
    if (!isOrderedRange(start, end)) endDate.value = null
    publishSmartRange()
  }

  function updateSmartEnd(value: DateValue, timestamp?: number | null) {
    if (endDateDisabled.value || smartEndpointLocked(props.endDateProps)) return
    const end =
      value === null
        ? null
        : (timestamp ?? parseLocalTime(value, resolvedValueFormat.value))
    if (value !== null && (end === null || endDisabledDate(end))) return
    endDate.value = value
    publishSmartRange()
  }

  function smartEndpointLocked(endpoint: Record<string, unknown>): boolean {
    return (
      props.disabled ||
      props.readonly ||
      endpoint.disabled === true ||
      endpoint.readonly === true
    )
  }

  function isOrderedRange(start: number | null, end: number | null): boolean {
    return (
      start !== null &&
      end !== null &&
      localDayStart(end) >= localDayStart(start)
    )
  }

  const singleDisabledDate = (timestamp: number): boolean => {
    if (!props.disabledBeforeToday && !props.disabledAfterToday) return false
    const today = localDayStart(Date.now())
    const day = localDayStart(timestamp)
    return (
      (props.disabledBeforeToday && day < today) ||
      (props.disabledAfterToday && day > today)
    )
  }

  function customDisabledDate(
    timestamp: number,
    endpoint: Record<string, unknown>
  ): boolean {
    const disabledDate =
      endpoint.isDateDisabled ??
      attrs.isDateDisabled ??
      attrs['is-date-disabled']
    return (
      typeof disabledDate === 'function' && disabledDate(timestamp) === true
    )
  }

  const smartStartDisabledDate = (timestamp: number): boolean => {
    return (
      singleDisabledDate(timestamp) ||
      customDisabledDate(timestamp, props.startDateProps)
    )
  }

  const endDisabledDate = (timestamp: number): boolean => {
    const start = startDay.value
    return (
      start === null ||
      localDayStart(timestamp) < start ||
      singleDisabledDate(timestamp) ||
      customDisabledDate(timestamp, props.endDateProps)
    )
  }

  // clearAll：emit 驱动父组件清空同名绑定，同时重置 smart-range 内部 ref
  defineExpose<DateExpose>({
    clearAll: () => {
      awaitingClear = false
      startDate.value = null
      endDate.value = null
      emits('update:modelValue', modeValue(null))
      emits('update:singleDate', null)
      emits('update:singleDateTime', null)
      emits('update:dateRange', null)
      emits('update:dateTimeRange', null)
      emits('update:smartRange', null)
      emits('change', modeValue(null))
    },
  })
</script>
