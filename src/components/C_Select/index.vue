<template>
  <div class="c-select-field">
    <NSelect
      ref="select"
      v-bind="$attrs"
      class="c-select"
      :class="{ 'c-select--bounded': summarizeTags }"
      :value="binding.value"
      :options="binding.options"
      :multiple="multiple"
      :max-tag-count="summarizeTags ? 1 : maxTagCount"
      :filterable="filterable ?? Boolean(source)"
      :remote="source ? true : props.remote"
      :show="show"
      :tag="tag"
      :clearable="clearable"
      :disabled="blocked"
      :loading="loading || remote.loading.value"
      :size="resolvedSize"
      :placeholder="placeholder"
      :virtual-scroll="virtualScroll"
      :status="status ?? (remote.error.value != null ? 'error' : undefined)"
      :input-props="inputProps"
      :fallback-option="binding.resolveFallbackOption(fallbackOption)"
      @update:value="update"
      @update:show="updateShow"
      @search="remote.setSearch"
    >
      <template
        v-for="(_, name) in forwardedSlots"
        #[name]="slotProps"
      >
        <slot
          :name="name"
          v-bind="slotProps ?? {}"
        />
      </template>
      <template
        v-if="source || $slots.action"
        #action
      >
        <OptionStatus
          v-if="source"
          :active="remote.active.value"
          :loading="remote.loading.value"
          :error="remote.error.value"
          :has-more="remote.hasMore.value"
          :incomplete="
            remote.search.value.trim().length < remote.minChars.value
          "
          :min-chars="remote.minChars.value"
          :locale="locale"
          @retry="remote.retry"
          @more="remote.loadMore"
        />
        <slot name="action" />
      </template>
    </NSelect>
  </div>
</template>

<script
  setup
  lang="ts"
  generic="
    V extends SelectValue = SelectValue,
    M extends boolean = false,
    T extends boolean = false,
    R extends object = SelectOptionItem<V>,
    F extends object = Record<string, unknown>
  "
>
  import { computed, useSlots, useTemplateRef, watch } from 'vue'
  import { NSelect, type SelectInst } from 'naive-ui'
  import {
    createOptionValueBinder,
    flattenOptionItems,
  } from '../../core/options'
  import { shouldSummarizeSelectTags } from '../../core/selectPresentation'
  import type {
    SelectModelValue,
    SelectProps,
    SelectValue,
    SelectOptionItem,
    SelectSelection,
  } from './types'
  import { useRemoteOptions } from '../../composables/useRemoteOptions'
  import { resolveComponentDensity } from '../../core/density'
  import OptionStatus from '../../internal/OptionStatus.vue'

  defineOptions({ name: 'C_Select', inheritAttrs: false })
  const props = withDefaults(defineProps<SelectProps<V, M, T, R, F>>(), {
    virtualScroll: true,
    filterable: undefined,
    remote: undefined,
    show: undefined,
  })
  const emit = defineEmits<{
    'update:modelValue': [value: SelectModelValue<V, M, T>]
    'update:show': [show: boolean]
    select: [selection: SelectSelection<R, M>]
  }>()
  const slots = useSlots()
  const forwardedSlots = computed(() =>
    Object.fromEntries(
      Object.entries(slots).filter(([name]) => name !== 'action')
    )
  )
  const select = useTemplateRef<SelectInst>('select')
  const blocked = computed(() => props.disabled || props.readonly)
  const summarizeTags = computed(() =>
    shouldSummarizeSelectTags(props.multiple, props.maxTagCount)
  )
  const selectedValues = computed(
    () =>
      (Array.isArray(props.modelValue)
        ? props.modelValue
        : props.modelValue == null
          ? []
          : [props.modelValue]) as V[]
  )
  const remote = useRemoteOptions({
    source: () => props.source,
    values: selectedValues,
    disabled: blocked,
  })
  const resolvedSize = computed(
    () =>
      props.size ??
      (props.density ? resolveComponentDensity(props.density).size : undefined)
  )
  const resolvedOptions = computed(() =>
    props.source
      ? remote.available.value.map(row => ({
          value: props.source!.value(row),
          label: props.source!.label(row),
        }))
      : props.options
  )
  const bindOptions = computed(() =>
    createOptionValueBinder(resolvedOptions.value)
  )
  const localRows = computed(() => {
    const rows = props.options ? flattenOptionItems(props.options) : []
    const index = new Map<V, SelectOptionItem<V>>()
    // 本地重复值沿用原先 find 的首项语义；远程实体身份仍由 source 单独校验。
    for (const row of rows)
      if ('value' in row && !index.has(row.value)) index.set(row.value, row)
    return index
  })
  function updateShow(show: boolean) {
    if (show && !blocked.value) remote.open()
    else remote.close()
    emit('update:show', show)
  }
  watch(
    () => props.show,
    show => {
      if (show && !blocked.value) remote.open()
      else if (show === false) remote.close()
    },
    { immediate: true }
  )
  const binding = computed(() => bindOptions.value(props.modelValue))

  function update(
    value: string | number | Array<string | number> | null,
    selected?: unknown
  ): void {
    if (blocked.value) return
    const decoded = binding.value.decode(value, selected)
    const values = (
      Array.isArray(decoded) ? decoded : decoded == null ? [] : [decoded]
    ) as V[]
    const rows = values.flatMap(value => {
      const row = props.source
        ? remote.rowFor(value)
        : localRows.value.get(value)
      return row ? [row as R] : []
    })
    remote.retain(values)
    emit(
      'update:modelValue',
      (props.multiple && decoded === null ? [] : decoded) as SelectModelValue<
        V,
        M,
        T
      >
    )
    emit(
      'select',
      (props.multiple ? rows : (rows[0] ?? null)) as SelectSelection<R, M>
    )
  }

  defineExpose({
    focus: () => select.value?.focus(),
    blur: () => select.value?.blur(),
  })
</script>

<style lang="scss">
  @use './index.scss';
</style>
