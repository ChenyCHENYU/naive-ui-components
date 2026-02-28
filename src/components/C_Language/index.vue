<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-11-19
 * @Description: 语言切换组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NDropdown
    size="small"
    trigger="hover"
    :options="finalOptions"
    :value="modelValue"
    @select="handleLanguageChange"
  >
    <NButton text>
      <div class="flex items-center">
        <span class="i-mdi:language"></span>
      </div>
    </NButton>
  </NDropdown>
</template>

<script setup lang="ts">
import { computed, h } from "vue";
import { NDropdown, NButton } from "naive-ui";

defineOptions({ name: "C_Language" });

export interface LanguageOption {
  key: string;
  label: string;
  iconClass?: string;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    options?: LanguageOption[];
  }>(),
  {
    modelValue: "zh-cn",
    options: () => [
      { key: "zh-cn", label: "简体中文", iconClass: "i-mdi:alpha-c" },
      { key: "en", label: "English", iconClass: "i-mdi:alpha-u" },
      { key: "ja", label: "日本語", iconClass: "i-mdi:alpha-j" },
      { key: "ko", label: "한국어", iconClass: "i-mdi:alpha-k" },
    ],
  },
);

const emit = defineEmits<{
  "update:modelValue": [key: string];
  change: [key: string];
}>();

const finalOptions = computed(() =>
  props.options.map((opt) => ({
    key: opt.key,
    label: opt.label,
    icon: opt.iconClass ? () => h("span", { class: opt.iconClass }) : undefined,
  })),
);

const handleLanguageChange = (key: string) => {
  if (key === props.modelValue) return;
  emit("update:modelValue", key);
  emit("change", key);
};
</script>
