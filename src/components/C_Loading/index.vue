<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @FilePath: \naive-ui-components\src\components\C_Loading\index.vue
 * @Description: 数据光环加载态，纯 SVG 与 CSS，跟随主题并尊重减少动画设置
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <span
    class="c-loading"
    :class="{ 'c-loading--labeled': !!label }"
    role="status"
    aria-live="polite"
    aria-atomic="true"
    :aria-label="label || t('common.loading')"
    :style="{
      '--c-loading-size': `${safeSize}px`,
      '--c-loading-surface': themeVars.cardColor,
      '--c-loading-border': themeVars.dividerColor,
      '--c-loading-text': themeVars.textColor2,
      color: color || themeVars.primaryColor,
    }"
  >
    <svg
      class="c-loading__glyph"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          :id="orbitGradientId"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            stop-color="currentColor"
            stop-opacity=".06"
          />
          <stop
            offset=".5"
            stop-color="currentColor"
            stop-opacity=".45"
          />
          <stop
            offset="1"
            stop-color="currentColor"
          />
        </linearGradient>
        <linearGradient
          :id="surfaceGradientId"
          x1="16"
          y1="16"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            stop-color="currentColor"
            stop-opacity=".13"
          />
          <stop
            offset="1"
            stop-color="currentColor"
            stop-opacity=".03"
          />
        </linearGradient>
      </defs>
      <circle
        cx="32"
        cy="32"
        r="24"
        stroke="currentColor"
        stroke-width="1.5"
        opacity=".1"
      />
      <g
        class="c-loading__orbit"
        :stroke="`url(#${orbitGradientId})`"
        stroke-width="2.25"
        stroke-linecap="round"
      >
        <path d="M8 32a24 24 0 1 1 24 24" />
        <circle
          cx="32"
          cy="56"
          r="2.5"
          fill="currentColor"
          stroke="none"
        />
      </g>
      <g class="c-loading__orbit c-loading__orbit--inner">
        <path
          d="M18 46a20 20 0 0 1 0-28"
          stroke="currentColor"
          stroke-width="1"
          stroke-linecap="round"
          opacity=".18"
        />
      </g>
      <rect
        x="16"
        y="16"
        width="32"
        height="32"
        rx="11"
        :fill="`url(#${surfaceGradientId})`"
        stroke="currentColor"
        stroke-opacity=".16"
      />
      <g
        v-for="(y, index) in [25, 32, 39]"
        :key="y"
        class="c-loading__row"
        :style="{ animationDelay: `${index * 160}ms` }"
        fill="currentColor"
      >
        <circle
          cx="24"
          :cy="y"
          r="1.5"
        />
        <rect
          x="29"
          :y="y - 1.25"
          :width="index === 1 ? 8 : 12"
          height="2.5"
          rx="1.25"
        />
      </g>
    </svg>
    <span
      v-if="label"
      class="c-loading__label"
      >{{ label }}</span
    >
  </span>
</template>

<script setup lang="ts">
  import { computed, useId } from 'vue'
  import { useThemeVars } from 'naive-ui'
  import { useComponentLocale } from '../../config'
  import type { LoadingProps } from './types'

  defineOptions({ name: 'C_Loading' })
  const props = withDefaults(defineProps<LoadingProps>(), {
    size: 48,
    label: '',
  })
  const themeVars = useThemeVars()
  // 每个实例拥有独立渐变，多个表格同时加载时也不会互相串色。
  const id = useId()
  const orbitGradientId = `c-loading-orbit-${id}`
  const surfaceGradientId = `c-loading-surface-${id}`
  const { t } = useComponentLocale()
  const safeSize = computed(() =>
    Number.isFinite(props.size) ? Math.min(120, Math.max(16, props.size)) : 48
  )
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
