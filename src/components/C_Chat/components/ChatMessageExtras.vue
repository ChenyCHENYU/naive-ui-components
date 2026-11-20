<template>
  <div class="c-chat-extras">
    <details v-if="activities?.length">
      <summary>{{
        t('chat.activities', { count: activities.length })
      }}</summary>
      <ol class="c-chat-extras__items">
        <li
          v-for="step in activities"
          :key="step.id"
          class="c-chat-extras__step"
        >
          <span>{{ step.title }}</span>
          <span
            class="c-chat-extras__state"
            :data-status="step.status"
            >{{ t(`chat.activity.${step.status}`) }}</span
          >
          <small v-if="step.detail">{{ step.detail }}</small>
        </li>
      </ol>
    </details>
    <details v-if="sources?.length">
      <summary>{{ t('chat.sources', { count: sources.length }) }}</summary>
      <ul class="c-chat-extras__items">
        <li
          v-for="source in sources"
          :key="source.id"
        >
          <button
            type="button"
            @click="emit('source-click', source)"
            >{{ source.label }}</button
          >
          <small v-if="source.description">{{ source.description }}</small>
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
  import { useScopedComponentLocale } from '../../_shared/useScopedComponentLocale'
  import type { ChatActivity, ChatSource } from '../types'
  import { CHINESE, ENGLISH } from './messageExtrasLocale'

  defineProps<{
    activities?: readonly ChatActivity[]
    sources?: readonly ChatSource[]
  }>()
  const emit = defineEmits<{ 'source-click': [source: ChatSource] }>()
  const { t } = useScopedComponentLocale(CHINESE, ENGLISH)
</script>

<style scoped lang="scss">
  .c-chat-extras {
    display: grid;
    gap: 4px;
    margin-block-start: 4px;
    font-size: 0.875em;
    overflow-wrap: anywhere;

    details {
      padding: 5px 8px;
      border: 1px solid var(--chat-border);
      border-radius: var(--c-radius, var(--c-theme-radius));
    }

    summary {
      cursor: pointer;
    }

    button {
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--c-primary, var(--c-theme-primary));
      font: inherit;
      text-align: start;
      text-decoration: underline;
      cursor: pointer;
    }

    small {
      display: block;
      color: var(--chat-text-secondary);
    }

    &__items {
      margin: 4px 0 0;
      padding-inline-start: 18px;

      li + li {
        margin-block-start: 4px;
      }
    }

    &__state {
      margin-inline-start: 8px;
      color: var(--chat-text-secondary);

      &[data-status='succeeded'] {
        color: var(--c-success, var(--c-theme-success));
      }

      &[data-status='failed'] {
        color: var(--c-error, var(--c-theme-error));
      }
    }
  }
</style>
