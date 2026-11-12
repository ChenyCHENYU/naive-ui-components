<template>
  <div class="c-auto-complete">
    <NAutoComplete
      ref="input"
      :get-show="showSuggestions"
      v-bind="$attrs"
      :value="text"
      :options="suggestions"
      :render-label="renderLabel ? renderSuggestion : undefined"
      :disabled="blocked"
      :loading="loading || remote.loading.value"
      :clearable="clearable"
      :placeholder="placeholder"
      :size="resolvedSize"
      :status="status"
      :input-props="inputProps"
      :show-empty="Boolean(source)"
      @update:value="update"
      @select="selectRow"
      @focus="focus"
      @blur="remote.close"
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
        v-if="source || $slots.suffix"
        #suffix
      >
        <slot name="suffix" />
        <OptionStatus
          v-if="source"
          compact
          :active="remote.active.value"
          :loading="remote.loading.value"
          :error="remote.error.value"
          :has-more="remote.hasMore.value"
          :locale="locale"
          @retry="remote.retry"
          @more="remote.loadMore"
        />
      </template>
      <template
        v-if="source || $slots.empty"
        #empty
      >
        <slot name="empty">
          <OptionStatus
            v-if="source"
            :active="remote.active.value"
            :loading="remote.loading.value"
            :error="remote.error.value"
            :has-more="false"
            :incomplete="
              remote.search.value.trim().length < remote.minChars.value
            "
            :min-chars="remote.minChars.value"
            empty
            :locale="locale"
            @retry="remote.retry"
          />
        </slot>
      </template>
    </NAutoComplete>
  </div>
</template>

<script
  setup
  lang="ts"
  generic="
    R extends object = AutoCompleteOptionItem,
    F extends object = Record<string, unknown>
  "
>
  import { computed, ref, useSlots, useTemplateRef, watch } from 'vue'
  import { NAutoComplete, type AutoCompleteInst } from 'naive-ui'
  import { useRemoteOptions } from '../../composables/useRemoteOptions'
  import { resolveComponentDensity } from '../../core/density'
  import OptionStatus from '../../internal/OptionStatus.vue'
  import type { AutoCompleteOptionItem, AutoCompleteProps } from './types'

  defineOptions({ name: 'C_AutoComplete', inheritAttrs: false })
  const props = withDefaults(defineProps<AutoCompleteProps<R, F>>(), {
    filterable: true,
  })
  const emit = defineEmits<{
    'update:modelValue': [value: string]
    select: [row: R]
  }>()
  const slots = useSlots()
  const forwardedSlots = computed(() =>
    Object.fromEntries(
      Object.entries(slots).filter(
        ([name]) => name !== 'suffix' && name !== 'empty'
      )
    )
  )
  const input = useTemplateRef<AutoCompleteInst>('input')
  const text = ref(props.modelValue ?? '')
  const blocked = computed(() => props.disabled || props.readonly)
  const showSuggestions = () => !blocked.value
  const remote = useRemoteOptions({
    source: () => props.source,
    disabled: blocked,
  })
  const resolvedSize = computed(
    () =>
      props.size ??
      (props.density ? resolveComponentDensity(props.density).size : undefined)
  )
  const local = computed(() =>
    (props.options ?? []).map(option =>
      typeof option === 'string'
        ? {
            value: option,
            label: option,
            row: { value: option, label: option },
            disabled: false,
          }
        : {
            value: option.value,
            label: option.label ?? option.value,
            row: option,
            disabled: Boolean(option.disabled),
          }
    )
  )
  const entries = computed(() =>
    props.source
      ? remote.rows.value.map(row => ({
          key: JSON.stringify([
            typeof props.source!.value(row),
            props.source!.value(row),
          ]),
          label: props.source!.label(row),
          text: props.source!.label(row),
          row,
          disabled: false,
        }))
      : local.value
          .filter(
            option =>
              !props.filterable ||
              option.label
                .toLocaleLowerCase()
                .includes(text.value.toLocaleLowerCase())
          )
          .map(row => ({
            key: row.value,
            label: row.label,
            text: row.value,
            row: row.row,
            disabled: row.disabled,
          }))
  )
  const suggestions = computed(() =>
    entries.value.map(entry => ({
      value: entry.key,
      label: entry.label,
      disabled: entry.disabled,
    }))
  )
  const entriesByValue = computed(
    () => new Map(entries.value.map(entry => [entry.key, entry]))
  )
  const renderSuggestion = (option: { value?: string | number }) => {
    const entry =
      typeof option.value === 'string'
        ? entriesByValue.value.get(option.value)
        : undefined
    return entry && props.renderLabel
      ? props.renderLabel(entry.row as R)
      : (entry?.label ?? '')
  }
  let selectionText: string | undefined
  function update(value: string | null) {
    if (blocked.value) return
    const selected = selectionText !== undefined
    text.value = selectionText ?? value ?? ''
    selectionText = undefined
    remote.setSearch(text.value)
    if (!selected) remote.open()
    emit('update:modelValue', text.value)
  }
  function selectRow(value: string | number) {
    if (blocked.value) return
    const entry =
      typeof value === 'string' ? entriesByValue.value.get(value) : undefined
    if (!entry || entry.disabled) return
    selectionText = entry.text
    remote.close()
    emit('select', entry.row as R)
  }
  function focus() {
    if (blocked.value) return
    remote.setSearch(text.value)
    remote.open()
  }
  watch(
    () => props.modelValue,
    value => {
      text.value = value ?? ''
      remote.setSearch(text.value)
    }
  )
  defineExpose({
    focus: () => input.value?.focus(),
    blur: () => input.value?.blur(),
  })
</script>

<style lang="scss">
  @use '../../styles/option-status';
  .c-auto-complete {
    min-width: 0;
    width: 100%;
  }
</style>
