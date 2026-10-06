<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @FilePath: \naive-ui-components\src\components\C_Loading\index.vue
 * @Description: 机器人数据扫描加载态，纯 SVG 与 CSS，跟随主题并尊重减少动画设置
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <span
    class="c-loading"
    :class="{ 'c-loading--labeled': !!label }"
    role="status"
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
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="14"
        fill="currentColor"
        opacity=".045"
      />
      <path
        class="c-loading__frame"
        d="M13 21v-4a4 4 0 0 1 4-4h4m22 0h4a4 4 0 0 1 4 4v4m0 22v4a4 4 0 0 1-4 4h-4m-22 0h-4a4 4 0 0 1-4-4v-4"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <rect
        x="20"
        y="22"
        width="24"
        height="21"
        rx="6"
        fill="currentColor"
        fill-opacity=".08"
        stroke="currentColor"
        stroke-width="1.7"
      />
      <path
        d="M32 17v5M24 47h16"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        opacity=".65"
      />
      <circle
        cx="32"
        cy="15"
        r="2"
        fill="currentColor"
      />
      <g
        class="c-loading__eyes"
        fill="currentColor"
      >
        <rect
          x="25.5"
          y="29"
          width="3"
          height="4"
          rx="1.5"
        />
        <rect
          x="35.5"
          y="29"
          width="3"
          height="4"
          rx="1.5"
        />
      </g>
      <path
        d="M28 37h8"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        opacity=".65"
      />
      <rect
        class="c-loading__scan"
        x="23"
        y="25"
        width="18"
        height="2"
        rx="1"
        fill="currentColor"
      />
      <path
        class="c-loading__packet c-loading__packet--in"
        d="M9 30h4m-4 4h7"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path
        class="c-loading__packet c-loading__packet--out"
        d="M48 30h7m-4 4h4"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <span
      v-if="label"
      class="c-loading__label"
      >{{ label }}</span
    >
  </span>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useThemeVars } from 'naive-ui'
  import { useComponentLocale } from '../../config'
  import type { LoadingProps } from './types'

  defineOptions({ name: 'C_Loading' })
  const props = withDefaults(defineProps<LoadingProps>(), {
    size: 48,
    label: '',
  })
  const themeVars = useThemeVars()
  const { t } = useComponentLocale()
  const safeSize = computed(() =>
    Number.isFinite(props.size) ? Math.min(120, Math.max(16, props.size)) : 48
  )
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
