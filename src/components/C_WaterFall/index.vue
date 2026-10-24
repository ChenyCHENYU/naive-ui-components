<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 瀑布流布局组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div
    ref="containerRef"
    class="c-waterfall"
  >
    <div
      class="waterfall__body"
      :style="{ height: `${bodyHeight}px`, position: 'relative' }"
    >
      <template v-if="showSkeleton">
        <div
          v-for="(sk, idx) in skeletonItems"
          :key="`sk-${idx}`"
          class="waterfall__skeleton"
          :style="{
            position: 'absolute',
            left: `${sk.x}px`,
            top: `${sk.y}px`,
            width: `${sk.width}px`,
            height: `${sk.height}px`,
            transition: `all ${props.animationDuration ?? DEFAULT_ANIMATION_DURATION}ms ease`,
          }"
        >
          <slot name="skeleton">
            <div class="waterfall__skeleton-inner" />
          </slot>
        </div>
      </template>

      <div
        v-for="{ layout: lay, index } in visibleItems"
        :key="lay.item.id"
        :ref="el => observeItem(el, lay.item.id)"
        class="waterfall__item"
        role="button"
        tabindex="0"
        :data-waterfall-index="index"
        :aria-label="lay.item.title || `瀑布流项目 ${index + 1}`"
        :style="{
          position: 'absolute',
          left: `${lay.x}px`,
          top: `${lay.y}px`,
          width: `${lay.width}px`,
          transition: `all ${props.animationDuration ?? DEFAULT_ANIMATION_DURATION}ms ease`,
        }"
        @click="emit('item-click', lay.item, index)"
        @keydown="handleItemKeydown($event, lay, index)"
        @focusin="pinItem(lay.item.id)"
        @focusout="releaseItem"
      >
        <slot
          name="item"
          :item="lay.item"
          :index="index"
          :width="lay.width"
          :height="lay.height"
        >
          <div class="waterfall__card">
            <img
              :src="lay.item.src"
              :alt="lay.item.title || ''"
              :loading="props.lazy ? 'lazy' : 'eager'"
              class="waterfall__image"
              :style="{ height: `${lay.height}px` }"
              @load="handleImageLoaded(lay, $event)"
              @error="handleImageError(lay)"
            />
            <div
              v-if="lay.item.title"
              class="waterfall__title"
            >
              {{ lay.item.title }}
            </div>
          </div>
        </slot>
      </div>
    </div>

    <div
      v-if="props.infinite"
      class="waterfall__footer"
    >
      <div
        ref="sentinelRef"
        class="waterfall__sentinel"
      />
      <slot
        name="footer"
        :status="scrollStatus"
        :paused="loadMorePaused"
        :load-more="resumeLoadMore"
      >
        <div
          v-if="props.loading"
          class="waterfall__status"
        >
          <NSpin size="small" />
          <span>加载中…</span>
        </div>
        <div
          v-else-if="props.noMore"
          class="waterfall__status waterfall__status--done"
        >
          没有更多了
        </div>
        <NButton
          v-else-if="loadMorePaused"
          size="small"
          @click="resumeLoadMore"
          >继续加载</NButton
        >
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    nextTick,
    onActivated,
    onDeactivated,
    onUnmounted,
    type Ref,
  } from 'vue'
  import { NSpin, NButton } from 'naive-ui'
  import type {
    WaterFallItem,
    WaterFallLayoutItem,
    WaterFallProps,
    WaterFallExpose,
    WaterFallBreakpoint,
  } from './types'
  import {
    DEFAULT_GAP,
    DEFAULT_ANIMATION_DURATION,
    DEFAULT_SKELETON_COUNT,
    SKELETON_HEIGHT_RANGE,
  } from './constants'
  import { useResponsiveColumns } from './composables/useResponsiveColumns'
  import { useWaterFallLayout } from './composables/useWaterFallLayout'
  import { useInfiniteScroll } from './composables/useInfiniteScroll'
  import { useWaterFallWindow } from './composables/useWaterFallWindow'

  defineOptions({ name: 'C_WaterFall' })

  const props = withDefaults(defineProps<WaterFallProps>(), {
    columns: undefined,
    gap: DEFAULT_GAP,
    lazy: true,
    virtualScroll: true,
    infinite: false,
    skeleton: true,
    skeletonCount: DEFAULT_SKELETON_COUNT,
    animationDuration: DEFAULT_ANIMATION_DURATION,
    breakpoints: undefined,
    loading: false,
    noMore: false,
  })

  const emit = defineEmits<{
    'load-more': []
    'item-click': [item: WaterFallItem, index: number]
    'image-loaded': [item: WaterFallItem]
    'image-error': [item: WaterFallItem]
  }>()

  const containerRef = ref<HTMLElement>()
  const sentinelRef = ref<HTMLElement>()

  const fixedColumns = computed(() => props.columns)
  const breakpointsRef = computed(() => props.breakpoints)
  const { columns, containerWidth } = useResponsiveColumns(
    containerRef,
    fixedColumns as Ref<number | undefined>,
    breakpointsRef as Ref<WaterFallBreakpoint[] | undefined>
  )

  const itemsRef = computed(() => props.items)
  const gapRef = computed(() => props.gap)
  const {
    layoutItems,
    containerHeight,
    cacheImageHeight,
    cacheItemExtraHeight,
    relayout,
  } = useWaterFallLayout(itemsRef, columns, containerWidth, gapRef, {
    batchImageLoads: true,
  })

  const observedItems = new Map<Element, string | number>()
  const elementsById = new Map<string | number, HTMLElement>()
  const {
    visibleItems,
    index: windowIndex,
    virtual,
    pinItem,
    releaseItem,
    scrollToTop,
  } = useWaterFallWindow(
    containerRef,
    layoutItems,
    computed(() => props.virtualScroll)
  )
  let observingItems = true
  const itemObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(entries => {
          if (!observingItems) return
          for (const entry of entries) {
            const id = observedItems.get(entry.target)
            const layout =
              id === undefined
                ? undefined
                : windowIndex.value.byId.get(id)?.layout
            if (layout)
              cacheItemExtraHeight(
                layout.item.id,
                entry.target.getBoundingClientRect().height - layout.height,
                layout.width,
                layout.item.src
              )
          }
        })
  function observeItem(element: unknown, id: string | number) {
    const previous = elementsById.get(id)
    if (previous === element) return
    if (previous) {
      itemObserver?.unobserve(previous)
      observedItems.delete(previous)
      elementsById.delete(id)
    }
    if (!(element instanceof HTMLElement)) return
    elementsById.set(id, element)
    observedItems.set(element, id)
    if (observingItems) itemObserver?.observe(element)
  }
  onDeactivated(() => {
    observingItems = false
    itemObserver?.disconnect()
  })
  onActivated(() => {
    observingItems = true
    elementsById.forEach(element => itemObserver?.observe(element))
  })
  onUnmounted(() => {
    observingItems = false
    itemObserver?.disconnect()
    observedItems.clear()
    elementsById.clear()
  })

  const showSkeleton = computed(
    () => props.skeleton && props.loading && layoutItems.value.length === 0
  )

  const skeletonItems = computed(() => {
    const cols = Math.min(24, Math.max(1, Math.floor(columns.value)))
    const width = containerWidth.value
    const g = Math.max(0, props.gap)
    if (!Number.isFinite(cols) || width <= 0) return []

    const colWidth = (width - (cols - 1) * g) / cols
    if (colWidth <= 0) return []
    const count = Math.min(
      100,
      Math.max(0, Math.floor(props.skeletonCount ?? DEFAULT_SKELETON_COUNT))
    )
    const colHeights = Array(cols).fill(0)
    const result: { x: number; y: number; width: number; height: number }[] = []

    for (let i = 0; i < count; i++) {
      const minIdx = colHeights.indexOf(Math.min(...colHeights))
      const h =
        SKELETON_HEIGHT_RANGE[0] +
        ((i * 73) % (SKELETON_HEIGHT_RANGE[1] - SKELETON_HEIGHT_RANGE[0]))
      result.push({
        x: minIdx * (colWidth + g),
        y: colHeights[minIdx],
        width: colWidth,
        height: h,
      })
      colHeights[minIdx] += h + g
    }
    return result
  })

  const skeletonHeight = computed(() => {
    if (skeletonItems.value.length === 0) return 0
    return Math.max(...skeletonItems.value.map(s => s.y + s.height))
  })

  const bodyHeight = computed(() =>
    showSkeleton.value ? skeletonHeight.value : containerHeight.value
  )

  const infiniteEnabled = computed(() => props.infinite)
  const loadingRef = computed(() => props.loading)
  const noMoreRef = computed(() => props.noMore)

  const {
    status: scrollStatus,
    paused: loadMorePaused,
    resume: resumeLoadMore,
  } = useInfiniteScroll(
    sentinelRef,
    infiniteEnabled,
    loadingRef,
    noMoreRef,
    () => emit('load-more')
  )

  function handleImageLoaded(lay: WaterFallLayoutItem, event: Event) {
    const img = event.target as HTMLImageElement
    // The old image may finish after its item received a new source.
    if (img.getAttribute('src') !== lay.item.src) return
    if (img.naturalHeight && img.naturalWidth) {
      const realHeight = (img.naturalHeight / img.naturalWidth) * lay.width
      cacheImageHeight(lay.item.id, realHeight, lay.width, lay.item.src)
    }
    emit('image-loaded', lay.item)
  }

  function handleImageError(lay: WaterFallLayoutItem) {
    emit('image-error', lay.item)
  }

  function isVisibleControl(child: HTMLElement, item: HTMLElement) {
    if (child.tabIndex < 0 || child.matches(':disabled, input[type="hidden"]'))
      return false
    for (
      let current: HTMLElement | null = child;
      current && current !== item.parentElement;
      current = current.parentElement
    ) {
      if (current.hidden || current.hasAttribute('inert')) return false
      const { display, visibility } = getComputedStyle(current)
      if (
        display === 'none' ||
        visibility === 'hidden' ||
        visibility === 'collapse'
      )
        return false
    }
    return true
  }

  function focusableChildren(element: HTMLElement) {
    return Array.from(
      element.querySelectorAll<HTMLElement>(
        'a[href],button,input,select,textarea,[tabindex],[contenteditable="true"]'
      )
    ).filter(child => isVisibleControl(child, element))
  }

  function focusItem(index: number, lastChild = false) {
    const entry = windowIndex.value.entries[index]
    if (!entry) return
    pinItem(entry.layout.item.id)
    void nextTick(() => {
      const element = elementsById.get(entry.layout.item.id)
      if (!element || !observingItems) return
      const children = lastChild ? focusableChildren(element) : []
      const target = children[children.length - 1] ?? element
      target.focus({ preventScroll: true })
      target.scrollIntoView?.({ block: 'nearest' })
    })
  }

  function handleTab(event: KeyboardEvent, index: number) {
    if (!virtual.value) return
    const element = event.currentTarget as HTMLElement
    const children = focusableChildren(element)
    if (
      event.shiftKey
        ? event.target !== element
        : children.length > 0 && event.target !== children[children.length - 1]
    )
      return
    const target = index + (event.shiftKey ? -1 : 1)
    if (!windowIndex.value.entries[target]) return
    event.preventDefault()
    focusItem(target, event.shiftKey)
  }

  function handleItemKeydown(
    event: KeyboardEvent,
    layout: WaterFallLayoutItem,
    index: number
  ) {
    if (event.key === 'Tab') return handleTab(event, index)
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      emit('item-click', layout.item, index)
      return
    }
    const destinations: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: props.items.length - 1,
    }
    const destination = destinations[event.key]
    if (destination === undefined || !windowIndex.value.entries[destination])
      return
    event.preventDefault()
    focusItem(destination)
  }

  defineExpose<WaterFallExpose>({
    relayout,
    scrollToTop,
    getColumns: () => columns.value,
    getContainerHeight: () => containerHeight.value,
  })
