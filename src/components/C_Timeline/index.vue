<!--
 * @Description: 时间线组件 — 支持垂直/水平布局、自定义节点、可折叠详情
-->
<template>
  <div
    :class="rootClasses"
    role="list"
  >
    <div
      v-for="(item, idx) in displayItems"
      :key="item.id"
      class="c-timeline__item"
      role="listitem"
    >
      <!-- 轨道区：圆点 + 连接线 -->
      <div class="c-timeline__track">
        <span
          :class="['c-timeline__dot', item.icon ? 'is-icon' : 'is-dot']"
          :style="dotStyle(item)"
        >
          <slot
            name="dot"
            :item="item"
            :index="idx"
          >
            <C_Icon
              v-if="item.icon"
              :name="item.icon"
            />
          </slot>
        </span>
        <!-- 连接线：最后一项不渲染 -->
        <span
          v-if="idx < displayItems.length - 1"
          class="c-timeline__line"
        />
      </div>

      <!-- 内容区 -->
      <div class="c-timeline__body">
        <div
          class="c-timeline__header"
          @click="emit('item-click', item, idx)"
        >
          <slot
            name="title"
            :item="item"
            :index="idx"
          >
            <span class="c-timeline__title">{{ item.title }}</span>
          </slot>
          <span
            v-if="props.showTime && item.time"
            class="c-timeline__time"
            >{{ item.time }}</span
          >
        </div>

        <div
          v-if="item.tags?.length"
          class="c-timeline__tags"
        >
          <span
            v-for="tag in item.tags"
            :key="tag.text"
            class="c-timeline__tag"
            >{{ tag.text }}</span
          >
        </div>

        <div
          v-if="item.content && (!item.collapsible || expandedMap[item.id])"
          :class="[
            'c-timeline__detail',
            item.collapsible
              ? expandedMap[item.id]
                ? 'is-expanded'
                : 'is-collapsed'
              : 'is-expanded',
          ]"
        >
          <div
            class="c-timeline__content"
            v-html="item.content"
          />
        </div>

        <span
          v-if="item.collapsible"
          :class="[
            'c-timeline__collapse-trigger',
            { 'is-expanded': expandedMap[item.id] },
          ]"
          @click="toggleExpand(item)"
        >
          {{ expandedMap[item.id] ? '收起' : '展开详情' }}
          <C_Icon
            name="mdi:chevron-down"
            class="collapse-arrow"
          />
        </span>
      </div>
    </div>

    <!-- Pending 加载指示 -->
    <div
      v-if="props.pending"
      class="c-timeline__pending"
    >
      <span class="pending-dot" />
      <span>{{ props.pendingText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import C_Icon from '../C_Icon/index.vue'
  import {
    DEFAULT_TIMELINE_PROPS,
    STATUS_COLOR_MAP,
    type TimelineProps,
    type TimelineItem,
  } from './types'

  defineOptions({ name: 'C_Timeline' })

  const props = withDefaults(defineProps<TimelineProps>(), {
    items: () => [],
    mode: DEFAULT_TIMELINE_PROPS.mode,
    labelPlacement: DEFAULT_TIMELINE_PROPS.labelPlacement,
    pending: DEFAULT_TIMELINE_PROPS.pending,
    pendingText: DEFAULT_TIMELINE_PROPS.pendingText,
    reverse: DEFAULT_TIMELINE_PROPS.reverse,
    size: DEFAULT_TIMELINE_PROPS.size,
    lineType: DEFAULT_TIMELINE_PROPS.lineType,
    showTime: DEFAULT_TIMELINE_PROPS.showTime,
  })

  const emit = defineEmits<{
    (e: 'item-click', item: TimelineItem, index: number): void
    (e: 'expand', item: TimelineItem, expanded: boolean): void
  }>()

  // ===== 展开状态 =====
  const expandedMap = ref<Record<string | number, boolean>>({})

  // 初始化展开状态
  watch(
    () => props.items,
    items => {
      items.forEach(item => {
        if (item.collapsible && !(item.id in expandedMap.value)) {
          expandedMap.value[item.id] = item.defaultExpanded ?? false
        }
      })
    },
    { immediate: true }
  )

  const toggleExpand = (item: TimelineItem) => {
    const next = !expandedMap.value[item.id]
    expandedMap.value[item.id] = next
    emit('expand', item, next)
  }

  // ===== 排列顺序 =====
  const displayItems = computed(() =>
    props.reverse ? [...props.items].reverse() : props.items
  )

  // ===== 根类 =====
  const rootClasses = computed(() => [
    'c-timeline',
    `is-${props.mode}`,
    `is-${props.size}`,
    `is-line-${props.lineType}`,
    `is-label-${props.labelPlacement}`,
  ])

  // ===== 节点颜色 =====
  const dotStyle = (item: TimelineItem) => {
    const color =
      item.color || STATUS_COLOR_MAP[item.status || 'default'] || undefined
    if (item.icon) {
      return { color, borderColor: color || undefined }
    }
    return {
      background: color || undefined,
      boxShadow: color ? `0 0 0 2px ${color}` : undefined,
    }
  }

  // ===== 暴露 =====
  defineExpose({
    /** 展开全部 */
    expandAll: () => {
      props.items.forEach(item => {
        if (item.collapsible) expandedMap.value[item.id] = true
      })
    },
    /** 折叠全部 */
    collapseAll: () => {
      props.items.forEach(item => {
        if (item.collapsible) expandedMap.value[item.id] = false
      })
    },
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
