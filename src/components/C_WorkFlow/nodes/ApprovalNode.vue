<!--
 * @Description: 审批节点组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="approval-node">
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
          <div class="node-icon">
            <C_Icon
              name="mdi:account-check-outline"
              :size="12"
            />
          </div>
          <span class="node-title">{{ data.title }}</span>
          <div
            class="node-badge"
            v-if="approverCount > 0"
          >
            {{ approverCount }}
          </div>
          <div
            class="approval-mode-badge"
            v-if="data.approvalMode"
          >
            {{ getApprovalModeText(data.approvalMode) }}
          </div>
        </div>

        <div class="node-content">
          <div
            v-if="approverCount > 0"
            class="approvers-list"
          >
            <div
              v-for="approver in displayApprovers"
              :key="approver.id"
              class="approver-tag"
            >
              <div class="approver-info">
                <div class="approver-avatar">
                  <NAvatar
                    :src="approver.avatar || getDefaultAvatar(approver.name)"
                    :fallback-src="getDefaultAvatar(approver.name)"
                    size="small"
                  />
                </div>
                <div class="approver-details">
                  <span class="approver-name">{{ approver.name }}</span>
                  <span class="approver-dept">{{ approver.department }}</span>
                  <span class="approver-role">{{ approver.role }}</span>
                </div>
              </div>
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
          >
            <C_Icon
              name="mdi:account-plus"
              :size="24"
              color="#9ca3af"
            />
            <span>请设置审批人</span>
          </div>
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
  import { NAvatar } from 'naive-ui'
  import { C_Icon } from '../../C_Icon'
  import { getDefaultAvatar } from '../data'

  /* 定义审批人类型 */
  interface Approver {
    id: string
    name: string
    avatar?: string
    department: string
    role: string
    email?: string
    phone?: string
  }

  interface Props {
    id: string
    data: {
      title: string
      approvers?: Approver[]
      approvalMode?: 'any' | 'all' | 'sequence'
      status?: string
    }
  }

  const props = defineProps<Props>()

  const showAddMenuFn = inject('showAddMenu') as
    ((position: { x: number; y: number }, nodeId?: string) => void) | undefined

  const deleteNodeFn = inject('deleteNode') as
    ((nodeId: string) => void) | undefined

  /* 使用安全的访问方式和默认值 */
  const approvers = computed(() => props.data.approvers ?? [])
  const approverCount = computed(() => approvers.value.length)
  const displayApprovers = computed(() => approvers.value.slice(0, 3))
  const moreCount = computed(() => Math.max(0, approverCount.value - 3))

  const getApprovalModeText = (mode?: string) => {
    const modeMap = {
      any: '或签',
      all: '会签',
      sequence: '顺序',
    }
    return modeMap[mode as keyof typeof modeMap] || ''
  }

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
  .approval-node {
    --workflow-node-accent: var(--c-primary, var(--c-theme-primary, #2080f0));
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

    &.approved {
      background: var(--c-success, var(--c-theme-success, #18a058));
    }
    &.rejected {
      background: var(--c-error, var(--c-theme-error, #d03050));
    }
    &.pending {
      background: var(--workflow-node-accent);
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
    z-index: 100; /* 确保在所有元素之上 */
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

  .approval-node:hover .delete-btn,
  .approval-node:focus-within .delete-btn {
    opacity: 1;
    transform: scale(1);
  }

  .node-card {
    background: var(--workflow-surface, white);
    border-radius: 12px;
    min-width: 240px;
    max-width: 300px;
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
    flex-wrap: wrap;
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

  .approval-mode-badge {
    background: var(--workflow-background, #f0f0f0);
    color: var(--workflow-muted, #666);
    padding: 2px 6px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 500;
  }

  .node-content {
    padding: 16px;
  }

  .approvers-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .approver-tag {
    background: color-mix(
      in srgb,
      var(--workflow-surface, white) 90%,
      var(--workflow-node-accent)
    );
    border: 1px solid
      color-mix(
        in srgb,
        var(--workflow-node-accent) 28%,
        var(--workflow-border, #dfe5ed)
      );
    border-radius: 8px;
    padding: 8px 12px;
    transition: all 0.2s ease;

    &:hover {
      transform: translateX(2px);
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
    }

    .approver-info {
      display: flex;
      align-items: center;
      gap: 8px;

      .approver-avatar {
        flex-shrink: 0;
      }

      .approver-details {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;

        .approver-name {
          font-weight: 600;
          color: var(--workflow-node-accent);
          font-size: 13px;
        }

        .approver-dept {
          font-size: 11px;
          color: var(--workflow-muted, #666);
          background: rgba(0, 0, 0, 0.05);
          padding: 1px 4px;
          border-radius: 4px;
          display: inline-block;
        }

        .approver-role {
          font-size: 10px;
          color: var(--workflow-muted, #999);
        }
      }
    }
  }

  .more-count {
    background: var(--workflow-background, #f0f0f0);
    color: var(--workflow-muted, #738094);
    padding: 6px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    text-align: center;
    border: 1px dashed var(--workflow-border, #dfe5ed);
  }

  .placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--workflow-muted, #738094);
    font-size: 12px;
    padding: 20px 0;
    border: 1px dashed var(--workflow-border, #dfe5ed);
    border-radius: 8px;
    background: var(--workflow-background, #fafafa);

    span {
      font-weight: 500;
    }
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
