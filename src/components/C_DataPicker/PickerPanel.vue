<template>
  <div
    class="c-data-picker__panel"
    :id="popup ? panelId : undefined"
    :role="popup ? 'dialog' : undefined"
    :aria-label="options.title ?? t('picker.title')"
  >
    <div
      ref="panelContent"
      class="c-data-picker__content"
      :tabindex="inline ? -1 : undefined"
    >
      <div class="c-data-picker__layout">
        <aside
          v-if="options.navigation || $slots.navigation"
          class="c-data-picker__navigation"
        >
          <slot
            name="navigation"
            :filters="filters"
            :submit="submitFilters"
            :loading="list.loading.value"
          >
            <component
              v-if="options.navigation?.render"
              :is="renderNavigation"
            />
            <template v-else>
              <div
                v-if="options.navigation?.title"
                class="c-data-picker__navigation-title"
                >{{ options.navigation.title }}</div
              >
              <NButton
                text
                @click="navigate(undefined)"
                >{{ t('picker.allCategories') }}</NButton
              >
              <C_Tree
                v-if="options.navigation"
                :density="densityValue"
                :data="[...options.navigation.options]"
                key-field="key"
                label-field="label"
                :selected-keys="navigationKeys"
                :addable="false"
                :refreshable="false"
                @node-select="(_node, keys) => navigate(keys[0])"
              />
            </template>
          </slot>
        </aside>
        <div class="c-data-picker__main">
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
            :ref="captureTable"
            :data="rows"
            :columns="columns"
            :row-key="source.rowKey"
            :loading="list.loading.value"
            :config="tableConfig"
            @selection-change="selectPage"
          />
        </div>
        <aside
          v-if="$slots.selected"
          class="c-data-picker__selected-panel"
        >
          <slot
            name="selected"
            :items="selectedItems"
            :remove="remove"
            :move="move"
            :disabled="confirming"
          />
        </aside>
      </div>
      <div
        v-if="selectionError"
        role="alert"
        class="c-data-picker__error"
        >{{
          t(
            selectionError.kind === 'invalid'
              ? 'picker.selectionInvalid'
              : 'picker.selectionFailed'
          )
        }}</div
      >
      <div
        v-if="history.enabled.value"
        class="c-data-picker__history"
      >
        <div v-if="history.recent.value.length"
          ><span>{{ t('picker.recent') }}</span>
          <NButton
            v-for="item in history.recent.value"
            :key="typeof item.value + ':' + item.value"
            size="tiny"
            :disabled="confirming"
            @click="chooseHistory(item.value)"
            >{{ item.label }}</NButton
          >
        </div>
        <div v-if="options.history?.favorites && history.favorites.value.length"
          ><span>{{ t('picker.favorites') }}</span>
          <span
            v-for="item in history.favorites.value"
            :key="typeof item.value + ':' + item.value"
            class="c-data-picker__favorite"
          >
            <NButton
              size="tiny"
              :disabled="confirming"
              @click="chooseHistory(item.value)"
              >{{ item.label }}</NButton
            >
            <NButton
              size="tiny"
              :disabled="confirming"
              :aria-label="`${t('picker.removeFavorite')} ${item.label}`"
              @click="state.removeFavorite(item.value)"
              >×</NButton
            >
          </span>
        </div>
        <NButton
          v-if="options.history?.favorites"
          text
          :disabled="!state.canFavorite.value"
          @click="state.favoriteSelection"
          >{{ t('picker.favorite') }}</NButton
        >
      </div>
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
            v-for="item in $slots.selected ? [] : selected"
            :key="`${typeof item.value}:${item.value}`"
            size="small"
            closable
            :title="item.label"
            @close="remove(item.value)"
            >{{ item.label }}</NTag
          >
          <span v-if="!$slots.selected && selectedCount > 30">{{
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
    <div
      v-if="options.showActions !== false"
      class="c-data-picker__footer"
    >
      <div class="c-data-picker__actions">
        <NButton
          :size="density.size"
          @click="emit('dismiss')"
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
          :loading="confirming"
          @click="emit('confirm')"
        >
          <template #icon
            ><span
              class="i-mdi:check w-4 h-4"
              aria-hidden="true"
          /></template>
          {{ t('common.confirm') }}
        </NButton>
      </div>
    </div>
  </div>
</template>
<script
  setup
  lang="ts"
  generic="T extends object, F extends object = Record<string, unknown>"
>
  import { computed, defineAsyncComponent, h, shallowRef } from 'vue'
  import { NButton, NInput, NPagination, NTag } from 'naive-ui'
  import type { TableInstance } from '../C_Table/types'
  import type { useDataPicker } from './data'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import {
    resolveComponentDensity,
    type ComponentDensity,
  } from '../../core/density'
  import type { DataPickerProps } from './types'
  const props = defineProps<{
    state: ReturnType<typeof useDataPicker<T, F>>
    options: Readonly<DataPickerProps<T, F>>
    densityValue: ComponentDensity
    inline: boolean
    popup: boolean
    panelId: string
  }>()
  const emit = defineEmits<{ confirm: []; dismiss: [] }>()
  const { t } = useComponentLocale(() => props.options.locale)
  const density = computed(() => resolveComponentDensity(props.densityValue))
  const {
    opened,
    page,
    pageSize,
    searchDraft,
    query,
    submitFilters,
    list,
    rows,
    total,
    selected,
    selectedItems,
    move,
    selectedCount,
    canConfirm,
    columns,
    tableConfig,
    selectPage,
    remove,
    confirming,
    selectionError,
    history,
    chooseHistory,
    navigate,
    filters,
  } = props.state
  const source = computed(() => props.options.source)
  const initialValues = computed(() => props.options.initialValues)
  const panelContent = shallowRef<HTMLElement | null>(null)
  const C_Table = defineAsyncComponent({
    loader: () => import('../C_Table/index.vue'),
    loadingComponent: () => h('div', { role: 'status' }, t('table.loading')),
    errorComponent: () => h('div', { role: 'alert' }, t('picker.loadFailed')),
  })
  const C_Tree = defineAsyncComponent(() => import('../C_Tree/index.vue'))
  const captureTable = (instance: unknown) => {
    // Async loading/error views also receive refs. Only the real selection API owns restoration.
    const ready =
      instance !== null &&
      typeof instance === 'object' &&
      ['clearSelection', 'selectRow', 'unselectRow'].every(
        method => typeof Reflect.get(instance, method) === 'function'
      )
    props.state.setTable(ready ? (instance as TableInstance<T>) : null)
  }
  function searchOnEnter(event: KeyboardEvent) {
    if (!props.inline || event.isComposing) return
    event.preventDefault()
    event.stopPropagation()
    query()
  }
  const renderNavigation = () =>
    props.options.navigation?.render?.({
      value: navigationKeys.value[0],
      select: navigate,
      disabled:
        confirming.value ||
        !!props.options.disabled ||
        !!props.options.readonly,
      density: props.densityValue,
    })
  const navigationKeys = computed(() => {
    const field = props.options.navigation?.field
    const value =
      field && filters.value ? Reflect.get(filters.value, field) : undefined
    return typeof value === 'string' || typeof value === 'number' ? [value] : []
  })
  defineExpose({
    focus: () => {
      const first = panelContent.value?.querySelector<HTMLInputElement>(
        'input:not([type="hidden"])'
      )
      ;(first ?? panelContent.value)?.focus()
    },
  })
</script>

<style scoped lang="scss">
  @use './panel.scss';
</style>
