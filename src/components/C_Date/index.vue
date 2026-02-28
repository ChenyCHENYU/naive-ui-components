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
      v-model:value="singleDate"
      type="date"
      :placeholder="placeholder || '请选择日期'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="valueFormat"
      clearable
      v-bind="$attrs"
      @update:value="handleSingleDateChange"
    />

    <NDatePicker
      v-else-if="mode === 'datetime'"
      v-model:value="singleDateTime"
      type="datetime"
      :placeholder="placeholder || '请选择日期时间'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="valueFormat"
      clearable
      v-bind="$attrs"
      @update:value="handleSingleDateTimeChange"
    />

    <NDatePicker
      v-else-if="mode === 'daterange'"
      v-model:value="dateRange"
      type="daterange"
      :start-placeholder="startPlaceholder || '开始日期'"
      :end-placeholder="endPlaceholder || '结束日期'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="valueFormat"
      clearable
      v-bind="$attrs"
      @update:value="handleDateRangeChange"
    />

    <NDatePicker
      v-else-if="mode === 'datetimerange'"
      v-model:value="dateTimeRange"
      type="datetimerange"
      :start-placeholder="startPlaceholder || '开始日期时间'"
      :end-placeholder="endPlaceholder || '结束日期时间'"
      :disabled="disabled"
      :is-date-disabled="singleDisabledDate"
      :value-format="valueFormat"
      clearable
      v-bind="$attrs"
      @update:value="handleDateTimeRangeChange"
    />

    <div v-else-if="mode === 'smart-range'" class="inline-block">
      <div class="flex gap-2.5 items-center">
        <NDatePicker
          class="flex-1"
          v-model:value="startDate"
          type="date"
          :placeholder="startPlaceholder || '请选择开始日期'"
          :is-date-disabled="singleDisabledDate"
          :value-format="valueFormat"
          clearable
          v-bind="startDateProps"
        />
        <NDatePicker
          class="flex-1"
          v-model:value="endDate"
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
import { ref, watch } from "vue";
import { NDatePicker } from "naive-ui";

defineOptions({ name: "C_Date" });

type DatePickerMode =
  | "date"
  | "datetime"
  | "daterange"
  | "datetimerange"
  | "smart-range";

type DateValue = number | null;
type DateRangeValue = [number, number] | null;

interface Props {
  mode?: DatePickerMode;
  placeholder?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  disabled?: boolean;
  disabledBeforeToday?: boolean;
  disabledAfterToday?: boolean;
  valueFormat?: string;
  startDateProps?: Record<string, any>;
  endDateProps?: Record<string, any>;
}

interface Emits {
  (e: "update:singleDate", value: DateValue): void;
  (e: "update:singleDateTime", value: DateValue): void;
  (e: "update:dateRange", value: DateRangeValue): void;
  (e: "update:dateTimeRange", value: DateRangeValue): void;
  (e: "update:smartRange", value: DateRangeValue): void;
  (e: "change", value: DateValue | DateRangeValue): void;
}

const props = withDefaults(defineProps<Props>(), {
  mode: "date",
  placeholder: "",
  startPlaceholder: "",
  endPlaceholder: "",
  disabled: false,
  disabledBeforeToday: false,
  disabledAfterToday: false,
  valueFormat: "yyyy-MM-dd",
  startDateProps: () => ({}),
  endDateProps: () => ({}),
});

const emits = defineEmits<Emits>();

const singleDate = ref<DateValue>(null);
const singleDateTime = ref<DateValue>(null);
const dateRange = ref<DateRangeValue>(null);
const dateTimeRange = ref<DateRangeValue>(null);
const startDate = ref<DateValue>(null);
const endDate = ref<DateValue>(null);
const endDateDisabled = ref(true);

const getTodayTimestamp = (): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

const singleDisabledDate = (timestamp: number): boolean => {
  const todayTimestamp = getTodayTimestamp();
  if (props.disabledBeforeToday && timestamp < todayTimestamp) return true;
  if (props.disabledAfterToday && timestamp > todayTimestamp) return true;
  return false;
};

const endDisabledDate = (timestamp: number): boolean => {
  if (!startDate.value) return true;
  if (timestamp < startDate.value) return true;
  return singleDisabledDate(timestamp);
};

const handleSingleDateChange = (value: DateValue): void => {
  emits("update:singleDate", value);
  emits("change", value);
};

const handleSingleDateTimeChange = (value: DateValue): void => {
  emits("update:singleDateTime", value);
  emits("change", value);
};

const handleDateRangeChange = (value: DateRangeValue): void => {
  emits("update:dateRange", value);
  emits("change", value);
};

const handleDateTimeRangeChange = (value: DateRangeValue): void => {
  emits("update:dateTimeRange", value);
  emits("change", value);
};

watch(
  () => [startDate.value, endDate.value],
  ([startVal, endVal]) => {
    if (!startVal) {
      endDate.value = null;
      endDateDisabled.value = true;
      return;
    }
    if (startVal) {
      endDateDisabled.value = false;
    }
    if (startVal && endVal) {
      const rangeValue: DateRangeValue = [startVal, endVal];
      emits("update:smartRange", rangeValue);
      emits("change", rangeValue);
    }
  },
  { deep: true },
);

defineExpose({
  singleDate,
  singleDateTime,
  dateRange,
  dateTimeRange,
  startDate,
  endDate,
  clearAll: () => {
    singleDate.value = null;
    singleDateTime.value = null;
    dateRange.value = null;
    dateTimeRange.value = null;
    startDate.value = null;
    endDate.value = null;
    endDateDisabled.value = true;
  },
});
</script>
