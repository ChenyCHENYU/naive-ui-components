<template>
  <section
    class="c-batch-result"
    :aria-label="resolvedTitle"
  >
    <header class="c-batch-result__header">
      <strong>{{ resolvedTitle }}</strong>
      <span role="status">{{
        t('batch.summary', {
          total: counts.all,
          success: counts.success,
          failure: counts.failure,
          conflict: counts.conflict,
          skipped: counts.skipped,
        })
      }}</span>
    </header>
    <div class="c-batch-result__toolbar">
      <NSelect
        v-model:value="filter"
        :options="options"
        size="small"
        :aria-label="t('batch.filterLabel')"
      />
      <NButton
        size="small"
        :disabled="!retryKeys.length"
        @click="emit('retry', [...retryKeys])"
        >{{ t('batch.retry', { count: retryKeys.length }) }}</NButton
      >
    </div>
    <C_Table
      :data="rows"
      :columns="columns"
      row-key="key"
      :config="tableConfig"
    />
    <NPagination
      v-if="filtered.length > pageSize"
      v-model:page="page"
      :page-size="pageSize"
      :item-count="filtered.length"
      size="small"
    />
  </section>
</template>

<script setup lang="ts">
  import { h, computed } from 'vue'
  import { NButton, NSelect, NTag, NPagination } from 'naive-ui'
  import C_Table from '../C_Table/index.vue'
  import type { TableColumn, TableConfig } from '../C_Table'
  import type { BatchOperationResult } from '../../core/batchPatch'
  import type { BatchResultProps, BatchResultEmits } from './types'
  import { useBatchResults } from './data'

  defineOptions({ name: 'C_BatchResult' })
  const props = withDefaults(defineProps<BatchResultProps>(), {
    pageSize: 20,
  })
  const emit = defineEmits<BatchResultEmits>()
  const {
    filter,
    page,
    pageSize,
    counts,
    options,
    filtered,
    rows,
    retryKeys,
    t,
  } = useBatchResults(props)
  const resolvedTitle = computed(() => props.title ?? t('batch.title'))
  const colors = {
    success: 'success',
    failure: 'error',
    conflict: 'warning',
    skipped: 'default',
  } as const
  const columns = computed<TableColumn<BatchOperationResult>[]>(() => [
    { key: 'key', title: t('batch.id'), minWidth: 130 },
    {
      key: 'status',
      title: t('batch.status'),
      width: 90,
      render: row =>
        h(
          NTag,
          { size: 'small', type: colors[row.status] },
          { default: () => t(`batch.${row.status}`) }
        ),
    },
    { key: 'message', title: t('batch.message'), minWidth: 220 },
    {
      key: 'retryable',
      title: t('batch.retryColumn'),
      width: 90,
      render: row =>
        row.retryable && (row.status === 'failure' || row.status === 'conflict')
          ? t('batch.retryable')
          : '—',
    },
  ])
  const tableConfig = computed<TableConfig<BatchOperationResult>>(() => ({
    locale: props.locale,
    density: 'compact',
    pagination: false,
    toolbar: { show: false },
    display: { singleLine: false },
    virtualScroll: { enabled: true, maxHeight: 420 },
  }))
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
