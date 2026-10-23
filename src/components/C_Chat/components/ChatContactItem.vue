<template>
  <button
    type="button"
    class="c-chat__contact"
    :class="{ 'is-active': active }"
    :data-contact-id="contact.id"
    @click="emit('select', contact.id)"
  >
    <div class="c-chat__contact-avatar">
      <img
        v-if="contact.avatar"
        :src="contact.avatar"
        :alt="contact.name"
        class="c-chat__avatar"
      />
      <div
        v-else
        class="c-chat__avatar-fallback"
      >
        {{ contact.name.charAt(0) }}
      </div>
      <span
        v-if="contact.online"
        class="c-chat__online-dot"
      />
    </div>

    <div class="c-chat__contact-info">
      <div class="c-chat__contact-name">
        <span>{{ contact.name }}</span>
        <span
          v-if="contact.lastTime"
          class="c-chat__contact-time"
        >
          {{ formatContactTime(contact.lastTime) }}
        </span>
      </div>
      <div
        v-if="contact.lastMessage"
        class="c-chat__contact-last"
      >
        {{ contact.lastMessage }}
      </div>
    </div>

    <span
      v-if="contact.unread"
      class="c-chat__unread"
    >
      {{ contact.unread > 99 ? '99+' : contact.unread }}
    </span>
  </button>
</template>
<script setup lang="ts">
  import { useComponentLocale } from '../../../config'
  import type { ChatContact } from '../types'
  const { t } = useComponentLocale()
  defineProps<{ contact: ChatContact; active: boolean }>()
  const emit = defineEmits<{ select: [id: string] }>()
  function formatContactTime(timestamp: string | number) {
    const date = new Date(timestamp)
    const diff = Date.now() - date.getTime()
    if (diff < 60_000) return t('time.now')
    if (diff < 3_600_000)
      return t('time.minutes', { count: Math.floor(diff / 60_000) })
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    return diff < 86_400_000
      ? time
      : `${date.getMonth() + 1}/${date.getDate()} ${time}`
  }
</script>
<style scoped lang="scss">
  @use './avatar.scss';
  .c-chat__contact {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover {
      background: color-mix(
        in srgb,
        var(--c-primary, var(--primary-color, #2080f0)) 6%,
        transparent
      );
    }

    &.is-active {
      background: color-mix(
        in srgb,
        var(--c-primary, var(--primary-color, #2080f0)) 12%,
        transparent
      );
    }
  }

  .c-chat__contact-avatar {
    position: relative;
    flex-shrink: 0;
  }

  .c-chat__online-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--chat-online-color);
    border: 2px solid var(--chat-sidebar-bg);
  }

  .c-chat__contact-info {
    flex: 1;
    min-width: 0;
  }

  .c-chat__contact-name {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 13px;
    font-weight: 500;
  }

  .c-chat__contact-time {
    font-size: 11px;
    color: var(--chat-text-secondary);
    margin-left: 8px;
    flex-shrink: 0;
  }

  .c-chat__contact-last {
    font-size: 12px;
    color: var(--chat-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  }

  .c-chat__unread {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--chat-unread-bg);
    color: var(--chat-unread-color);
    font-size: 11px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .c-chat__contact {
    width: 100%;
    border: 0;
    background: transparent;
    text-align: left;
    color: inherit;
    font: inherit;
  }
  @media (max-width: 640px) {
    .c-chat__contact-info,
    .c-chat__unread {
      display: none;
    }
    .c-chat__contact {
      justify-content: center;
      padding: 10px 8px;
    }
  }
</style>
