<template>
  <section
    class="c-descriptions"
    :class="{ 'c-descriptions--compact': density === 'compact' }"
    :style="panelStyle"
    :aria-label="title || t('descriptions.title')"
  >
    <h3
      v-if="title"
      class="c-descriptions__title"
      >{{ title }}</h3
    >
    <div
      v-for="[group, entries] in groups"
      :key="group"
      class="c-descriptions__group"
    >
      <div
        v-if="group"
        class="c-descriptions__heading"
        >{{ group }}</div
      >
      <dl
        class="c-descriptions__grid"
        :aria-label="group || undefined"
      >
        <div
          v-for="entry in entries"
          :key="entry.field.key"
          class="c-descriptions__field"
        >
          <dt>{{ entry.field.label }}</dt>
          <dd>
            <span class="c-descriptions__value">
              <slot
                name="value"
                v-bind="entry"
                >{{ entry.text ?? placeholder }}</slot
              >
            </span>
            <NButton
              v-if="entry.field.copyable && entry.text !== undefined"
              quaternary
              circle
              size="tiny"
              :aria-label="t('descriptions.copy', { field: entry.field.label })"
              @click="copy(entry)"
            >
              <template #icon>
                <span
                  class="i-mdi:content-copy"
                  aria-hidden="true"
                />
              </template>
            </NButton>
          </dd>
        </div>
      </dl>
    </div>
    <p
      v-if="!groups.size"
      class="c-descriptions__empty"
      >{{ t('descriptions.empty') }}</p
    >
    <p
      v-if="announcement"
      class="c-descriptions__feedback"
      role="status"
    >
      {{ t(announcement.message, { field: announcement.field }) }}
    </p>
  </section>
</template>

<script setup lang="ts" generic="T extends object">
  import { computed, shallowRef, watch } from 'vue'
  import { NButton } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import { CHINESE, ENGLISH } from './locale'
  import type { DescriptionEntry, DescriptionsProps } from './types'

  defineOptions({ name: 'C_Descriptions' })
  const props = defineProps<DescriptionsProps<T>>()
  defineSlots<{ value?: (entry: DescriptionEntry<T>) => unknown }>()

  const density = useComponentDensity(() => props.density)
  const theme = useComponentTheme()
  const { t } = useScopedComponentLocale(CHINESE, ENGLISH, () => props.locale)
  const placeholder = computed(() => props.emptyText ?? '—')
  const panelStyle = computed(() => ({
    ...theme.value,
    '--c-descriptions-columns': Number.isFinite(props.columns)
      ? Math.max(1, Math.min(6, Math.floor(props.columns ?? 3)))
      : 3,
  }))

  function displayText(value: unknown) {
    if (
      value === '' ||
      !['string', 'number', 'boolean', 'bigint'].includes(typeof value)
    )
      return
    return String(value)
  }

  const groups = computed(() => {
    const result = new Map<string, DescriptionEntry<T>[]>()
    const record = props.data
    if (record == null) return result

    for (const field of props.fields) {
      const visible =
        typeof field.show === 'function' ? field.show(record) : field.show
      if (visible === false) continue
      const value = record[field.key]
      const text = displayText(field.format ? field.format(record) : value)
      const group = field.group ?? ''
      const entry = { field, record, value, text }
      const entries = result.get(group)
      if (entries) entries.push(entry)
      else result.set(group, [entry])
    }

    return result
  })

  const announcement = shallowRef<{ message: string; field: string }>()
  let copyRequest = 0
  watch(
    () => props.data,
    () => {
      copyRequest++
      announcement.value = undefined
    },
    { flush: 'sync' }
  )

  async function copy({ field, text }: DescriptionEntry<T>) {
    if (text === undefined) return
    const request = ++copyRequest
    let message = 'descriptions.copied'
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      message = 'descriptions.copyFailed'
    }
    if (request === copyRequest)
      announcement.value = { message, field: field.label }
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
