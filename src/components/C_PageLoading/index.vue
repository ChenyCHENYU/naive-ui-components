<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 同心轨道与波形 SVG 页面加载，主题自适应且样式隔离
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <Teleport to="body">
    <Transition name="c-page-loading-fade">
      <div
        v-if="show"
        class="c-page-loading"
        :style="{
          '--c-page-loading-surface': themeVars.cardColor,
          '--c-page-loading-body': themeVars.bodyColor,
          '--c-page-loading-border': themeVars.dividerColor,
          '--c-page-loading-text': themeVars.textColor1,
          '--c-page-loading-muted': themeVars.textColor3,
          color: color || themeVars.primaryColor,
        }"
      >
        <div
          class="c-page-loading__card"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <svg
            class="c-page-loading__glyph"
            viewBox="0 0 80 80"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <circle
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              stroke-opacity=".08"
            />
            <circle
              class="c-page-loading__outer"
              cx="40"
              cy="40"
              r="35"
              stroke="currentColor"
              stroke-opacity=".38"
              stroke-width="2"
              stroke-dasharray="64 156"
              stroke-linecap="round"
            />
            <circle
              class="c-page-loading__inner"
              cx="40"
              cy="40"
              r="24"
              stroke="currentColor"
              stroke-opacity=".24"
              stroke-width="1.5"
              stroke-dasharray="34 117"
              stroke-linecap="round"
            />
            <circle
              class="c-page-loading__pulse"
              cx="40"
              cy="40"
              r="17"
              fill="currentColor"
              fill-opacity=".06"
            />
            <path
              class="c-page-loading__wave"
              d="M11 40 Q20.5 27 30 40 Q39.5 53 49 40 Q58.5 27 68 40"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
            <circle
              cx="40"
              cy="40"
              r="3"
              fill="currentColor"
            />
          </svg>
          <span class="c-page-loading__label">{{
            label || t('common.loading')
          }}</span>
          <span
            v-if="description"
            class="c-page-loading__description"
            >{{ description }}</span
          >
          <span
            class="c-page-loading__track"
            aria-hidden="true"
          ></span>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
  import { useThemeVars } from 'naive-ui'
  import { useComponentLocale } from '../../config'
  import type { PageLoadingProps } from './types'

  defineOptions({ name: 'C_PageLoading' })
  defineProps<PageLoadingProps>()
  const themeVars = useThemeVars()
  const { t } = useComponentLocale()
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
