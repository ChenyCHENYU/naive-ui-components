<template>
  <div class="c-data-picker">
    <slot
      name="trigger"
      :open="open"
      :disabled="disabled || readonly"
      :opened="opened"
      :display="display"
    >
      <div class="c-data-picker__trigger">
        <NButton
          class="c-data-picker__open"
          :size="density.size"
          :disabled="disabled"
          :aria-readonly="readonly"
          :aria-expanded="inline ? opened : undefined"
          :aria-controls="inline && opened ? panelId : undefined"
          :title="display"
          @click="toggle"
        >
          <span :class="{ 'c-data-picker__placeholder': !display }">{{
            display || resolvedPlaceholder
          }}</span>
          <span
            class="i-mdi:magnify w-4 h-4 shrink-0"
            aria-hidden="true"
          />
        </NButton>
        <NButton
          v-if="
            clearable &&
            modelValue != null &&
            (!Array.isArray(modelValue) || modelValue.length)
          "
          class="c-data-picker__clear"
          :size="density.size"
          :disabled="disabled || readonly"
          :aria-label="t('picker.clear')"
          @click="clear"
        >
          <template #icon
            ><span
              class="i-mdi:close w-4 h-4"
              aria-hidden="true"
          /></template>
        </NButton>
      </div>
    </slot>
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
      :is="inline ? NCard : NModal"
      v-if="!inline || opened"
      v-bind="surfaceProps"
    >
      <div
        ref="panelContent"
        class="c-data-picker__content"
        :tabindex="inline ? -1 : undefined"
      >
        <slot
          v-if="opened"
          name="query"
          :initial-values="initialValues"
          :submit="submitFilters"
          :loading="list.loading.value"
        >
          <component
            :is="inline ? 'div' : 'form'"
            class="c-data-picker__search"
            @submit.stop.prevent="query"
          >
            <NInput
              v-model:value="searchDraft"
              :size="density.size"
              :placeholder="t('picker.searchPlaceholder')"
              :input-props="{ 'aria-label': t('picker.searchLabel') }"
              @keydown.enter="searchOnEnter"
              clearable
            />
            <NButton
              :attr-type="inline ? 'button' : 'submit'"
              :size="density.size"
              :loading="list.loading.value"
              type="primary"
              @click="inline && query()"
            >
              <template #icon
                ><span
                  class="i-mdi:magnify w-4 h-4"
                  aria-hidden="true"
              /></template>
              {{ t('picker.search') }}
            </NButton>
          </component>
        </slot>
        <div
          v-if="list.status.value === 'error'"
          class="c-data-picker__error"
          role="alert"
        >
          {{ t('picker.loadFailed') }}
          <NButton
            :size="density.size"
            @click="list.reload"
          >
            <template #icon
              ><span
                class="i-mdi:refresh w-4 h-4"
                aria-hidden="true"
            /></template>
            {{ t('common.retry') }}
          </NButton>
        </div>
        <C_Table
          v-else-if="opened"
          ref="tableRef"
          :data="rows"
          :columns="columns"
          :row-key="source.rowKey"
          :loading="list.loading.value"
          :config="tableConfig"
          @selection-change="selectPage"
        />
        <div class="c-data-picker__result-bar">
          <div
            class="c-data-picker__selection"
            aria-live="polite"
          >
            <span v-if="total !== null">{{
              t('picker.total', { count: total })
            }}</span>
            <span>{{ t('picker.selected', { count: selectedCount }) }}</span>
            <NTag
              v-for="item in selected"
              :key="`${typeof item.value}:${item.value}`"
              size="small"
              closable
              :title="item.label"
              @close="remove(item.value)"
              >{{ item.label }}</NTag
            >
            <span v-if="selectedCount > 30">{{
              t('picker.moreSelected', { count: selectedCount - 30 })
            }}</span>
          </div>
          <nav
            v-if="total !== null && total > pageSize"
            class="c-data-picker__pagination"
            :aria-label="t('picker.pagination')"
          >
            <NPagination
              v-model:page="page"
              :page-size="pageSize"
              :item-count="total"
              :page-slot="5"
              :size="density.size"
            />
          </nav>
        </div>
      </div>
      <template #action>
        <div class="c-data-picker__actions">
          <NButton
            :size="density.size"
            @click="dismiss"
          >
            <template #icon
              ><span
                class="i-mdi:close w-4 h-4"
                aria-hidden="true"
            /></template>
            {{ t('common.cancel') }}
          </NButton>
          <NButton
            type="primary"
            :size="density.size"
            :disabled="!canConfirm"
            @click="commit"
          >
            <template #icon
              ><span
                class="i-mdi:check w-4 h-4"
                aria-hidden="true"
            /></template>
            {{ t('common.confirm') }}
          </NButton>
        </div>
      </template>
    </component>
  </div>
