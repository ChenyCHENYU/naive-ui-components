<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_OrgChart 递归节点组件
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <div class="c-orgchart__node-wrapper">
    <!-- 节点卡片 -->
    <div
      class="c-orgchart__node"
      :class="[node.className, { 'c-orgchart__node--leaf': isLeaf }]"
      @click.stop="$emit('node-click', node)"
    >
      <slot
        name="node"
        :node="node"
        :is-leaf="isLeaf"
        :is-expanded="isExpanded"
      >
        <!-- 默认节点渲染 -->
        <div class="c-orgchart__node-default">
          <div
            v-if="node.avatar"
            class="c-orgchart__avatar"
          >
            <img
              :src="node.avatar"
              :alt="node.label"
            />
          </div>
          <div class="c-orgchart__info">
            <div class="c-orgchart__label">{{ node.label }}</div>
            <div
              v-if="node.subtitle"
              class="c-orgchart__subtitle"
            >
              {{ node.subtitle }}
            </div>
          </div>
        </div>
      </slot>

      <!-- 折叠/展开按钮 -->
      <button
        v-if="collapsible && !isLeaf"
        class="c-orgchart__toggle"
        @click.stop="toggleExpand"
      >
        {{ isExpanded ? '−' : '+' }}
      </button>
    </div>

    <!-- 子节点容器 -->
    <div
      v-if="hasChildren && isExpanded"
      class="c-orgchart__children"
    >
      <OrgNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :collapsible="collapsible"
        @node-click="$emit('node-click', $event)"
        @node-expand="$emit('node-expand', $event)"
        @node-collapse="$emit('node-collapse', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed } from 'vue'
  import type { OrgChartNode } from './types'

  defineOptions({ name: 'OrgNode' })

  const props = defineProps<{
    node: OrgChartNode
    collapsible?: boolean
  }>()

  defineEmits<{
    'node-click': [node: OrgChartNode]
    'node-expand': [node: OrgChartNode]
    'node-collapse': [node: OrgChartNode]
  }>()

  const isExpanded = ref(!props.node.collapsed)

  const hasChildren = computed(
    () => props.node.children && props.node.children.length > 0
  )

  const isLeaf = computed(() => !hasChildren.value)

  const toggleExpand = () => {
    isExpanded.value = !isExpanded.value
  }
</script>
