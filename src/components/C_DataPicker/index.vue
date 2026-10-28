<template>
  <div class="c-data-picker">
    <div class="c-data-picker__trigger">
      <NButton
        class="c-data-picker__open"
        :size="density.size"
        :disabled="disabled"
        :aria-readonly="readonly"
        :title="display"
        @click="open"
      >
        <span :class="{ 'c-data-picker__placeholder': !display }">{{
          display || resolvedPlaceholder
        }}</span>
        <C_Icon
          name="mdi:magnify"
          :size="15"
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
        >×</NButton
      >
    </div>
    <span
      v-if="labels.status.value === 'error'"
      class="c-data-picker__label-error"
      role="status"
      >{{ t('picker.labelFailed') }}
      <NButton
        text
        size="tiny"
        @click="labels.reload"
        >{{ t('common.retry') }}</NButton
      ></span
    >
    <NModal
      :show="opened"
      preset="card"
      class="c-data-picker__modal"
      :title="resolvedTitle"
      :style="{ width: 'min(960px, calc(100vw - 24px))' }"
      @update:show="!$event && close()"
    >
      <form
        class="c-data-picker__search"
        @submit.prevent="query"
      >
        <NInput
          v-model:value="searchDraft"
          :size="density.size"
          :placeholder="t('picker.searchPlaceholder')"
          :input-props="{ 'aria-label': t('picker.searchLabel') }"
          clearable
        />
        <NButton
          attr-type="submit"
          :size="density.size"
          :loading="list.loading.value"
          type="primary"
          >{{ t('common.search') }}</NButton
        >
      </form>
      <div
        v-if="list.status.value === 'error'"
        class="c-data-picker__error"
        role="alert"
      >
        {{ t('picker.loadFailed') }}
        <NButton
          :size="density.size"
          @click="list.reload"
          >{{ t('common.retry') }}</NButton
        >
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
      <NPagination
        v-if="total > pageSize"
        v-model:page="page"
        :page-size="pageSize"
        :item-count="total"
        :size="density.size"
      />
      <div
        class="c-data-picker__selection"
        aria-live="polite"
      >
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
      <template #action>
        <div class="c-data-picker__actions">
          <NButton
            :size="density.size"
            @click="close"
            >{{ t('common.cancel') }}</NButton
          >
          <NButton
            type="primary"
            :size="density.size"
            :disabled="disabled || readonly"
            @click="confirm"
            >{{ t('common.confirm') }}</NButton
          >
        </div>
      </template>
    </NModal>
  </div>
</template>

<script setup lang="ts" generic="T extends object">
  import { computed, shallowRef } from 'vue'
  import { NButton, NInput, NModal, NPagination, NTag } from 'naive-ui'
  import C_Table from '../C_Table/index.vue'
  import C_Icon from '../C_Icon/index.vue'
  import type { TableInstance } from '../C_Table/types'
  import { resolveComponentDensity } from '../../core/density'
  import { useFormGlobalConfig } from '../C_Form/composables/useFormConfig'
  import { useComponentLocale } from '../../composables/useComponentLocale'
  import type { DataPickerProps, DataPickerEmits } from './types'
  import { useDataPicker } from './data'

  defineOptions({ name: 'C_DataPicker' })
  const props = withDefaults(defineProps<DataPickerProps<T>>(), {
    pageSize: 20,
  })
  const emit = defineEmits<DataPickerEmits<T>>()
  const tableRef = shallowRef<TableInstance<T> | null>(null)
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
    open,
    close,
    confirm,
    clear,
    page,
    pageSize,
    searchDraft,
    query,
    list,
    labels,
    rows,
    total,
    display,
    selected,
    selectedCount,
    columns,
    tableConfig,
    selectPage,
    remove,
  } = useDataPicker(props, emit, tableRef, () => resolvedDensity.value)
  defineExpose({ open, close })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
