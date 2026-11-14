<template>
  <div class="c-data-picker">
    <component
      :is="renderTrigger"
      v-if="props.showTrigger !== false && (!popover || fullModal)"
    />
    <span
      v-if="labels.status.value === 'error'"
      class="c-data-picker__label-error"
      role="status"
      >{{ t('picker.labelFailed') }}
      <NButton
        text
        size="tiny"
        @click="labels.reload"
      >
        <template #icon
          ><span
            class="i-mdi:refresh w-4 h-4"
            aria-hidden="true"
        /></template>
        {{ t('common.retry') }}
      </NButton></span
    >
    <component
      v-if="!inline || opened"
      :is="surfaceComponent"
      v-bind="surfaceProps"
    >
      <template
        v-if="popover && !fullModal"
        #trigger
        ><component :is="renderTrigger"
      /></template>
      <PickerPanel
        v-if="opened"
        ref="panelRef"
        :state="state"
        :options="props"
        :density-value="resolvedDensity"
        :inline="inline || (popover && !fullModal)"
        :popup="popover && !fullModal"
        :panel-id="panelId"
        @confirm="commit"
        @dismiss="dismiss"
        @keydown="panelKeydown"
      >
        <template
          v-if="$slots.query"
          #query="context"
          ><slot
            name="query"
            v-bind="context"
        /></template>
        <template
          v-if="$slots.navigation"
          #navigation="context"
          ><slot
            name="navigation"
            v-bind="context"
        /></template>
        <template
          v-if="$slots.selected"
          #selected="context"
        >
          <slot
            name="selected"
            v-bind="context"
          />
        </template>
      </PickerPanel>
    </component>
  </div>
</template>
<script
  setup
  lang="ts"
  generic="T extends object, TFilters extends object = Record<string, unknown>"
