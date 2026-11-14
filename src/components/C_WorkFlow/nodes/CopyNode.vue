<!--
 * @Description: 抄送节点组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="copy-node">
    <WorkflowPorts />
    <div
      class="status-indicator"
      :class="data.status"
    ></div>

    <!-- 删除按钮 -->
    <button
      type="button"
      v-if="!readonly"
      class="delete-btn nodrag nopan"
      @click="handleDelete"
      title="删除节点"
    >
      <C_Icon
        name="mdi:close"
        :size="12"
      />
    </button>

    <WorkflowNodeBody :node-id="id">
      <div class="node-card">
        <div class="node-header">
          <div class="node-icon"
            ><C_Icon
              name="mdi:email-outline"
              :size="14"
          /></div>
          <span class="node-title">{{ data.title }}</span>
          <div
            class="node-badge"
            v-if="copyCount > 0"
            >{{ copyCount }}</div
          >
        </div>

        <div class="node-content">
          <div
            v-if="copyCount > 0"
            class="copy-users-list"
          >
            <div
              v-for="user in displayCopyUsers"
              :key="user.id"
              class="copy-user-tag"
            >
              {{ user.name }}
            </div>
            <div
              v-if="moreCount > 0"
              class="more-count"
              >+{{ moreCount }}</div
            >
          </div>
          <div
            v-else
            class="placeholder"
            >请设置抄送人</div
          >
        </div>
      </div>
    </WorkflowNodeBody>

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
  import { computed, inject } from 'vue'
  import { C_Icon } from '../../C_Icon'

  interface User {
    id: string
    name: string
    department: string
    role: string
  }

  interface Props {
    id: string
    data: {
      title: string
      copyUsers?: User[]
      status?: string
    }
  }

  const props = defineProps<Props>()

  const showAddMenuFn = inject('showAddMenu') as
    ((position: { x: number; y: number }, nodeId?: string) => void) | undefined

  const deleteNodeFn = inject('deleteNode') as
    ((nodeId: string) => void) | undefined

  /* 统一使用安全的访问方式 */
  const copyUsers = computed(() => props.data.copyUsers ?? [])
  const copyCount = computed(() => copyUsers.value.length)
  const displayCopyUsers = computed(() => copyUsers.value.slice(0, 3))
  const moreCount = computed(() => Math.max(0, copyCount.value - 3))

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

  const handleDelete = (event: MouseEvent) => {
    event.stopPropagation()
    if (deleteNodeFn) {
      deleteNodeFn(props.id)
    }
  }
</script>

<style scoped lang="scss">
  .copy-node {
    --workflow-node-accent: var(--c-success, var(--c-theme-success, #18a058));
    position: relative;
  }

  .status-indicator {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--workflow-surface, #fff);
    z-index: 2;
    background: var(--c-warning, var(--c-theme-warning, #f0a020));

    &.completed {
      background: var(--workflow-node-accent);
    }
    &.active {
      background: #1890ff;
    }
  }

  .delete-btn {
    appearance: none;
    padding: 0;
    position: absolute;
    top: -10px;
    right: -10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: color-mix(
      in srgb,
      var(--c-error, var(--c-theme-error, #d03050)) 14%,
      var(--workflow-surface, #fff)
    );
    color: var(--c-error, var(--c-theme-error, #d03050));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 100;
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.2s ease;
    border: 2px solid var(--workflow-surface, #fff);
    box-shadow: 0 2px 8px rgba(255, 77, 79, 0.3);

    &:hover {
      transform: scale(1);
      background: color-mix(
        in srgb,
        var(--c-error, var(--c-theme-error, #d03050)) 22%,
        var(--workflow-surface, #fff)
      );
      box-shadow: 0 4px 12px rgba(255, 77, 79, 0.5);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .copy-node:hover .delete-btn,
  .copy-node:focus-within .delete-btn {
    opacity: 1;
    transform: scale(1);
  }

  .node-card {
    background: var(--workflow-surface, white);
    border-radius: 12px;
    min-width: 200px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 2px solid transparent;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      border-color: var(--workflow-node-accent);
    }
  }

  .node-header {
    padding: 12px 16px;
    background: color-mix(
      in srgb,
      var(--workflow-surface, white) 90%,
      var(--workflow-node-accent)
    );
    border-bottom: 1px solid
      color-mix(
        in srgb,
        var(--workflow-node-accent) 28%,
        var(--workflow-border, #dfe5ed)
      );
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .node-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: color-mix(
      in srgb,
      var(--workflow-node-accent) 18%,
      var(--workflow-surface, #fff)
    );
    color: var(--workflow-node-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .node-title {
    font-weight: 600;
    color: var(--workflow-text, #262626);
    font-size: 14px;
    flex: 1;
  }

  .node-badge {
    background: color-mix(
      in srgb,
      var(--workflow-node-accent) 18%,
      var(--workflow-surface, #fff)
    );
    color: var(--workflow-text, #262626);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    min-width: 16px;
    text-align: center;
  }

  .node-content {
    padding: 16px;
  }

  .copy-users-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .copy-user-tag {
    display: flex;
    align-items: center;
    gap: 6px;
    background: color-mix(
      in srgb,
      var(--workflow-surface, white) 90%,
      var(--workflow-node-accent)
    );
    color: var(--workflow-node-accent);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    border: 1px solid
      color-mix(
        in srgb,
        var(--workflow-node-accent) 28%,
        var(--workflow-border, #dfe5ed)
      );
  }

  .more-count {
    background: var(--workflow-background, #f0f0f0);
    color: var(--workflow-muted, #738094);
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .placeholder {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--workflow-muted, #738094);
    font-size: 12px;
    padding: 8px 0;
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
      var(--workflow-node-accent) 14%,
      var(--workflow-surface, #fff)
    );
    color: var(--workflow-node-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px
      color-mix(in srgb, var(--workflow-node-accent) 30%, transparent);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-size: 16px;
    font-weight: bold;
    z-index: 10;

    &:hover {
      transform: translateX(-50%) scale(1.1);
      box-shadow: 0 6px 20px
        color-mix(in srgb, var(--workflow-node-accent) 40%, transparent);
    }
    &:focus-visible {
      outline: 2px solid var(--workflow-node-accent);
      outline-offset: 2px;
    }
  }

  .delete-btn:focus-visible {
    opacity: 1;
    outline: 2px solid var(--workflow-node-accent);
    outline-offset: 2px;
  }
</style>
