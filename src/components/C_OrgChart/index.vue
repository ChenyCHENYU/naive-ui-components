<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_OrgChart 组织架构图组件
 * 纯 CSS + Vue 实现的树形组织架构图，支持缩放/平移/折叠
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <div
    ref="containerRef"
    class="c-orgchart"
    :class="[
      `c-orgchart--${props.direction}`,
      `c-orgchart--line-${props.lineStyle}`,
    ]"
    :style="cssVars"
    @wheel="handleWheel"
    @mousedown="handlePanStart"
    @mousemove="handlePanMove"
    @mouseup="handlePanEnd"
    @mouseleave="handlePanEnd"
  >
    <div
      ref="viewportRef"
      class="c-orgchart__viewport"
      :style="viewportStyle"
    >
      <OrgNode
        :node="props.data"
        :collapsible="props.collapsible"
        @node-click="handleNodeClick"
        @node-expand="handleNodeExpand"
        @node-collapse="handleNodeCollapse"
      >
        <template
          v-if="$slots.node"
          #node="slotProps"
        >
          <slot
            name="node"
            v-bind="slotProps"
          />
        </template>
      </OrgNode>
    </div>

    <!-- 缩放控制 -->
    <div
      v-if="props.zoomable"
      class="c-orgchart__controls"
    >
      <button
        type="button"
        class="c-orgchart__control-btn"
        title="放大"
        @click="zoomIn"
      >
        +
      </button>
      <span class="c-orgchart__zoom-level">{{ zoomPercent }}%</span>
      <button
        type="button"
        class="c-orgchart__control-btn"
        title="缩小"
        @click="zoomOut"
      >
        −
      </button>
      <button
        type="button"
        class="c-orgchart__control-btn"
        title="重置"
        @click="resetView"
      >
        ⟳
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    nextTick,
    onMounted,
    onBeforeUnmount,
    watch,
  } from 'vue'
  import OrgNode from './OrgNode.vue'
  import type { OrgChartProps, OrgChartNode } from './types'

  defineOptions({ name: 'C_OrgChart' })

  const props = withDefaults(defineProps<OrgChartProps>(), {
    direction: 'vertical',
    lineStyle: 'rounded',
    lineColor: '#d1d5db',
    lineWidth: 2,
    nodeSpacing: 24,
    levelSpacing: 48,
    zoomable: true,
    pannable: true,
    initialZoom: 1,
    fitOnInit: false,
    minZoom: 0.3,
    maxZoom: 2,
    collapsible: true,
  })

  const emit = defineEmits<{
    'node-click': [node: OrgChartNode]
    'node-expand': [node: OrgChartNode]
    'node-collapse': [node: OrgChartNode]
  }>()

  const containerRef = ref<HTMLElement | null>(null)
  const viewportRef = ref<HTMLElement | null>(null)
  const fitting = ref(false)
  let observer: ResizeObserver | undefined
  let disposed = false

  // ─── 缩放 & 平移 ───
  const zoom = ref(props.initialZoom)
  const panX = ref(0)
  const panY = ref(0)
  const isPanning = ref(false)
  const panStartX = ref(0)
  const panStartY = ref(0)

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  const cssVars = computed(() => ({
    '--c-orgchart-line-color': props.lineColor,
    '--c-orgchart-line-width': `${props.lineWidth}px`,
    '--c-orgchart-node-spacing': `${props.nodeSpacing}px`,
    '--c-orgchart-level-spacing': `${props.levelSpacing}px`,
  }))

  const viewportStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: 'center top',
    transition: fitting.value ? 'none' : undefined,
  }))

  /**
   * * @description: 鼠标滚轮缩放
   */
  const handleWheel = (e: WheelEvent) => {
    if (!props.zoomable) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newZoom = Math.max(
      props.minZoom,
      Math.min(props.maxZoom, zoom.value + delta)
    )
    zoom.value = Math.round(newZoom * 100) / 100
  }

  const handlePanStart = (e: MouseEvent) => {
    if (!props.pannable || e.button !== 0) return
    if (
      (e.target as HTMLElement).closest(
        '.c-orgchart__node, .c-orgchart__controls'
      )
    )
      return
    isPanning.value = true
    panStartX.value = e.clientX - panX.value
    panStartY.value = e.clientY - panY.value
  }

  const handlePanMove = (e: MouseEvent) => {
    if (!isPanning.value) return
    panX.value = e.clientX - panStartX.value
    panY.value = e.clientY - panStartY.value
  }

  const handlePanEnd = () => {
    isPanning.value = false
  }

  const zoomIn = () => {
    zoom.value = Math.min(props.maxZoom, zoom.value + 0.1)
  }

  const zoomOut = () => {
    zoom.value = Math.max(props.minZoom, zoom.value - 0.1)
  }

  const resetView = () => {
    zoom.value = Math.max(
      props.minZoom,
      Math.min(props.maxZoom, props.initialZoom)
    )
    panX.value = 0
    panY.value = 0
  }

  /** 按真实内容尺寸适配视野，不以固定缩放值猜测节点范围。 */
  const fitView = async () => {
    await nextTick()
    const container = containerRef.value
    const content = viewportRef.value?.firstElementChild as
      HTMLElement | undefined
    if (disposed || !container || !content || !container.clientWidth) return
    fitting.value = true
    zoom.value = Math.max(
      props.minZoom,
      Math.min(
        props.maxZoom,
        1,
        (container.clientWidth - 48) / Math.max(content.scrollWidth, 1),
        (container.clientHeight - 64) / Math.max(content.scrollHeight, 1)
      )
    )
    panX.value = 0
    panY.value = 0
    await nextTick()
    if (disposed) return
    const outer = container.getBoundingClientRect()
    const inner = content.getBoundingClientRect()
    panX.value = outer.left + outer.width / 2 - inner.left - inner.width / 2
    panY.value = outer.top + 24 - inner.top
    await nextTick()
    fitting.value = false
  }
  onMounted(() => {
    if (props.fitOnInit) void fitView()
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        if (props.fitOnInit) void fitView()
      })
      if (containerRef.value) observer.observe(containerRef.value)
    }
  })
  watch([() => props.data, () => props.direction], () => {
    if (props.fitOnInit) void fitView()
  })
  onBeforeUnmount(() => {
    disposed = true
    observer?.disconnect()
  })

  // ─── 事件桥接 ───
  const handleNodeClick = (node: OrgChartNode) => emit('node-click', node)
  const handleNodeExpand = (node: OrgChartNode) => emit('node-expand', node)
  const handleNodeCollapse = (node: OrgChartNode) => emit('node-collapse', node)

  defineExpose({
    zoomIn,
    zoomOut,
    resetView,
    fitView,
    zoom,
  })
</script>

<style lang="scss">
  @use './index.scss';
</style>
