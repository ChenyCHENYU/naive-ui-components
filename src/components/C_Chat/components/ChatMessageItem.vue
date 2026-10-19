<template>
  <div
    class="c-chat__message-row"
    :data-message-id="msg.id"
  >
    <!-- 时间分割 -->
    <div
      v-if="showTimeDivider"
      class="c-chat__time-divider"
    >
      {{ formatMessageTime(msg.timestamp) }}
    </div>

    <!-- 消息条目 -->
    <div
      class="c-chat__msg"
      :class="`is-${msg.sender}`"
    >
      <!-- 头像 -->
      <div
        v-if="msg.sender !== 'system'"
        class="c-chat__msg-avatar"
      >
        <img
          v-if="getAvatar(msg)"
          :src="getAvatar(msg)"
          class="c-chat__avatar"
        />
        <div
          v-else
          class="c-chat__avatar-fallback"
        >
          {{ getUsername(msg).charAt(0) }}
        </div>
      </div>

      <!-- 消息体 -->
      <div class="c-chat__msg-body">
        <span
          v-if="msg.sender === 'other' && msg.username"
          class="c-chat__msg-username"
        >
          {{ msg.username }}
        </span>

        <!-- 文本消息 -->
        <div
          v-if="msg.type === 'text' || msg.type === 'system'"
          class="c-chat__bubble"
        >
          {{ msg.content }}
        </div>

        <!-- 图片消息 -->
        <button
          v-else-if="msg.type === 'image'"
          type="button"
          class="c-chat__msg-image-button"
          :aria-label="`预览${msg.username || '聊天'}的图片`"
          @click="emit('image-preview', msg.content)"
        >
          <img
            :src="msg.content"
            :alt="msg.fileName || '聊天图片'"
            class="c-chat__msg-image"
          />
        </button>

        <!-- 文件消息 -->
        <button
          v-else-if="msg.type === 'file'"
          type="button"
          class="c-chat__msg-file"
          @click="emit('file-click', msg)"
        >
          <C_Icon
            name="mdi:file-document-outline"
            :size="28"
          />
          <div class="c-chat__file-info">
            <span class="c-chat__file-name">{{ msg.fileName || '文件' }}</span>
            <span
              v-if="msg.fileSize"
              class="c-chat__file-size"
            >
              {{ formatFileSize(msg.fileSize) }}
            </span>
          </div>
        </button>

        <!-- 时间戳 -->
        <span
          v-if="showTimestamp && msg.sender !== 'system'"
          class="c-chat__msg-time"
        >
          {{ formatTime(msg.timestamp) }}
        </span>

        <!-- 发送状态 -->
        <button
          v-if="msg.sender === 'self' && msg.status === 'failed'"
          type="button"
          class="c-chat__msg-status is-failed"
          @click="emit('resend', msg)"
        >
          发送失败，点击重试
        </button>
        <span
          v-else-if="msg.sender === 'self' && msg.status === 'sending'"
          class="c-chat__msg-status is-sending"
          >发送中...</span
        >
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import C_Icon from '../../C_Icon/index.vue'
  import type { ChatMessage } from '../types'
  const props = defineProps<{
    msg: ChatMessage
    previous?: ChatMessage
    selfAvatar: string
    selfName: string
    showTimestamp: boolean
  }>()
  const emit = defineEmits<{
    'image-preview': [url: string]
    'file-click': [msg: ChatMessage]
    resend: [msg: ChatMessage]
  }>()
  const showTimeDivider = computed(
    () =>
      !props.previous ||
      new Date(props.msg.timestamp).getTime() -
        new Date(props.previous.timestamp).getTime() >
        300_000
  )
  const getAvatar = (msg: ChatMessage) =>
    msg.sender === 'self' ? props.selfAvatar || msg.avatar : msg.avatar
  const getUsername = (msg: ChatMessage) =>
    msg.sender === 'self'
      ? props.selfName || msg.username || 'Me'
      : msg.username || '未知'
  function formatTime(timestamp: string | number) {
    const date = new Date(timestamp)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
  function formatMessageTime(timestamp: string | number) {
    const date = new Date(timestamp)
    const now = new Date()
    return date.toDateString() === now.toDateString()
      ? formatTime(timestamp)
      : `${date.getMonth() + 1}/${date.getDate()} ${formatTime(timestamp)}`
  }
  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }
