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
      class="c-orgchart__viewport"
      :style="viewportStyle"
    >
      <div
        ref="contentRef"
        class="c-orgchart__content"
      >
        <svg
          class="c-orgchart__connectors"
          aria-hidden="true"
        >
          <path
            v-for="connector in connectors"
            :key="connector.key"
            :d="connector.path"
          />
        </svg>
        <OrgNode
          v-if="index.root"
          :key="index.root.key"
          :entry="index.root"
          :collapsible="props.collapsible"
          :selected-key="selectedKey"
          :expanded-keys="expandedKeys"
          @select="handleNodeClick"
          @toggle="toggle"
          @register="register"
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
    </div>
    <div
      v-if="props.zoomable"
      class="c-orgchart__controls"
    >
      <button
        type="button"
        class="c-orgchart__control-btn"
        :title="t('orgChart.zoomIn')"
        @click="zoomIn"
        >+</button
      >
      <span class="c-orgchart__zoom-level">{{ Math.round(zoom * 100) }}%</span>
      <button
        type="button"
        class="c-orgchart__control-btn"
        :title="t('orgChart.zoomOut')"
        @click="zoomOut"
        >−</button
      >
      <button
        type="button"
        class="c-orgchart__control-btn"
        :title="t('orgChart.reset')"
        @click="resetView"
        >⟳</button
      >
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends object = OrgChartNode">
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { computed, nextTick, onBeforeUnmount } from 'vue'
  import { useThemeVars } from 'naive-ui'
  import { useComponentLocale } from '../../component-config'
  import OrgNode from './OrgNode.vue'
  import { useOrgChartState } from './useOrgChartState'
  import { useOrgChartViewport } from './useOrgChartViewport'
  import type { OrgChartEntry } from './tree'
  import type {
    OrgChartEmits,
    OrgChartExpose,
    OrgChartKey,
    OrgChartNode,
    OrgChartProps,
    OrgChartSlots,
  } from './types'

  defineOptions({ name: 'C_OrgChart' })
  const props = withDefaults(defineProps<OrgChartProps<T>>(), {
    direction: 'vertical',
    lineStyle: 'rounded',
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
  const emit = defineEmits<OrgChartEmits<T>>()
  defineSlots<OrgChartSlots<T>>()
  const { t } = useComponentLocale()
  const componentTheme = useComponentTheme()
  const theme = useThemeVars()
  const cssVars = computed(() => ({
    ...componentTheme.value,
    '--c-orgchart-line-color': props.lineColor,
    '--c-orgchart-line-width': `${Math.max(0, props.lineWidth)}px`,
    '--c-orgchart-node-spacing': `${Math.max(0, props.nodeSpacing)}px`,
    '--c-orgchart-level-spacing': `${Math.max(0, props.levelSpacing)}px`,
    '--c-orgchart-theme-card': theme.value.cardColor,
    '--c-orgchart-theme-border': theme.value.borderColor,
    '--c-orgchart-theme-text': theme.value.textColor1,
    '--c-orgchart-theme-text-secondary': theme.value.textColor2,
    '--c-orgchart-theme-text-tertiary': theme.value.textColor3,
    '--c-orgchart-theme-primary': theme.value.primaryColor,
    '--c-orgchart-theme-font-family': theme.value.fontFamily,
  }))
  const {
    index,
    selectedKey,
    expandedKeys,
    select,
    toggle,
    expandAncestors,
    getNode,
  } = useOrgChartState(props, {
    select: (key, node) => emit('update:selectedKey', key, node),
    expand: (keys, node) => emit('update:expandedKeys', keys, node),
    toggle: (expanded, node) => {
      if (expanded) emit('node-expand', node)
      else emit('node-collapse', node)
    },
  })
  const {
    containerRef,
    contentRef,
    zoom,
    connectors,
    viewportStyle,
    register,
    zoomIn,
    zoomOut,
    resetView,
    fitView,
    centerNode,
    interruptView,
    isCurrentView,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
  } = useOrgChartViewport(props, index, expandedKeys)
  const handleNodeClick = (entry: OrgChartEntry<T>) => {
    select(entry)
    emit('node-click', entry.node)
  }
  let locateOperation = 0
  let disposed = false
  const locate = async (key: OrgChartKey) => {
    const operation = ++locateOperation
    const snapshot = index.value
    const entry = index.value.nodes.get(key)
    if (!entry || disposed) return false
    const view = interruptView()
    expandAncestors(entry)
    select(entry, true)
    await nextTick()
    if (
      disposed ||
      operation !== locateOperation ||
      index.value !== snapshot ||
      !isCurrentView(view)
    )
      return false
    return centerNode(key, view)
  }
  onBeforeUnmount(() => {
    disposed = true
    locateOperation++
  })
  const methods: Omit<OrgChartExpose<T>, 'zoom'> = {
    zoomIn,
    zoomOut,
    resetView,
    fitView,
    getNode,
    locate,
  }
  defineExpose({ ...methods, zoom })
</script>

<style lang="scss">
  @use './index.scss';
</style>
