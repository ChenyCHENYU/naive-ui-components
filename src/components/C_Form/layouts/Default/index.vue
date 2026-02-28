<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 卡片布局 - 基础默认布局
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="c-form-default">
    <template v-for="item in formItems" :key="item.key">
      <component :is="item" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { type VNode } from "vue";

interface Props {
  formItems: VNode[];
  layoutConfig?: any;
  options?: any[];
}

defineProps<Props>();
</script>

<style scoped>
.c-form-default {
  width: 100%;
}
</style>
