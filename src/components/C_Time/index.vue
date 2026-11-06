<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-05-29
 * @Description: 时间选择器 — 薄 UI 壳，逻辑由 useTimeSelection 驱动
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-time-wrapper">
    <!-- 时间段选择模式 -->
    <div
      v-if="mode === 'range'"
      class="time-range-container"
    >
      <NTimePicker
        :placeholder="startPlaceholder"
        :actions="['now', 'confirm']"
        v-bind="mergedStartAttrs"
        :value="startTime"
        :disabled="startTimeDisabled"
        @update:value="handleStartTimeChange"
      />
      <span class="range-separator">至</span>
      <NTimePicker
        :placeholder="endPlaceholder"
        :actions="['now', 'confirm']"
        :is-hour-disabled="
          props.enableTimeRestriction ? isEndHourDisabled : undefined
        "
        :is-minute-disabled="
          props.enableTimeRestriction ? isEndMinuteDisabled : undefined
        "
        :is-second-disabled="
          props.enableTimeRestriction ? isEndSecondDisabled : undefined
        "
        v-bind="mergedEndAttrs"
        :value="endTime"
        :disabled="endTimeDisabled"
        @update:value="handleEndTimeChange"
      />
    </div>

    <!-- 单个时间选择模式 -->
    <div
      v-else
      class="time-single-container"
    >
      <NTimePicker
        :placeholder="placeholder"
        :actions="['now', 'confirm']"
        v-bind="mergedAttrs"
        :value="singleTime"
        :disabled="singleTimeDisabled"
        @update:value="handleSingleTimeChange"
      />
    </div>
  </div>
</template>

<script
  lang="ts"
  setup
  generic="
    M extends TimeMode | undefined = 'range',
    V extends TemporalValueMode = 'timestamp'
  "
>
  import { computed, type Ref } from 'vue'
  import { NTimePicker } from 'naive-ui'
  import { useTimeSelection } from './composables/useTimeSelection'
  import type { TemporalValueMode } from '../../core/temporalField'
  import type {
    TimeRuntimeProps,
    TimeEmits,
    TimeMode,
    TimeExpose,
  } from './types'

  defineOptions({ name: 'C_Time' })

  const props = withDefaults(defineProps<TimeRuntimeProps<M, V>>(), {
    startPlaceholder: '请选择开始时间',
    endPlaceholder: '请选择结束时间',
    placeholder: '请选择时间',
    format: 'HH:mm',
    useHours: true,
    useMinutes: true,
    useSeconds: false,
    hourStep: 1,
    minuteStep: 30,
    secondStep: 1,
    startTimeProps: () => ({}),
    endTimeProps: () => ({}),
    attrs: () => ({}),
    defaultStartTime: null,
    defaultEndTime: null,
    defaultSingleTime: null,
    enableTimeRestriction: false,
    clearable: undefined,
  })

  const emit = defineEmits<TimeEmits<M, V>>()
  const mode = computed(() => props.mode ?? 'range')

  const {
    startTime,
    endTime,
    singleTime,
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
  } = useTimeSelection(
    props,
    // 引擎按当前 mode 生成对应值；桥接层保留公开事件的模式推导。
    emit as Parameters<typeof useTimeSelection>[1]
  )

  defineExpose({
    reset,
    startTime,
    endTime,
    singleTime,
  } satisfies {
    [K in keyof TimeExpose]: TimeExpose[K] | Ref<TimeExpose[K]>
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
