<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-16
 * @Description: 分割面板组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    ref="containerRef"
    class="c-split-pane"
    :class="[
      `c-split-pane--${direction}`,
      {
        'c-split-pane--dragging': isDragging,
        'c-split-pane--disabled': disabled,
        'c-split-pane--collapsed-first': isFirstCollapsed,
        'c-split-pane--collapsed-second': isSecondCollapsed,
      },
    ]"
  >
    <!-- 首面板 -->
    <div
      class="split-panel split-panel--first"
      :id="firstPanelId"
      :style="firstPanelStyle"
      :aria-hidden="isFirstCollapsed || undefined"
      :inert="isFirstCollapsed"
    >
      <div class="split-panel__content">
        <slot
          name="first"
          :size="panelSize"
          :collapsed="isFirstCollapsed"
        />
      </div>
    </div>

    <!-- 分割线手柄 -->
    <div
      class="split-gutter"
      :style="gutterStyle"
      role="separator"
      :aria-orientation="direction === 'horizontal' ? 'vertical' : 'horizontal'"
      :aria-valuenow="panelSize"
      :aria-valuemin="isFirstCollapsed ? 0 : bounds.min"
      :aria-valuemax="isSecondCollapsed ? 100 : bounds.max"
      :aria-disabled="disabled || undefined"
      :aria-controls="firstPanelId"
      :aria-label="ariaLabel"
      :tabindex="disabled ? -1 : 0"
      @pointerdown="handleMouseDown"
      @dblclick="handleDoubleClick"
      @keydown="handleKeyDown"
    >
      <div
        class="split-gutter__controls"
        :class="{
          'split-gutter__controls--with-collapse':
            showCollapseButton && collapsible,
        }"
      >
        <button
          v-if="showCollapseButton && collapsible"
          class="split-gutter__collapse-btn split-gutter__collapse-btn--first"
          type="button"
          :disabled="disabled"
          :aria-label="isFirstCollapsed ? '展开首面板' : '折叠首面板'"
          :aria-expanded="!isFirstCollapsed"
          :aria-controls="firstPanelId"
          :title="isFirstCollapsed ? '展开首面板' : '折叠首面板'"
          @click.stop="toggle('first')"
          @pointerdown.stop
          @dblclick.stop
        >
          <svg
            class="split-gutter__chevron"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m9.5 4.5-3.5 3.5 3.5 3.5" />
          </svg>
        </button>

        <div
          class="split-gutter__visual"
          aria-hidden="true"
        >
          <div class="split-gutter__dots">
            <span
              v-for="i in 3"
              :key="i"
              class="split-gutter__dot"
            />
          </div>
        </div>

        <button
          v-if="showCollapseButton && collapsible"
          class="split-gutter__collapse-btn split-gutter__collapse-btn--second"
          type="button"
          :disabled="disabled"
          :aria-label="isSecondCollapsed ? '展开第二面板' : '折叠第二面板'"
          :aria-expanded="!isSecondCollapsed"
          :aria-controls="secondPanelId"
          :title="isSecondCollapsed ? '展开第二面板' : '折叠第二面板'"
          @click.stop="toggle('second')"
          @pointerdown.stop
          @dblclick.stop
        >
          <svg
            class="split-gutter__chevron"
            viewBox="0 0 16 16"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m9.5 4.5-3.5 3.5 3.5 3.5" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 第二面板 -->
    <div
      class="split-panel split-panel--second"
      :id="secondPanelId"
      :style="secondPanelStyle"
      :aria-hidden="isSecondCollapsed || undefined"
      :inert="isSecondCollapsed"
    >
      <div class="split-panel__content">
        <slot
          name="second"
          :size="100 - panelSize"
          :collapsed="isSecondCollapsed"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, toRef, useId } from 'vue'
  import { useSplitResize } from './composables/useSplitResize'
  import type {
    SplitPaneProps,
    SplitPaneEmits,
    SplitPaneExpose,
    PanelInfo,
  } from './types'

  defineOptions({ name: 'C_SplitPane' })

  const props = withDefaults(defineProps<SplitPaneProps>(), {
    direction: 'horizontal',
    ariaLabel: '调整面板大小',
    defaultSize: 50,
    minSize: 0,
    minFirstSize: 0,
    minSecondSize: 0,
    maxSize: 100,
    disabled: false,
    collapsible: true,
    showCollapseButton: true,
    gutterSize: 6,
    step: 2,
  })

  const emit = defineEmits<SplitPaneEmits>()
  defineSlots<{
    first(props: PanelInfo): unknown
    second(props: PanelInfo): unknown
  }>()
  const panelId = useId()
  const firstPanelId = `split-${panelId}-first`
  const secondPanelId = `split-${panelId}-second`

  const containerRef = ref<HTMLElement | null>(null)

  const {
    panelSize,
    bounds,
    gutterSize,
    isDragging,
    isFirstCollapsed,
    isSecondCollapsed,
    handleMouseDown,
    handleDoubleClick,
    handleKeyDown,
    collapse,
    expand,
    toggle,
    resetSize,
    setSize,
    getPanelInfo,
  } = useSplitResize({
    containerRef,
    direction: toRef(props, 'direction'),
    size: toRef(props, 'size'),
    defaultSize: toRef(props, 'defaultSize'),
    minSize: toRef(props, 'minSize'),
    maxSize: toRef(props, 'maxSize'),
    minFirstSize: toRef(props, 'minFirstSize'),
    minSecondSize: toRef(props, 'minSecondSize'),
    gutterSize: toRef(props, 'gutterSize'),
    disabled: toRef(props, 'disabled'),
    collapsible: toRef(props, 'collapsible'),
    step: toRef(props, 'step'),
    onUpdateSize: size => emit('update:size', size),
    onResize: (first, second) => emit('resize', first, second),
    onCollapse: target => emit('collapse', target),
    onExpand: target => emit('expand', target),
    onDragStart: size => emit('drag-start', size),
    onDragEnd: size => emit('drag-end', size),
  })

  /* ─── 计算样式 ──────────────────────────────── */
  // Flex divides the remaining space after the non-shrinking gutter. A collapsed
  // panel has a literal zero basis, so no negative calc() can affect nested tables.
  const firstPanelStyle = computed(() => ({ flex: `${panelSize.value} 1 0px` }))
  const secondPanelStyle = computed(() => ({
    flex: `${100 - panelSize.value} 1 0px`,
  }))
  const gutterStyle = computed(() =>
    props.direction === 'horizontal'
      ? { width: `${gutterSize.value}px` }
      : { height: `${gutterSize.value}px` }
  )

  /* ─── 暴露方法 ──────────────────────────────── */
  defineExpose<SplitPaneExpose>({
    collapse,
    expand,
    toggle,
    resetSize,
    getPanelInfo,
    setSize,
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
