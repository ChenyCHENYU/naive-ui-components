<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-05-28
 * @Description: 级联选择组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="n-cascade-selector">
    <NSelect
      v-for="(level, index) in levels"
      :key="index"
      v-model:value="selectedValues[index]"
      :options="levelOptions[index]"
      clearable
      :placeholder="placeholders[index]"
      :disabled="index > 0 && !selectedValues[index - 1]"
      @update:value="handleChange(index)"
      class="n-select-item"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from "vue";
import { NSelect } from "naive-ui";

defineOptions({ name: "C_Cascade" });

export interface CascadeItem {
  label: string;
  value: string | number;
  children?: CascadeItem[];
}

interface CascadeValue {
  primary?: Pick<CascadeItem, "label" | "value"> | null;
  secondary?: Pick<CascadeItem, "label" | "value"> | null;
  tertiary?: Pick<CascadeItem, "label" | "value"> | null;
}

const props = withDefaults(
  defineProps<{
    data: CascadeItem[];
    placeholders?: string[];
    modelValue?: CascadeValue;
  }>(),
  {
    placeholders: () => ["请选择", "请选择", "请选择"],
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: CascadeValue];
  change: [value: CascadeValue];
}>();

const levels = [0, 1, 2];
const selectedValues = ref<(string | number | null)[]>([null, null, null]);

const getLevelData = (level: number): CascadeItem[] => {
  if (level === 0) return props.data;
  if (!selectedValues.value[level - 1]) return [];
  const parentData = getLevelData(level - 1);
  return (
    parentData.find((x) => x.value === selectedValues.value[level - 1])
      ?.children || []
  );
};

const levelOptions = computed(() =>
  levels.map((level) =>
    getLevelData(level).map((item) => ({
      label: item.label,
      value: item.value,
    })),
  ),
);

const handleChange = (index: number) => {
  selectedValues.value.splice(
    index + 1,
    levels.length - index - 1,
    ...Array(levels.length - index - 1).fill(null),
  );
  emitValue();
};

const getSelectedItem = (index: number) => {
  const value = selectedValues.value[index];
  if (!value) return null;
  const data = getLevelData(index);
  const item = data.find((i) => i.value === value);
  return item ? { label: item.label, value: item.value } : null;
};

const emitValue = () => {
  const result: CascadeValue = {
    primary: getSelectedItem(0),
    secondary: getSelectedItem(1),
    tertiary: getSelectedItem(2),
  };
  emit("update:modelValue", result);
  emit("change", result);
};

watch(
  () => props.modelValue,
  (val) => {
    selectedValues.value = [
      val?.primary?.value ?? null,
      val?.secondary?.value ?? null,
      val?.tertiary?.value ?? null,
    ];
  },
  { immediate: true, deep: true },
);
</script>

<style scoped lang="scss">
.n-cascade-selector {
  display: flex;
  gap: 12px;
  .n-select-item {
    min-width: 140px;
    flex: 1;
  }
}
</style>
