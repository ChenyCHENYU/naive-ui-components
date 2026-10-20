<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Date,
    type DateProps,
    type DateModelValue,
    type DatePickerMode,
  } from '@robot-admin/naive-ui-components/C_Date'
  import {
    C_Time,
    type TimeProps,
    type TimeModelValue,
    type TimeMode,
  } from '@robot-admin/naive-ui-components/C_Time'
  const day = ref<string | null>(null)
  const days = ref<[string, string] | null>(null)
  const time = ref<number | null>(null)
  const times = ref<[number | null, number | null] | null>(null)
  const dateMode = ref<DatePickerMode>('date')
  const dynamicDate = ref<DateModelValue>(null)
  const timeMode = ref<TimeMode>('range')
  const dynamicTime = ref<TimeModelValue>(null)
  const singleDateChanged = (value: string | null) => {
    value?.toUpperCase()
  }
  const rangeDateChanged = (value: [string, string] | null) => {
    value?.[0].toUpperCase()
  }
  const singleTimeChanged = (value: number | null) => {
    value?.toFixed()
  }
  const rangeTimeChanged = (value: [number | null, number | null] | null) => {
    value?.[0]?.toFixed()
  }
  const maybeDateMode = ref<'daterange' | undefined>(undefined)
  const maybeDateValue = ref<DateModelValue<'daterange' | undefined>>(null)
  const maybeTimeMode = ref<'single' | undefined>(undefined)
  const maybeTimeValue = ref<TimeModelValue<'single' | undefined>>(null)
  const inspectOptionalProps = () => {
    C_Date({
      mode: maybeDateMode.value,
      modelValue: days.value,
      // @ts-expect-error optional 模式的函数式 Props 同样拒绝过窄回调。
      onChange: rangeDateChanged,
    })
    C_Time({
      mode: maybeTimeMode.value,
      modelValue: time.value,
      // @ts-expect-error optional 模式的函数式 Props 同样拒绝过窄回调。
      onChange: singleTimeChanged,
    })
  }
  void inspectOptionalProps
  // @ts-expect-error 静态单选日期模式不接受范围。
  const badDate: DateProps<'date'> = { mode: 'date', modelValue: ['a', 'b'] }
  // @ts-expect-error 静态单选时间模式不接受范围。
  const badTime: TimeProps<'single'> = { mode: 'single', modelValue: [1, 2] }
  void [badDate, badTime]
</script>
<template>
  <C_Date
    v-model="day"
    class="date-field"
    :style="{ minWidth: '12rem' }"
    :key="'single-date'"
    mode="date"
    @change="singleDateChanged"
  />
  <C_Date
    v-model="day"
    @change="singleDateChanged"
  />
  <C_Date
    v-model="days"
    mode="daterange"
    @change="rangeDateChanged"
  />
  <C_Date
    v-model="dynamicDate"
    :mode="dateMode"
  />
  <C_Date
    v-model:single-date="day"
    mode="date"
  />
  <C_Date
    v-model:date-range="days"
    mode="daterange"
  />
  <C_Time
    v-model="time"
    class="time-field"
    :style="{ minWidth: '12rem' }"
    :key="'single-time'"
    mode="single"
    @change="singleTimeChanged"
  />
  <C_Time
    v-model="times"
    mode="range"
    @change="rangeTimeChanged"
  />
  <C_Time
    v-model="times"
    @change="rangeTimeChanged"
  />
  <C_Time
    v-model="dynamicTime"
    :mode="timeMode"
  />
  <C_Date
    :mode="maybeDateMode"
    v-model="maybeDateValue"
  />
  <C_Time
    :mode="maybeTimeMode"
    v-model="maybeTimeValue"
  />
  <!-- @vue-expect-error optional mode 的默认日期分支也可能发布字符串。 -->
  <C_Date
    :mode="maybeDateMode"
    v-model="days"
    @change="rangeDateChanged"
  />
  <!-- @vue-expect-error optional mode 的默认时间分支也可能发布范围。 -->
  <C_Time
    :mode="maybeTimeMode"
    v-model="time"
    @change="singleTimeChanged"
  />
  <!-- @vue-expect-error 静态单选模式不会因为错误模型反向扩大为联合模式。 -->
  <C_Date
    v-model="days"
    mode="date"
  />
  <!-- @vue-expect-error 静态单选模式不会因为错误模型反向扩大为联合模式。 -->
  <C_Time
    v-model="times"
    mode="single"
  />
</template>
