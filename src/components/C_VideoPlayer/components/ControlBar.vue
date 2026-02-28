<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 自定义控制栏（扩展 xgplayer 原生控制栏的补充 UI）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div v-if="visible" class="vp-control-bar">
    <div class="vp-control-bar__left">
      <slot name="left" />
    </div>

    <div class="vp-control-bar__center">
      <slot name="center" />
    </div>

    <div class="vp-control-bar__right">
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 是否显示 */
  visible?: boolean;
}

withDefaults(defineProps<Props>(), {
  visible: true,
});
</script>

<style scoped lang="scss">
.vp-control-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: linear-gradient(rgba(0, 0, 0, 0.6), transparent);
  pointer-events: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  opacity: 0;
  transition: opacity var(--c-transition, 0.2s ease);

  &:hover,
  .c-video-player:hover & {
    opacity: 1;
  }

  &__left,
  &__center,
  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__center {
    flex: 1;
    justify-content: center;
  }
}
</style>