</script>

<style scoped lang="scss">
  .c-waterfall {
    width: 100%;
  }

  .waterfall__body {
    overflow: hidden;
  }

  .waterfall__item {
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--primary-color, #2080f0);
      outline-offset: 2px;
    }
  }

  .waterfall__card {
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--card-color);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
    transition:
      box-shadow 0.2s ease,
      transform 0.2s ease;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }
  }

  .waterfall__image {
    display: block;
    width: 100%;
    object-fit: cover;
    background: var(--body-color);
  }

  .waterfall__title {
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-color-1);
    word-break: break-all;
  }

  .waterfall__skeleton {
    overflow: hidden;
    border-radius: 8px;
  }

  .waterfall__skeleton-inner {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    background: linear-gradient(
      90deg,
      var(--body-color) 25%,
      color-mix(in srgb, var(--body-color) 80%, var(--border-color)) 37%,
      var(--body-color) 63%
    );
    background-size: 400% 100%;
    animation: shimmer 1.4s ease infinite;
  }

  @keyframes shimmer {
    0% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0 50%;
    }
  }

  .waterfall__footer {
    padding: 24px 0;
    text-align: center;
  }

  .waterfall__sentinel {
    height: 1px;
  }

  .waterfall__status {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
    color: var(--text-color-3);

    &--done {
      color: var(--text-color-4);
    }
  }
</style>