</template>

<script
  setup
  lang="ts"
  generic="T extends object, TFilters extends object = Record<string, unknown>"
>
  import { computed, nextTick, shallowRef, useId } from 'vue'
  import { NButton, NCard, NInput, NModal, NPagination, NTag } from 'naive-ui'
  import C_Table from '../C_Table/index.vue'
  import type { TableInstance } from '../C_Table/types'
  import { resolveComponentDensity } from '../../core/density'
  import { useFormGlobalConfig } from '../C_Form/composables/useFormConfig'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import type { DataPickerProps, DataPickerEmits } from './types'
  import { useDataPicker } from './data'

  defineOptions({ name: 'C_DataPicker' })
  const props = withDefaults(defineProps<DataPickerProps<T, TFilters>>(), {
    pageSize: 20,
  })
  const emit = defineEmits<DataPickerEmits<T>>()
  defineSlots<{
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
  }>()
  const tableRef = shallowRef<TableInstance<T> | null>(null)
  const panelContent = shallowRef<HTMLElement | null>(null)
  const panelId = useId()
  const inline = computed(() => props.presentation === 'inline')
  let opener: HTMLElement | null = null
  const globalFormConfig = useFormGlobalConfig()
  const resolvedDensity = computed(
    () => props.density ?? globalFormConfig.density ?? 'compact'
  )
  const density = computed(() => resolveComponentDensity(resolvedDensity.value))
  const { t } = useComponentLocale(() => props.locale)
  const resolvedTitle = computed(() => props.title ?? t('picker.title'))
  const resolvedPlaceholder = computed(
    () => props.placeholder ?? t('picker.placeholder')
  )
  const {
    opened,
    open: startSession,
    close,
    confirm,
    clear,
    page,
    pageSize,
    searchDraft,
    query,
    submitFilters,
    list,
    labels,
    rows,
    total,
    display,
    selected,
    selectedCount,
    canConfirm,
    columns,
    tableConfig,
    selectPage,
    remove,
  } = useDataPicker(props, emit, tableRef, () => resolvedDensity.value)

  function open(event?: Event): void {
    if (opened.value || props.disabled || props.readonly) return
    if (inline.value)
      opener = (event?.currentTarget ??
        document.activeElement) as HTMLElement | null
    startSession()
    if (inline.value)
      void nextTick(() => {
        const content = panelContent.value
        const firstField = content?.querySelector<HTMLInputElement>(
          'input:not([type="hidden"])'
        )
        const target = firstField ?? content
        target?.focus()
      })
  }

  function restoreFocus(): void {
    const trigger = opener
    opener = null
    if (trigger?.isConnected) trigger.focus()
  }

  function dismiss(): void {
    close()
    restoreFocus()
  }

  function toggle(event: MouseEvent): void {
    if (inline.value && opened.value) dismiss()
    else open(event)
  }

  function commit(): void {
    confirm()
    if (!opened.value) restoreFocus()
  }

  function searchOnEnter(event: KeyboardEvent): void {
    if (!inline.value || event.isComposing) return
    event.preventDefault()
    event.stopPropagation()
    query()
  }

  function inlineKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    event.preventDefault()
    event.stopPropagation()
    dismiss()
  }

  const surfaceProps = computed(() =>
    inline.value
      ? {
          id: panelId,
          class: 'c-data-picker__inline',
          role: 'region',
          'aria-label': resolvedTitle.value,
          title: resolvedTitle.value,
          size: 'small' as const,
          onKeydown: inlineKeydown,
        }
      : {
          show: opened.value,
          preset: 'card' as const,
          class: 'c-data-picker__modal',
          title: resolvedTitle.value,
          'aria-label': resolvedTitle.value,
          style: { width: 'min(960px, calc(100vw - 24px))' },
          'onUpdate:show': (show: boolean) => {
            if (!show) close()
          },
        }
  )
  defineExpose({ open, close })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
