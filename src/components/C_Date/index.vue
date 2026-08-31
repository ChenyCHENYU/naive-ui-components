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
      clearable
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
      clearable
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
      clearable
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
      clearable
      v-bind="$attrs"
    />

    <div
      v-else-if="mode === 'smart-range'"
      class="inline-block"
    >
      <div class="flex gap-2.5 items-center">
        <NDatePicker
          class="flex-1"
          v-model:formatted-value="startDate"
          type="date"
          :placeholder="startPlaceholder || '请选择开始日期'"
          :disabled="disabled"
          :is-date-disabled="singleDisabledDate"
          :value-format="resolvedValueFormat"
          clearable
          v-bind="startDateProps"
        />
        <NDatePicker
          class="flex-1"
          v-model:formatted-value="endDate"
          type="date"
          :placeholder="endPlaceholder || '请选择结束日期'"
          :disabled="endDateDisabled"
          :is-date-disabled="endDisabledDate"
          :value-format="resolvedValueFormat"
          clearable
          v-bind="endDateProps"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref, watch, computed } from 'vue'
  import { NDatePicker } from 'naive-ui'
  import type {
    DateProps,
    DateRangeValue,
    DateValue,
    DateEmits,
    DateExpose,
  } from './types'

  defineOptions({ name: 'C_Date' })

  const props = withDefaults(defineProps<DateProps>(), {
    mode: 'date',
    placeholder: '',
    startPlaceholder: '',
    endPlaceholder: '',
    disabled: false,
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

  const emits = defineEmits<DateEmits>()

  const getTodayStart = (): number => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }

  const resolvedValueFormat = computed(() => {
    if (props.valueFormat) return props.valueFormat
    return props.mode.includes('datetime')
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
      emits('update:modelValue', val)
      emits('update:singleDate', val)
      emits('change', val)
    },
  })

  const singleDateTimeModel = computed<DateValue>({
    get: () =>
      props.modelValue !== undefined
        ? (props.modelValue as DateValue)
        : (props.singleDateTime ?? null),
    set: val => {
      emits('update:modelValue', val)
      emits('update:singleDateTime', val)
      emits('change', val)
    },
  })

  const dateRangeModel = computed<DateRangeValue>({
    get: () =>
      props.modelValue !== undefined
        ? (props.modelValue as DateRangeValue)
        : (props.dateRange ?? null),
    set: val => {
      emits('update:modelValue', val)
      emits('update:dateRange', val)
      emits('change', val)
    },
  })

  const dateTimeRangeModel = computed<DateRangeValue>({
    get: () =>
      props.modelValue !== undefined
        ? (props.modelValue as DateRangeValue)
        : (props.dateTimeRange ?? null),
    set: val => {
      emits('update:modelValue', val)
      emits('update:dateTimeRange', val)
      emits('change', val)
    },
  })

  // —— smart-range：两个独立 ref（prop 名为 smartRange，start/endDate 无命名冲突）——
  const startDate = ref<DateValue>(null)
  const endDate = ref<DateValue>(null)
  const endDateDisabled = computed(
    () => props.disabled || startDate.value === null
  )
  let syncingSmartRange = false

  // 将外部 smartRange prop 同步到内部 startDate/endDate
  watch(
    () => [props.modelValue, props.smartRange, props.mode] as const,
    ([modelValue, smartRange, mode]) => {
      const val =
        mode === 'smart-range' && modelValue !== undefined
          ? (modelValue as DateRangeValue)
          : smartRange
      const newStart = val?.[0] ?? null
      const newEnd = val?.[1] ?? null
      if (newStart === startDate.value && newEnd === endDate.value) return
      syncingSmartRange = true
      startDate.value = newStart
      endDate.value = newEnd
      syncingSmartRange = false
    },
    { immediate: true, deep: true }
  )

  // 用户选择后：两者均有值时 emit；清空开始日期时级联清空结束日期
  watch(
    () => [startDate.value, endDate.value] as const,
    ([startVal, endVal]) => {
      if (syncingSmartRange) return
      if (startVal === null && endVal !== null) {
        endDate.value = null
        return
      }
      if (
        startVal !== null &&
        endVal !== null &&
        new Date(endVal).getTime() < new Date(startVal).getTime()
      ) {
        endDate.value = null
        return
      }
      const value: DateRangeValue =
        startVal !== null && endVal !== null ? [startVal, endVal] : null
      emits('update:modelValue', value)
      emits('update:smartRange', value)
      emits('change', value)
    },
    { deep: true, flush: 'sync' }
  )

  // —— 日期禁用逻辑 ——
  const singleDisabledDate = (timestamp: number): boolean => {
    const todayStart = getTodayStart()
    if (props.disabledBeforeToday && timestamp < todayStart) return true
    if (props.disabledAfterToday && timestamp > todayStart) return true
    return false
  }

  const endDisabledDate = (timestamp: number): boolean => {
    if (startDate.value === null) return true
    if (timestamp < new Date(startDate.value).getTime()) return true
    return singleDisabledDate(timestamp)
  }

  // clearAll：emit 驱动父组件清空同名绑定，同时重置 smart-range 内部 ref
  defineExpose<DateExpose>({
    clearAll: () => {
      syncingSmartRange = true
      startDate.value = null
      endDate.value = null
      syncingSmartRange = false
      emits('update:modelValue', null)
      emits('update:singleDate', null)
      emits('update:singleDateTime', null)
      emits('update:dateRange', null)
      emits('update:dateTimeRange', null)
      emits('update:smartRange', null)
    },
  })
</script>
