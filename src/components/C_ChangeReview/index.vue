<template>
  <section
    class="c-change-review"
    :aria-label="resolvedTitle"
  >
    <header class="c-change-review__header">
      <div class="c-change-review__heading">
        <strong>{{ resolvedTitle }}</strong>
        <span role="status">{{
          t('changeReview.summary', {
            count: changedCount,
            total: rows.length,
          })
        }}</span>
      </div>
      <NCheckbox
        v-if="rows.length"
        v-model:checked="onlyChanged"
        :size="size"
      >
        {{ t('changeReview.onlyChanged') }}
      </NCheckbox>
    </header>

    <div
      v-if="groups.size"
      class="c-change-review__viewport"
      role="region"
      :aria-label="t('changeReview.table')"
      tabindex="0"
    >
      <NTable
        :size="size"
        :bordered="false"
      >
        <thead>
          <tr>
            <th scope="col">{{ t('changeReview.field') }}</th>
            <th scope="col">{{ beforeLabel ?? t('changeReview.before') }}</th>
            <th scope="col">{{ afterLabel ?? t('changeReview.after') }}</th>
            <th scope="col">{{ t('changeReview.status') }}</th>
            <th
              v-if="selectable"
              scope="col"
              >{{ t('changeReview.select') }}</th
            >
          </tr>
        </thead>
        <tbody
          v-for="[group, items] of groups"
          :key="group"
        >
          <tr v-if="group">
            <th
              scope="rowgroup"
              :colspan="selectable ? 5 : 4"
              class="c-change-review__group"
              >{{ group }}</th
            >
          </tr>
          <tr
            v-for="row of items"
            :key="row.field.key"
          >
            <th scope="row">{{ row.field.label }}</th>
            <td
              v-for="side of sides"
              :key="side"
              class="c-change-review__value"
            >
              <slot
                name="value"
                :field="row.field"
                :side="side"
                :value="row[side]"
              >
                {{ displayValue(row, side) }}
              </slot>
            </td>
            <td class="c-change-review__status">
              <NTag
                :type="statusTone[row.status]"
                :bordered="false"
                size="small"
              >
                {{ t(`changeReview.${row.status}`) }}
              </NTag>
            </td>
            <td
              v-if="selectable"
              class="c-change-review__selection"
            >
              <NCheckbox
                v-if="row.eligible"
                :aria-label="
                  t('changeReview.selectField', { field: row.field.label })
                "
                :checked="selected.has(row.field.key)"
                :disabled="disabled"
                :size="size"
                @update:checked="toggleSelection(row.field.key, $event)"
              />
              <span v-else>—</span>
            </td>
          </tr>
        </tbody>
      </NTable>
    </div>
    <NEmpty
      v-else
      class="c-change-review__empty"
      :description="
        t(rows.length ? 'changeReview.noChanges' : 'changeReview.empty')
      "
    />

    <footer
      v-if="selectable"
      class="c-change-review__footer"
    >
      <span role="status">{{
        t('changeReview.selected', { count: selected.size })
      }}</span>
      <NButton
        attr-type="button"
        type="primary"
        :size="size"
        :disabled="disabled || !selected.size"
        @click="apply"
      >
        {{ t('changeReview.apply') }}
      </NButton>
    </footer>
  </section>
</template>

<script setup lang="ts" generic="T extends object">
  import { computed } from 'vue'
  import { NButton, NCheckbox, NEmpty, NTable, NTag } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useChangeReviewLocale } from './locale'
  import { resolveComponentDensity } from '../../core/density'
  import { createReviewRow, type ReviewRow } from './data'
  import type {
    ChangeReviewEmits,
    ChangeReviewField,
    ChangeReviewKey,
    ChangeReviewProps,
    ChangeReviewSide,
  } from './types'

  defineOptions({ name: 'C_ChangeReview' })
  const props = defineProps<ChangeReviewProps<T>>()
  const emit = defineEmits<ChangeReviewEmits<T>>()
  defineSlots<{
    value?: (props: {
      field: ChangeReviewField<T>
      side: ChangeReviewSide
      value: T[ChangeReviewKey<T>] | undefined
    }) => unknown
  }>()
  const selectedKeys = defineModel<ChangeReviewKey<T>[]>('selectedKeys', {
    default: () => [],
  })
  const onlyChanged = defineModel<boolean>('onlyChanged', { default: true })
  const { t } = useChangeReviewLocale(() => props.locale)
  const density = useComponentDensity(() => props.density)
  const size = computed(() => resolveComponentDensity(density.value).size)
  const resolvedTitle = computed(() => props.title ?? t('changeReview.title'))
  const sides = ['before', 'after'] as const
  const statusTone = {
    unchanged: 'default',
    added: 'success',
    removed: 'error',
    changed: 'warning',
  } as const

  const rows = computed(() => {
    const byKey = new Map<ChangeReviewKey<T>, ReviewRow<T>>()
    for (const field of props.fields) {
      if (!byKey.has(field.key))
        byKey.set(field.key, createReviewRow(field, props.before, props.after))
    }
    return [...byKey.values()]
  })
  const changes = computed(() =>
    rows.value.filter(row => row.status !== 'unchanged')
  )
  const changedCount = computed(() => changes.value.length)
  const groups = computed(() => {
    const result = new Map<string, ReviewRow<T>[]>()
    for (const row of onlyChanged.value ? changes.value : rows.value) {
      const group = row.field.group ?? ''
      const items = result.get(group)
      if (items) items.push(row)
      else result.set(group, [row])
    }
    return result
  })
  const eligibleKeys = computed(() =>
    changes.value.filter(row => row.eligible).map(row => row.field.key)
  )
  const selected = computed(() => {
    const keys = new Set(selectedKeys.value)
    return new Set(eligibleKeys.value.filter(key => keys.has(key)))
  })
  function displayValue(row: ReviewRow<T>, side: ChangeReviewSide) {
    const formatted = row.format(side)
    if (formatted !== undefined) return formatted
    const value = row[side]
    if (value === undefined) return t('changeReview.missing')
    if (value === null) return t('changeReview.null')
    if (value === '') return '""'
    return String(value)
  }
  function toggleSelection(key: ChangeReviewKey<T>, checked: boolean) {
    if (
      !props.selectable ||
      props.disabled ||
      !eligibleKeys.value.includes(key)
    )
      return
    const next = new Set(selected.value)
    if (checked) next.add(key)
    else next.delete(key)
    selectedKeys.value = [...next]
  }
  function apply() {
    if (!props.disabled && props.selectable && selected.value.size)
      emit('apply', [...selected.value])
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
