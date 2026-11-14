<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 章节标记 UI
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div
    v-if="chapters.length"
    class="vp-chapter-markers"
  >
    <!-- 当前章节信息 -->
    <div
      v-if="currentChapter"
      class="vp-chapter-current"
    >
      <span class="vp-chapter-index"
        >{{ currentIndex + 1 }}/{{ chapters.length }}</span
      >
      <span class="vp-chapter-title">{{ currentChapter.title }}</span>
    </div>

    <!-- 章节列表面板 -->
    <NPopover
      trigger="click"
      placement="top-start"
      :show-arrow="false"
      :style="{ ...themeStyle, maxHeight: '300px', overflowY: 'auto' }"
    >
      <template #trigger>
        <NButton
          quaternary
          size="small"
          class="vp-chapter-trigger"
        >
          <template #icon>
            <C_Icon
              name="mdi:playlist-play"
              :size="16"
            />
          </template>
          章节
        </NButton>
      </template>

      <div class="vp-chapter-list">
        <button
          type="button"
          v-for="(chapter, idx) in chapters"
          :key="chapter.id"
          class="vp-chapter-item"
          :aria-current="chapter.id === currentChapter?.id ? 'true' : undefined"
          :class="{ 'is-active': chapter.id === currentChapter?.id }"
          @click="$emit('goTo', chapter.id)"
        >
          <span class="vp-chapter-item-index">{{ idx + 1 }}</span>
          <span class="vp-chapter-item-title">{{ chapter.title }}</span>
          <span class="vp-chapter-item-time">{{
            formatTime(chapter.startTime)
          }}</span>
        </button>
      </div>
    </NPopover>
  </div>
</template>

<script setup lang="ts">
  import { useComponentTheme } from '../../../composables/useComponentTheme'
  import C_Icon from '../../C_Icon/index.vue'
  const themeStyle = useComponentTheme()
  import type { Chapter } from '../types'

  interface Props {
    chapters: Chapter[]
    currentChapter: Chapter | null
    currentIndex: number
  }

  defineProps<Props>()

  defineEmits<{
    goTo: [chapterId: string]
  }>()

  /** 格式化时间为 mm:ss */
  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
</script>

<style scoped lang="scss">
  .vp-chapter-markers {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .vp-chapter-current {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #fff;
    font-size: 12px;
  }

  .vp-chapter-index {
    opacity: 0.7;
  }

  .vp-chapter-trigger {
    color: #fff;
    font-size: 12px;
  }

  .vp-chapter-icon {
    font-size: 14px;
  }

  .vp-chapter-list {
    display: flex;
    flex-direction: column;
    min-width: 240px;
  }

  .vp-chapter-item {
    appearance: none;
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 13px;
    transition: background-color 0.2s;

    &:focus-visible {
      outline: 2px solid var(--c-primary, var(--c-theme-primary));
      outline-offset: -2px;
    }
    &:hover {
      background-color: var(--c-bg-hover, var(--c-theme-bg-hover));
    }

    &.is-active {
      color: var(--c-primary, var(--c-theme-primary, #18a058));
      font-weight: 600;
    }

    &-index {
      width: 20px;
      text-align: center;
      opacity: 0.5;
      font-size: 12px;
    }

    &-title {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &-time {
      opacity: 0.5;
      font-size: 12px;
      font-variant-numeric: tabular-nums;
    }
  }
</style>
