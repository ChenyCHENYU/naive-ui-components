<template>
  <NDropdown
    v-if="entries.length"
    trigger="click"
    :options="options"
    @select="select"
  >
    <NButton
      class="actions-overflow"
      :size="size"
      :render-icon="() => renderActionIcon('mdi:dots-horizontal', 14)"
      aria-haspopup="menu"
    >
      {{ t('common.more') }}
    </NButton>
  </NDropdown>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, watch } from 'vue'
  import { NButton, NDropdown } from 'naive-ui'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import { renderActionIcon } from './actionIcon'
  import type { ActionButtonSize, ActionEntry } from './types'

  const props = defineProps<{
    anchor?: HTMLElement
    threshold: number
    entries: readonly ActionEntry[]
    size: ActionButtonSize
    resolve: (entry: ActionEntry) => {
      label: string
      icon: string
      disabled: boolean
    }
  }>()
  const emit = defineEmits<{
    narrow: [narrow: boolean]
    select: [entry: ActionEntry]
  }>()
  const { t } = useComponentLocale()

  watch(
    () => [props.anchor, props.threshold] as const,
    ([element, threshold], _, onCleanup) => {
      emit('narrow', false)
      if (!element) return
      const measure = () => {
        const { width } = element.getBoundingClientRect()
        if (width > 0) emit('narrow', width < threshold)
      }
      measure()
      if (typeof ResizeObserver === 'undefined') return
      const observer = new ResizeObserver(measure)
      observer.observe(element)
      onCleanup(() => observer.disconnect())
    },
    { immediate: true, flush: 'post' }
  )
  onBeforeUnmount(() => emit('narrow', false))

  const options = computed(() =>
    props.entries.map(entry => {
      const { label, icon, disabled } = props.resolve(entry)
      return {
        key: entry.renderKey,
        label,
        disabled,
        icon: () => renderActionIcon(icon, 14),
      }
    })
  )
  function select(key: string | number) {
    const entry = props.entries.find(item => item.renderKey === key)
    if (entry) emit('select', entry)
  }
</script>
