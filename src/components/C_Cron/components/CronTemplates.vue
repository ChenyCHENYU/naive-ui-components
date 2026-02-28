<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: Cron 常用模板（底部卡片网格）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div class="cron-templates">
    <div class="cron-templates__header">
      <C_Icon name="mdi:lightning-bolt" :size="15" />
      <span>常用模板</span>
    </div>

    <div class="cron-templates__cards">
      <div
        v-for="template in templates"
        :key="template.value"
        class="cron-templates__card"
        :class="{
          'cron-templates__card--active': template.value === currentValue,
        }"
        @click="$emit('select', template.value)"
      >
        <div class="cron-templates__card-name">{{ template.label }}</div>
        <div class="cron-templates__card-expr">{{ template.value }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import C_Icon from "../../C_Icon/index.vue";
import type { CronTemplate } from "../types";

interface Props {
  templates: CronTemplate[];
  currentValue: string;
}

defineProps<Props>();
defineEmits<{
  select: [value: string];
}>();
</script>

<style lang="scss" scoped>
.cron-templates {
  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 10px;
    color: var(--c-text-1);
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }

  &__card {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--c-border);
    cursor: pointer;
    transition: all var(--c-transition, 0.2s ease);

    &:hover {
      border-color: var(--c-primary);
      background: color-mix(in srgb, var(--c-primary) 4%, transparent);
    }

    &--active {
      border-color: var(--c-primary);
      background: color-mix(in srgb, var(--c-primary) 8%, transparent);
    }
  }

  &__card-name {
    font-size: 13px;
    font-weight: 500;
    line-height: 1.4;
  }

  &__card-expr {
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    color: var(--c-text-4);
    margin-top: 2px;
  }
}
</style>
