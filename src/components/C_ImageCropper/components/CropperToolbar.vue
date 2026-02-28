<template>
  <div class="cropper-toolbar">
    <NButtonGroup size="small">
      <NButton
        v-for="item in ratioPresets"
        :key="item.value"
        :type="currentRatio === item.value ? 'primary' : 'default'"
        @click="$emit('ratio', item.value)"
      >
        {{ item.label }}
      </NButton>
    </NButtonGroup>

    <NDivider vertical />

    <NTooltip>
      <template #trigger>
        <NButton size="small" quaternary @click="$emit('rotate', -90)">
          <template #icon><C_Icon name="mdi:rotate-left" /></template>
        </NButton>
      </template>
      逆时针旋转 90°
    </NTooltip>
    <NTooltip>
      <template #trigger>
        <NButton size="small" quaternary @click="$emit('rotate', 90)">
          <template #icon><C_Icon name="mdi:rotate-right" /></template>
        </NButton>
      </template>
      顺时针旋转 90°
    </NTooltip>

    <NDivider vertical />

    <NTooltip>
      <template #trigger>
        <NButton size="small" quaternary @click="$emit('flipX')">
          <template #icon><C_Icon name="mdi:flip-horizontal" /></template>
        </NButton>
      </template>
      水平翻转
    </NTooltip>
    <NTooltip>
      <template #trigger>
        <NButton size="small" quaternary @click="$emit('flipY')">
          <template #icon><C_Icon name="mdi:flip-vertical" /></template>
        </NButton>
      </template>
      垂直翻转
    </NTooltip>

    <NDivider vertical />

    <NTooltip>
      <template #trigger>
        <NButton size="small" quaternary @click="$emit('zoom', 0.1)">
          <template #icon><C_Icon name="mdi:magnify-plus-outline" /></template>
        </NButton>
      </template>
      放大
    </NTooltip>
    <NTooltip>
      <template #trigger>
        <NButton size="small" quaternary @click="$emit('zoom', -0.1)">
          <template #icon><C_Icon name="mdi:magnify-minus-outline" /></template>
        </NButton>
      </template>
      缩小
    </NTooltip>

    <NDivider vertical />

    <NTooltip>
      <template #trigger>
        <NButton size="small" quaternary @click="$emit('reset')">
          <template #icon><C_Icon name="mdi:refresh" /></template>
        </NButton>
      </template>
      重置
    </NTooltip>
  </div>
</template>

<script setup lang="ts">
import { NButton, NButtonGroup, NDivider, NTooltip } from "naive-ui";
import C_Icon from "../../C_Icon/index.vue";
import type { AspectRatioPreset } from "../types";

defineProps<{
  currentRatio: number;
  ratioPresets: AspectRatioPreset[];
}>();

defineEmits<{
  ratio: [value: number];
  rotate: [angle: number];
  flipX: [];
  flipY: [];
  zoom: [scale: number];
  reset: [];
}>();
</script>

<style lang="scss" scoped>
.cropper-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 8px 0;
}
</style>