</script>
<style scoped lang="scss">
  @use './avatar.scss';
  /* ─── 消息气泡 ────────────────────────────────────────── */
  .c-chat__msg {
    display: flex;
    gap: 8px;
    max-width: 75%;

    &.is-self {
      margin-left: auto;
      flex-direction: row-reverse;
    }

    &.is-system {
      max-width: 100%;
      justify-content: center;
      align-self: center;
    }
  }

  .c-chat__msg-avatar {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .c-chat__msg-body {
    display: flex;
    flex-direction: column;
  }

  .c-chat__msg-username {
    font-size: 12px;
    color: var(--chat-text-secondary);
    margin-bottom: 2px;

    .is-self & {
      text-align: right;
    }
  }

  .c-chat__bubble {
    padding: 10px 14px;
    border-radius: 16px;
    line-height: 1.5;
    word-break: break-word;
    white-space: pre-wrap;

    .is-other & {
      background: var(--chat-bubble-other);
      border: 1px solid var(--chat-border);
      border-top-left-radius: 4px;
    }

    .is-self & {
      background: var(--chat-bubble-self);
      color: var(--chat-text-self);
      border-top-right-radius: 4px;
    }

    .is-system & {
      background: var(--chat-bubble-system);
      color: var(--chat-text-secondary);
      font-size: 12px;
      padding: 4px 12px;
    }
  }

  .c-chat__msg-image-button {
    display: inline-flex;
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .c-chat__msg-image {
    max-width: 240px;
    max-height: 180px;
    border-radius: 12px;
    cursor: pointer;
    object-fit: cover;

    .is-self & {
      border-top-right-radius: 4px;
    }

    .is-other & {
      border-top-left-radius: 4px;
    }
  }

  .c-chat__msg-file {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 12px;
    cursor: pointer;
    font: inherit;
    text-align: left;
    border: 0;

    .is-other & {
      background: var(--chat-bubble-other);
      border: 1px solid var(--chat-border);
      border-top-left-radius: 4px;
    }

    .is-self & {
      background: var(--chat-bubble-self);
      color: var(--chat-text-self);
      border-top-right-radius: 4px;
    }
  }

  .c-chat__file-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .c-chat__file-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .c-chat__file-size {
    font-size: 11px;
    opacity: 0.6;
  }

  .c-chat__msg-time {
    font-size: 11px;
    color: var(--chat-text-secondary);
    margin-top: 4px;

    .is-self & {
      text-align: right;
    }
  }

  .c-chat__msg-status {
    font-size: 11px;
    margin-top: 2px;
    text-align: right;

    &:is(button) {
      align-self: flex-end;
      padding: 0;
      border: 0;
      background: none;
      font-family: inherit;
    }

    &.is-sending {
      color: var(--chat-text-secondary);
    }

    &.is-failed {
      color: var(--chat-failed-color);
      cursor: pointer;
    }
  }

  /* ─── 时间分割线 ──────────────────────────────────────── */
  .c-chat__time-divider {
    text-align: center;
    font-size: 11px;
    color: var(--chat-text-secondary);
    padding: 4px 0;
  }

  .c-chat__message-row {
    flex-shrink: 0;
    padding-bottom: 12px;
  }
  .c-chat__time-divider {
    margin-bottom: 12px;
  }
  .c-chat__msg-body {
    min-width: 0;
  }
  .c-chat__msg-image {
    max-width: min(240px, 100%);
  }
</style>
