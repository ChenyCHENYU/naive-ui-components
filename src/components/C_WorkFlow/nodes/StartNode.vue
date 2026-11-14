<!--
 * @Description: 开始节点组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="start-node">
    <WorkflowPorts start />
    <WorkflowNodeBody :node-id="id">
      <!-- 主要内容区域 -->
      <div class="node-content">
        <div class="node-icon"
          ><C_Icon
            name="mdi:play-circle-outline"
            :size="24"
        /></div>
        <div class="node-info">
          <div class="node-text">{{ data.title }}</div>
          <div
            v-if="initiatorNames"
            class="initiator-name"
          >
            {{ initiatorNames }}
          </div>
          <div
            v-else
            class="placeholder-text"
            >点击设置发起人</div
          >
        </div>
      </div>
    </WorkflowNodeBody>

    <!-- 添加节点按钮 -->
    <button
      type="button"
      v-if="!readonly"
      class="add-node-btn nodrag nopan"
      @click="showAddMenu"
      title="添加下一个节点"
    >
      <C_Icon
        name="mdi:plus"
        :size="16"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
  import WorkflowPorts from './WorkflowPorts.vue'
  import { WorkflowNodeBody, useWorkflowReadonly } from './workflowPresentation'
  const readonly = useWorkflowReadonly()
  import { inject, computed } from 'vue'
  import { C_Icon } from '../../C_Icon'

  interface Initiator {
    id: string
    name: string
    department: string
    role: string
  }

  interface Props {
    id: string
    data: {
      title: string
      status?: string
      initiators?: Initiator[]
    }
  }

  const props = defineProps<Props>()

  /* 只注入需要的方法 */
  const showAddMenuFn = inject('showAddMenu') as
    ((position: { x: number; y: number }, nodeId?: string) => void) | undefined

  /* 计算发起人名称 */
  const initiatorNames = computed(() => {
    const { initiators } = props.data
    if (!initiators || !Array.isArray(initiators) || initiators.length === 0) {
      return ''
    }
    return initiators.map(user => user?.name || '未知用户').join('、')
  })

  const showAddMenu = (event: MouseEvent) => {
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()

    if (showAddMenuFn) {
      showAddMenuFn(
        {
          x: rect.left + rect.width / 2,
          y: rect.bottom + 10,
        },
        props.id
      )
    }
  }
</script>

<style scoped lang="scss">
  .start-node {
    position: relative;
  }

  .node-content {
    background: color-mix(
      in srgb,
      var(--workflow-accent, #2080f0) 14%,
      var(--workflow-surface, #fff)
    );
    color: var(--workflow-accent, #2080f0);
    padding: 16px 20px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-width: 160px;
    box-shadow: 0 4px 20px
      color-mix(in srgb, var(--workflow-accent, #2080f0) 30%, transparent);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px
        color-mix(in srgb, var(--workflow-accent, #2080f0) 40%, transparent);
    }
  }

  .node-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .node-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }

  .node-text {
    font-weight: 600;
    font-size: 14px;
  }

  .initiator-name {
    font-size: 12px;
    opacity: 0.9;
    background: color-mix(
      in srgb,
      var(--workflow-accent, #2080f0) 8%,
      var(--workflow-surface, #fff)
    );
    padding: 2px 8px;
    border-radius: 8px;
  }

  .placeholder-text {
    font-size: 11px;
    opacity: 0.7;
    font-style: italic;
  }

  .add-node-btn {
    appearance: none;
    border: 0;
    padding: 0;
    position: absolute;
    left: 50%;
    bottom: -20px;
    transform: translateX(-50%);
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(
      in srgb,
      var(--workflow-accent, #2080f0) 14%,
      var(--workflow-surface, #fff)
    );
    color: var(--workflow-accent, #2080f0);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px
      color-mix(in srgb, var(--workflow-accent, #2080f0) 30%, transparent);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 16px;
    font-weight: bold;
    z-index: 10;

    &:hover {
      transform: translateX(-50%) scale(1.1);
      box-shadow: 0 6px 20px
        color-mix(in srgb, var(--workflow-accent, #2080f0) 40%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--workflow-accent, #2080f0);
      outline-offset: 2px;
    }
  }
</style>
