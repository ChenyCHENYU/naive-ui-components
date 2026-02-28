<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: 单条消息
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div
    class="notification-item"
    :class="{
      'notification-item--unread': message.status === 'unread',
      'notification-item--urgent': message.priority === 'urgent',
    }"
    @click="$emit('click', message)"
  >
    <!-- 未读指示点 -->
    <div class="notification-item__indicator">
      <span
        v-if="message.status === 'unread'"
        class="notification-item__dot"
        :class="`notification-item__dot--${message.priority}`"
      />
    </div>

    <!-- 头像 -->
    <div class="notification-item__avatar">
      <NAvatar
        v-if="message.sender?.avatar"
        :src="message.sender.avatar"
        :size="36"
        round
      />
      <div
        v-else
        class="notification-item__avatar-placeholder"
        :class="`notification-item__avatar-placeholder--${message.category}`"
      >
        <C_Icon :name="categoryIcon" :size="16" />
      </div>
    </div>

    <!-- 内容 -->
    <div class="notification-item__body">
      <div class="notification-item__header">
        <span class="notification-item__title">{{ message.title }}</span>
        <NTag
          v-if="message.priority === 'urgent' || message.priority === 'high'"
          :type="priorityConfig.type"
          size="tiny"
          :bordered="false"
          round
        >
          {{ priorityConfig.label }}
        </NTag>
      </div>
      <div class="notification-item__summary">
        {{ message.summary }}
      </div>
      <div class="notification-item__meta">
        <span class="notification-item__time">{{ formattedTime }}</span>
        <span v-if="message.sender?.name" class="notification-item__sender">
          {{ message.sender.name }}
        </span>
      </div>
    </div>

    <!-- 操作区 -->
    <div class="notification-item__actions" @click.stop>
      <NTooltip
        v-if="message.status === 'unread'"
        trigger="hover"
        placement="top"
      >
        <template #trigger>
          <span
            class="notification-item__action"
            @click="$emit('read', message.id)"
          >
            <C_Icon name="mdi:check" :size="16" />
          </span>
        </template>
        标记已读
      </NTooltip>
      <NTooltip trigger="hover" placement="top">
        <template #trigger>
          <span
            class="notification-item__action"
            @click="$emit('delete', message.id)"
          >
            <C_Icon name="mdi:delete-outline" :size="16" />
          </span>
        </template>
        删除
      </NTooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import C_Icon from "../../C_Icon/index.vue";
import type { NotificationMessage } from "../types";
import { CATEGORY_MAP, PRIORITY_MAP } from "../constants";
import { useNotificationFormat } from "../composables/useNotificationFormat";

interface Props {
  /** 消息数据 */
  message: NotificationMessage;
}

const props = defineProps<Props>();

defineEmits<{
  click: [message: NotificationMessage];
  read: [id: string];
  delete: [id: string];
}>();

const { formatRelativeTime } = useNotificationFormat();

/** 分类图标 */
const categoryIcon = computed(
  () => CATEGORY_MAP[props.message.category]?.icon ?? "mdi:bell-outline",
);

/** 优先级配置 */
const priorityConfig = computed(
  () => PRIORITY_MAP[props.message.priority] ?? PRIORITY_MAP.normal,
);

/** 格式化时间 */
const formattedTime = computed(() =>
  formatRelativeTime(props.message.timestamp),
);
</script>

<style scoped lang="scss">
.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color var(--c-transition, 0.2s ease);
  border-bottom: 1px solid var(--c-border);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--c-bg-card);

    .notification-item__actions {
      opacity: 1;
    }
  }

  &--unread {
    background-color: color-mix(in srgb, var(--c-primary) 4%, transparent);

    &:hover {
      background-color: color-mix(in srgb, var(--c-primary) 8%, transparent);
    }
  }

  &--urgent {
    border-left: 3px solid #f5222d;
    padding-left: 13px;
  }

  /* ─── 子元素 ──────────────────────────── */

  &__indicator {
    flex-shrink: 0;
    width: 8px;
    display: flex;
    align-items: center;
    padding-top: 14px;
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--c-primary);

    &--urgent {
      background: #f5222d;
      box-shadow: 0 0 4px rgba(245, 34, 45, 0.5);
    }

    &--high {
      background: #fa8c16;
    }

    &--normal {
      background: var(--c-primary);
    }

    &--low {
      background: var(--c-text-4);
    }
  }

  &__avatar {
    flex-shrink: 0;
  }

  &__avatar-placeholder {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #fff;

    &--system {
      background: linear-gradient(135deg, #667eea, #764ba2);
    }

    &--business {
      background: linear-gradient(135deg, #43e97b, #38f9d7);
      color: #0d1425;
    }

    &--alarm {
      background: linear-gradient(135deg, #f093fb, #f5576c);
    }
  }

  &__body {
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  &__title {
    font-size: 13px;
    font-weight: 500;
    color: var(--c-text-1);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__summary {
    font-size: 12px;
    color: var(--c-text-2);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }

  &__time,
  &__sender {
    font-size: 11px;
    color: var(--c-text-4);
  }

  &__sender::before {
    content: "·";
    margin-right: 8px;
  }

  &__actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--c-transition, 0.2s ease);
  }

  &__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 2px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--c-text-4);
    transition: all var(--c-transition, 0.2s ease);

    &:hover {
      color: var(--c-primary);
      background-color: var(--c-border);
    }
  }
}
</style>
