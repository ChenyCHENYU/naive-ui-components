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
      :value-format="valueFormat"
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
      :value-format="valueFormat"
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
      :value-format="valueFormat"
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
      :value-format="valueFormat"
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
          :is-date-disabled="singleDisabledDate"
          :value-format="valueFormat"
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
          :value-format="valueFormat"
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

  defineOptions({ name: 'C_Date' })

  type DatePickerMode =
    | 'date'
    | 'datetime'
    | 'daterange'
    | 'datetimerange'
    | 'smart-range'

  // 使用 formatted-value 绑定，值始终为格式化字符串
  type DateValue = string | null
  type DateRangeValue = [string, string] | null

  interface Props {
    mode?: DatePickerMode
    placeholder?: string
    startPlaceholder?: string
    endPlaceholder?: string
    disabled?: boolean
    disabledBeforeToday?: boolean
    disabledAfterToday?: boolean
    valueFormat?: string
    startDateProps?: Record<string, any>
    endDateProps?: Record<string, any>
    // v-model 值 props，支持受控模式（外部设置初始值 / 双向绑定）
    singleDate?: DateValue
    singleDateTime?: DateValue
    dateRange?: DateRangeValue
    dateTimeRange?: DateRangeValue
    smartRange?: DateRangeValue
  }

  interface Emits {
    (e: 'update:singleDate', value: DateValue): void
    (e: 'update:singleDateTime', value: DateValue): void
    (e: 'update:dateRange', value: DateRangeValue): void
    (e: 'update:dateTimeRange', value: DateRangeValue): void
    (e: 'update:smartRange', value: DateRangeValue): void
    (e: 'change', value: DateValue | DateRangeValue): void
  }

  const props = withDefaults(defineProps<Props>(), {
    mode: 'date',
    placeholder: '',
    startPlaceholder: '',
    endPlaceholder: '',
    disabled: false,
    disabledBeforeToday: false,
    disabledAfterToday: false,
    valueFormat: 'yyyy-MM-dd',
    startDateProps: () => ({}),
    endDateProps: () => ({}),
    singleDate: null,
    singleDateTime: null,
    dateRange: null,
    dateTimeRange: null,
    smartRange: null,
  })

  const emits = defineEmits<Emits>()

  // 今日零点时间戳 —— 模块级缓存，isDateDisabled 为高频回调，避免重复 new Date()
  const _todayStart = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  })()

  // —— 四种基础模式：computed getter/setter 实现受控绑定 ——
  // 后缀 Model 避免与同名 prop 产生 vue/no-dupe-keys 冲突
  const singleDateModel = computed<DateValue>({
    get: () => props.singleDate ?? null,
    set: val => {
      emits('update:singleDate', val)
      emits('change', val)
    },
  })

  const singleDateTimeModel = computed<DateValue>({
    get: () => props.singleDateTime ?? null,
    set: val => {
      emits('update:singleDateTime', val)
      emits('change', val)
    },
  })

  const dateRangeModel = computed<DateRangeValue>({
    get: () => props.dateRange ?? null,
    set: val => {
      emits('update:dateRange', val)
      emits('change', val)
    },
  })

  const dateTimeRangeModel = computed<DateRangeValue>({
    get: () => props.dateTimeRange ?? null,
    set: val => {
      emits('update:dateTimeRange', val)
      emits('change', val)
    },
  })

  // —— smart-range：两个独立 ref（prop 名为 smartRange，start/endDate 无命名冲突）——
  const startDate = ref<DateValue>(null)
  const endDate = ref<DateValue>(null)
  const endDateDisabled = computed(() => !startDate.value)

  // 将外部 smartRange prop 同步到内部 startDate/endDate
  watch(
    () => props.smartRange,
    val => {
      const newStart = val?.[0] ?? null
      const newEnd = val?.[1] ?? null
      if (newStart === startDate.value && newEnd === endDate.value) return
      startDate.value = newStart
      endDate.value = newEnd
    },
    { immediate: true, deep: true }
  )

  // 用户选择后：两者均有值时 emit；清空开始日期时级联清空结束日期
  watch(
    () => [startDate.value, endDate.value] as const,
    ([startVal, endVal]) => {
      if (!startVal) {
        endDate.value = null
        return
      }
      if (endVal) {
        emits('update:smartRange', [startVal, endVal])
        emits('change', [startVal, endVal])
      }
    },
    { deep: true }
  )

  // —— 日期禁用逻辑 ——
  const singleDisabledDate = (timestamp: number): boolean => {
    if (props.disabledBeforeToday && timestamp < _todayStart) return true
    if (props.disabledAfterToday && timestamp > _todayStart) return true
    return false
  }

  const endDisabledDate = (timestamp: number): boolean => {
    if (!startDate.value) return true
    if (timestamp < new Date(startDate.value).getTime()) return true
    return singleDisabledDate(timestamp)
  }

  // clearAll：emit 驱动父组件清空同名绑定，同时重置 smart-range 内部 ref
  defineExpose({
    clearAll: () => {
      emits('update:singleDate', null)
      emits('update:singleDateTime', null)
      emits('update:dateRange', null)
      emits('update:dateTimeRange', null)
      emits('update:smartRange', null)
      startDate.value = null
      endDate.value = null
    },
  })
</script>