>
  import {
    computed,
    h,
    nextTick,
    onScopeDispose,
    shallowRef,
    useId,
    watch,
    type Component,
  } from 'vue'
  import { NButton, NCard, NInput, NModal, NPopover } from 'naive-ui'
  import type { TableInstance } from '../C_Table/types'
  import { resolveComponentDensity } from '../../core/density'
  import { useFormGlobalConfig } from '../C_Form/composables/useFormConfig'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import type {
    DataPickerProps,
    DataPickerEmits,
    DataPickerSelectionContext,
  } from './types'
  import { useDataPicker } from './data'
  import PickerPanel from './PickerPanel.vue'
  defineOptions({ name: 'C_DataPicker' })
  const props = withDefaults(defineProps<DataPickerProps<T, TFilters>>(), {
    pageSize: 20,
    showTrigger: true,
    showActions: true,
  })
  const emit = defineEmits<DataPickerEmits<T>>()
  const slots = defineSlots<{
    selected?(props: DataPickerSelectionContext<T>): unknown
    trigger?(props: {
      open: () => void
      disabled: boolean
      opened: boolean
      display: string
    }): unknown
    query?(props: {
      initialValues: TFilters | undefined
      submit: (filters: TFilters) => void
      loading: boolean
    }): unknown
    navigation?(props: {
      filters: Readonly<TFilters> | undefined
      submit: (filters: TFilters) => void
      loading: boolean
    }): unknown
  }>()
  const tableRef = shallowRef<TableInstance<T> | null>(null)
  const panelRef = shallowRef<{ focus: () => void } | null>(null)
  const triggerRoot = shallowRef<HTMLElement | null>(null)
  const panelId = useId()
  const inline = computed(() => props.presentation === 'inline')
  const popover = computed(() => props.presentation === 'popover')
  const blocked = computed(() => props.disabled || props.readonly)
  const fullModal = shallowRef(false)
  const surfaceComponent = computed<Component>(() =>
    popover.value && !fullModal.value ? NPopover : inline.value ? NCard : NModal
  )
  const globalFormConfig = useFormGlobalConfig()
  const resolvedDensity = computed(
    () => props.density ?? globalFormConfig.density ?? 'compact'
  )
  const density = computed(() => resolveComponentDensity(resolvedDensity.value))
  const { t } = useComponentLocale(() => props.locale)
  const state = useDataPicker(
    props,
    emit,
    tableRef,
    () => resolvedDensity.value,
    () => popover.value && !fullModal.value
  )
  const { opened, close, confirm, clear, searchDraft, query, labels, display } =
    state
  let opener: HTMLElement | null = null
  let suppressFocusOpen = false
  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(opened, active => {
    if (active) return
    clearTimeout(searchTimer)
    searchTimer = undefined
    fullModal.value = false
  })
  onScopeDispose(() => clearTimeout(searchTimer))
  function open(event?: Event) {
    if (opened.value || blocked.value) return
    opener = (event?.currentTarget ??
      (typeof document === 'undefined'
        ? null
        : document.activeElement)) as HTMLElement | null
    state.open()
    if (inline.value) void nextTick(() => panelRef.value?.focus())
  }
  function dismiss() {
    const cancelled = opened.value
    clearTimeout(searchTimer)
    searchTimer = undefined
    close()
    if (cancelled) emit('cancel')
    fullModal.value = false
    const previous = opener
    opener = null
    void nextTick(() => {
      const target = previous?.isConnected
        ? previous
        : triggerRoot.value?.querySelector<HTMLElement>('input, button')
      suppressFocusOpen = true
      target?.focus()
      queueMicrotask(() => {
        suppressFocusOpen = false
      })
    })
  }
  async function commit() {
    const accepted = await confirm()
    if (accepted) dismiss()
    return accepted
  }
  function quickSearch(value: string) {
    if (blocked.value) return
    open()
    searchDraft.value = value
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      searchTimer = undefined
      if (opened.value && value.length >= state.searchOptions.value.minChars)
        query()
    }, state.searchOptions.value.debounce)
  }
  function fullOpen() {
    if (blocked.value) return
    clearTimeout(searchTimer)
    searchTimer = undefined
    open()
    if (searchDraft.value !== state.search.value) query()
    fullModal.value = true
  }
  function onQuickFocus() {
    if (suppressFocusOpen) {
      suppressFocusOpen = false
      return
    }
    open()
  }
  function onQuickKey(event: KeyboardEvent) {
    if (event.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      dismiss()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      open()
      void nextTick(() => panelRef.value?.focus())
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      clearTimeout(searchTimer)
      searchTimer = undefined
      open()
      query()
    }
  }
  const renderQuickInput = () =>
    h(NInput, {
      value: opened.value ? searchDraft.value : display.value,
      placeholder: props.placeholder ?? t('picker.quickSearch'),
      size: density.value.size,
      disabled: props.disabled,
      readonly: props.readonly,
      inputProps: {
        'aria-label': props.title ?? t('picker.title'),
        'aria-expanded': opened.value,
        'aria-controls': opened.value ? panelId : undefined,
      },
      'onUpdate:value': quickSearch,
      onFocus: onQuickFocus,
      onClick: () => open(),
      onKeydown: onQuickKey,
    })
  const renderOpenButton = () =>
    h(
      NButton,
      {
        class: 'c-data-picker__open',
        size: density.value.size,
        disabled: props.disabled,
        'aria-readonly': props.readonly,
        'aria-expanded': inline.value ? opened.value : undefined,
        'aria-controls': inline.value && opened.value ? panelId : undefined,
        title: display.value,
        onClick: (event: MouseEvent) =>
          inline.value && opened.value ? dismiss() : open(event),
      },
      () => [
        h(
          'span',
          {
            class: !display.value ? 'c-data-picker__placeholder' : undefined,
          },
          display.value || (props.placeholder ?? t('picker.placeholder'))
        ),
        h('span', {
          class: 'i-mdi:magnify w-4 h-4 shrink-0',
          'aria-hidden': 'true',
        }),
      ]
    )

  const renderTrigger = () => {
    if (slots.trigger)
      return slots.trigger({
        open,
        disabled: !!blocked.value,
        opened: opened.value,
        display: display.value,
      })
    const input = popover.value ? renderQuickInput() : renderOpenButton()
    const nodes = [input]
    if (popover.value)
      nodes.push(
        h(
          NButton,
          {
            class: 'c-data-picker__more',
            size: density.value.size,
            disabled: blocked.value,
            onClick: fullOpen,
          },
          () => t('picker.more')
        )
      )
    if (
      props.clearable &&
      props.modelValue != null &&
      (!Array.isArray(props.modelValue) || props.modelValue.length)
    )
      nodes.push(
        h(
          NButton,
          {
            class: 'c-data-picker__clear',
            size: density.value.size,
            disabled: blocked.value,
            'aria-label': t('picker.clear'),
            onClick: clear,
          },
          () =>
            h('span', { class: 'i-mdi:close w-4 h-4', 'aria-hidden': 'true' })
        )
      )
    return h(
      'div',
      { class: 'c-data-picker__trigger', ref: triggerRoot },
      nodes
    )
  }
  function panelKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    event.stopPropagation()
    dismiss()
  }
  const surfaceProps = computed(() => {
    const title = props.title ?? t('picker.title')
    if (popover.value && !fullModal.value)
      return {
        show: opened.value,
        trigger: 'manual',
        placement: 'bottom-start',
        showArrow: false,
        width: 640,
        style: { maxWidth: 'calc(100vw - 24px)' },
        onClickoutside: (event: MouseEvent) => {
          if (
            event.target instanceof Node &&
            triggerRoot.value?.contains(event.target)
          )
            return
          dismiss()
        },
        onKeydown: panelKeydown,
      }
    if (inline.value)
      return {
        id: panelId,
        class: 'c-data-picker__inline',
        role: 'region',
        'aria-label': title,
        title:
          props.showActions === false && props.showTrigger === false
            ? undefined
            : title,
        size: 'small',
        onKeydown: panelKeydown,
      }
    return {
      show: opened.value,
      preset: 'card',
      class: 'c-data-picker__modal',
      title,
      'aria-label': title,
      style: {
        width: `min(${slots.selected ? 1160 : 960}px, calc(100vw - 24px))`,
      },
      'onUpdate:show': (show: boolean) => {
        if (!show) dismiss()
      },
    }
  })
  defineExpose({ open, close: dismiss, reset: state.reset, confirm: commit })
</script>
<style scoped lang="scss">
  @use './index.scss';
</style>
