<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-05-13
 * @Description: 主题组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NTooltip placement="bottom" trigger="hover">
    <template #trigger>
      <NButton text @click="cycleThemeMode">
        <span :class="currentIcon"></span>
      </NButton>
    </template>
    <span>{{ themeTooltip }}</span>
  </NTooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NTooltip, NButton } from "naive-ui";

defineOptions({ name: "C_Theme" });

export type ThemeMode = "system" | "light" | "dark";

const props = withDefaults(
  defineProps<{
    modelValue?: ThemeMode;
  }>(),
  { modelValue: "system" },
);

const emit = defineEmits<{
  "update:modelValue": [mode: ThemeMode];
}>();

const currentIcon = computed(() => {
  switch (props.modelValue) {
    case "light":
      return "i-mdi:white-balance-sunny";
    case "dark":
      return "i-mdi:moon-and-stars";
    default:
      return "i-mdi:sun-moon-stars";
  }
});

const themeTooltip = computed(() => {
  switch (props.modelValue) {
    case "light":
      return "当前: 浅色模式 (点击切换)";
    case "dark":
      return "当前: 深色模式 (点击切换)";
    default:
      return "当前: 跟随系统 (点击切换)";
  }
});

const cycleThemeMode = () => {
  const modes: ThemeMode[] = ["system", "light", "dark"];
  const currentIndex = modes.indexOf(props.modelValue);
  const nextIndex = (currentIndex + 1) % modes.length;
  emit("update:modelValue", modes[nextIndex]);
};
</script>
