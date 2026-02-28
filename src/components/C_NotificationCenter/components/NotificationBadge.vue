<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: 通知角标
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div class="notification-badge">
    <NTooltip trigger="hover" placement="bottom">
      <template #trigger>
        <div class="notification-badge__trigger" @click="$emit('click')">
          <C_Icon
            name="mdi:bell-outline"
            :size="18"
            class="notification-badge__icon"
          />
          <!-- 未读角标 -->
          <Transition name="badge-bounce">
            <span v-if="count > 0" class="notification-badge__count">
              {{ displayCount }}
            </span>
          </Transition>
          <!-- 脉冲动画（有紧急消息时） -->
          <span v-if="hasUrgent" class="notification-badge__pulse" />
        </div>
      </template>
      消息通知{{ count > 0 ? `（${count} 条未读）` : "" }}
    </NTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import C_Icon from "../../C_Icon/index.vue";
import { DEFAULT_MAX_BADGE_COUNT } from "../constants";

interface Props {
  /** 未读数量 */
  count?: number;
  /** 最大显示数 */
  maxCount?: number;
  /** 是否有紧急消息 */
  hasUrgent?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  maxCount: DEFAULT_MAX_BADGE_COUNT,
  hasUrgent: false,
});

defineEmits<{
  click: [];
}>();

/** 显示文本 */
const displayCount = computed(() =>
  props.count > props.maxCount ? `${props.maxCount}+` : String(props.count),
);
</script>

<style scoped lang="scss">
.notification-badge {
  position: relative;
  display: inline-flex;
  align-items: center;

  &__trigger {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: all var(--c-transition, 0.2s ease);

    &:hover {
      background-color: var(--c-border);

      .notification-badge__icon {
        color: var(--c-primary);
      }
    }
  }

  &__icon {
    color: var(--c-text-2);
    transition: color var(--c-transition, 0.2s ease);
  }

  &__count {
    position: absolute;
    top: -2px;
    right: -4px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 8px;
    background: #f5222d;
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
    text-align: center;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 0 0 2px var(--c-bg);
  }

  &__pulse {
    position: absolute;
    top: -2px;
    right: -4px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(245, 34, 45, 0.4);
    animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    pointer-events: none;
  }
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }

  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.badge-bounce-enter-active {
  animation: badge-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.badge-bounce-leave-active {
  animation: badge-in 0.2s ease reverse;
}

@keyframes badge-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
