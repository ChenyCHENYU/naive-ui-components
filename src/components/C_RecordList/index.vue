<template>
  <section
    class="c-record-list"
    :class="{ 'is-compact': density === 'compact' }"
    :style="theme"
    :aria-label="ariaLabel || t('recordList.title')"
    :aria-busy="loading || undefined"
  >
    <p
      v-if="loading"
      class="c-record-list__placeholder"
      role="status"
      >{{ t('recordList.loading') }}</p
    >
    <ul
      v-if="entries.length"
      class="c-record-list__items"
      :class="{ 'is-cards': layout === 'cards' }"
    >
      <li
        v-for="entry in entries"
        :key="entry.itemKey"
        class="c-record-list__item"
        :class="{ 'is-selected': entry.selected }"
      >
        <div class="c-record-list__body">
          <div class="c-record-list__heading">
            <button
              v-if="selectable"
              type="button"
              class="c-record-list__select"
              :aria-pressed="entry.selected"
              :disabled="entry.view.disabled"
              @click="select(entry)"
              >{{ entry.view.title }}</button
            >
            <strong v-else>{{ entry.view.title }}</strong>
            <NTag
              v-if="entry.view.status"
              size="small"
              round
              :bordered="false"
              :type="
                typeof entry.view.status === 'string'
                  ? 'default'
                  : entry.view.status.type
              "
            >
              {{
                typeof entry.view.status === 'string'
                  ? entry.view.status
                  : entry.view.status.label
              }}
            </NTag>
          </div>
          <slot
            name="description"
            v-bind="entry"
          >
            <p
              v-if="entry.view.description"
              class="c-record-list__description"
              >{{ entry.view.description }}</p
            >
          </slot>
        </div>
        <div
          v-if="$slots.actions"
          class="c-record-list__actions"
        >
          <slot
            name="actions"
            v-bind="entry"
          />
        </div>
      </li>
    </ul>
    <p
      v-else-if="!loading"
      class="c-record-list__placeholder"
      >{{ emptyText ?? t('recordList.empty') }}</p
    >
  </section>
</template>

<script setup lang="ts" generic="T extends object, K extends RecordListKey">
  import { computed } from 'vue'
  import { NTag } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import { CHINESE, ENGLISH } from './locale'
  import type {
    RecordListEmits,
    RecordListItemContext,
    RecordListKey,
    RecordListProps,
  } from './types'

  defineOptions({ name: 'C_RecordList' })
  const props = defineProps<RecordListProps<T, K>>()
  const emit = defineEmits<RecordListEmits<T, K>>()
  defineSlots<{
    description?: (context: RecordListItemContext<T, K>) => unknown
    actions?: (context: RecordListItemContext<T, K>) => unknown
  }>()
  const theme = useComponentTheme()
  const density = useComponentDensity(() => props.density)
  const { t } = useScopedComponentLocale(CHINESE, ENGLISH, () => props.locale)

  // Derive presentation separately so changing the active key does not rerun the business formatter.
  const views = computed(() =>
    props.items.map(item => ({
      item,
      itemKey: props.itemKey(item),
      view: props.itemView(item),
    }))
  )
  const entries = computed(() =>
    views.value.map(entry => ({
      ...entry,
      selected: entry.itemKey === props.modelValue,
    }))
  )

  function select(entry: RecordListItemContext<T, K>) {
    if (!props.selectable || entry.view.disabled) return
    emit('update:modelValue', entry.itemKey)
    emit('select', entry.item, entry.itemKey)
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
