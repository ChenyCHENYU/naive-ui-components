<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-30
 * @Description: 表格内置空态，静态矢量与主题文案分离
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-table-empty"
    role="status"
    :style="themeStyle"
  >
    <svg
      class="c-table-empty__icon"
      style="display: block; margin: 0 auto 6px; color: #8b98ff"
      viewBox="0 0 96 84"
      width="96"
      height="84"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        class="c-table-empty__shadow"
        fill="var(--c-table-empty-edge)"
        cx="48"
        cy="78"
        rx="35"
        ry="3"
        opacity=".18"
      />
      <rect
        class="c-table-empty__surface"
        fill="var(--c-table-empty-surface)"
        x="7.5"
        y="5.5"
        width="76"
        height="66"
        rx="9"
      />
      <path
        class="c-table-empty__header"
        fill="var(--c-table-empty-header)"
        d="M17 6h57a9 9 0 0 1 9 9v11H8V15a9 9 0 0 1 9-9Z"
      />
      <rect
        class="c-table-empty__edge"
        stroke="var(--c-table-empty-edge)"
        stroke-width="1.25"
        x="7.5"
        y="5.5"
        width="76"
        height="66"
        rx="9"
        fill="none"
      />
      <path
        class="c-table-empty__grid"
        stroke="var(--c-table-empty-grid)"
        stroke-width="1"
        d="M8 26h75M38 26v45M61 26v45M8 42h75M8 57h75"
      />
      <path
        class="c-table-empty__chip"
        stroke="var(--c-table-empty-chip)"
        stroke-width="5"
        stroke-linecap="round"
        d="M19 15h12m17 0h7m15 0h7"
      />
      <g
        class="c-table-empty__cells"
        stroke="var(--c-table-empty-grid)"
        stroke-width="4"
        stroke-linecap="round"
      >
        <path d="M19 34h12m14 0h8m15 0h8" />
        <path
          d="M19 49h12m14 0h8m15 0h8"
          opacity=".65"
        />
        <path
          d="M19 64h12m14 0h8"
          opacity=".4"
        />
      </g>
      <circle
        class="c-table-empty__shadow"
        fill="var(--c-table-empty-edge)"
        cx="74"
        cy="57"
        r="20"
        opacity=".2"
      />
      <circle
        class="c-table-empty__surface c-table-empty__edge"
        fill="var(--c-table-empty-surface)"
        stroke="var(--c-table-empty-edge)"
        stroke-width="1.25"
        cx="72"
        cy="55"
        r="19"
      />
      <circle
        class="c-table-empty__lens"
        fill="var(--c-table-empty-header)"
        stroke="currentColor"
        stroke-width="1.6"
        cx="70"
        cy="53"
        r="9"
      />
      <path
        class="c-table-empty__mark"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        d="m77 60 6 6m-16-16 6 6m0-6-6 6"
      />
    </svg>
    <div class="c-table-empty__title">{{ title }}</div>
    <div class="c-table-empty__hint">{{ description }}</div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { useThemeVars } from 'naive-ui'
  defineOptions({ name: 'TableEmptyState' })
  defineProps<{ title: string; description: string }>()
  const theme = useThemeVars()
  const themeStyle = computed(() => ({
    '--c-table-empty-surface': theme.value.cardColor,
    '--c-table-empty-fg': theme.value.textColor1,
    '--c-table-empty-hint': theme.value.textColor3,
    '--c-table-empty-header': `color-mix(in srgb, #8b98ff 12%, ${theme.value.cardColor})`,
    '--c-table-empty-edge': `color-mix(in srgb, #8b98ff 30%, ${theme.value.cardColor})`,
    '--c-table-empty-chip': `color-mix(in srgb, #8b98ff 50%, ${theme.value.cardColor})`,
    '--c-table-empty-grid': `color-mix(in srgb, ${theme.value.textColor1} 6%, ${theme.value.cardColor})`,
  }))
</script>
<style lang="scss" scoped>
  @use './index.scss';
</style>
