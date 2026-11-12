<template>
  <div
    v-if="
      (error != null ||
        (active && (loading || hasMore || incomplete || empty))) &&
      (!compact || error != null || hasMore)
    "
    class="c-option-status"
    :class="{ 'c-option-status--compact': compact }"
    :role="error != null ? 'alert' : 'status'"
    aria-live="polite"
    @mousedown.prevent.stop
    @click.stop
  >
    <template v-if="error != null">
      <span v-if="!compact">{{ t('options.failed') }}</span>
      <button
        type="button"
        @mousedown.prevent
        @click="emit('retry')"
        >{{ t('common.retry') }}</button
      >
    </template>
    <span v-else-if="loading">{{ t('common.loading') }}</span>
    <span v-else-if="incomplete">{{
      t('options.minChars', { count: minChars ?? 0 })
    }}</span>
    <button
      v-else-if="hasMore"
      type="button"
      @mousedown.prevent
      @click="emit('more')"
      >{{ t('options.loadMore') }}</button
    >
    <span v-else-if="empty">{{ t('options.empty') }}</span>
  </div>
</template>
<script setup lang="ts">
  import type { ComponentLocale } from '../core/contracts'
  import { useComponentLocale } from '../composables/useComponentLocale'
  const props = defineProps<{
    active: boolean
    loading: boolean
    error: unknown
    hasMore: boolean
    incomplete?: boolean
    minChars?: number
    empty?: boolean
    compact?: boolean
    locale?: ComponentLocale
  }>()
  const emit = defineEmits<{ retry: []; more: [] }>()
  const { t } = useComponentLocale(() => props.locale)
</script>
