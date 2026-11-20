<template>
  <div
    class="c-transfer__viewport"
    :class="{ 'c-transfer__viewport--table': table }"
    :role="table ? 'table' : undefined"
    :aria-label="table ? title : undefined"
    :style="gridStyle"
  >
    <div
      v-if="table"
      role="rowgroup"
    >
      <div
        class="c-transfer__columns"
        role="row"
      >
        <span
          role="columnheader"
          :aria-label="title"
        />
        <span
          v-for="column in columns"
          :key="column.key"
          role="columnheader"
        >
          {{ column.title }}
        </span>
      </div>
    </div>
    <VVirtualList
      v-if="windowed"
      ref="virtualList"
      class="c-transfer__list c-transfer__list--virtual"
      :role="table ? 'rowgroup' : undefined"
      :items="entries"
      :item-size="itemHeight"
      :padding-top="4"
      :padding-bottom="4"
      :style="{
        height: `min(var(--tf-height), ${entries.length * itemHeight + 8}px)`,
      }"
    >
      <template #default="{ item }">
        <TransferRow
          :entry="ensureTransferEntry(item)"
          :checked="checked"
          :locked="locked"
          :size="size"
          :columns="table ? columns : undefined"
          :expandable="!searching && !disabled"
          @check="emit('check', $event)"
          @expand="toggleGroup"
        />
      </template>
    </VVirtualList>
    <div
      v-else
      class="c-transfer__list"
      :role="table ? 'rowgroup' : undefined"
    >
      <TransferRow
        v-for="entry in entries"
        :key="entry.key"
        :entry="ensureTransferEntry(entry)"
        :checked="checked"
        :locked="locked"
        :size="size"
        :columns="table ? columns : undefined"
        :expandable="!searching && !disabled"
        @check="emit('check', $event)"
        @expand="toggleGroup"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends TransferItem">
  import { computed, shallowReactive, shallowRef, watch } from 'vue'
  import type { VVirtualListInst } from 'vueuc'
  import { VVirtualList } from '../../../utils/virtualList'
  import TransferRow from './TransferRow.vue'
  import type { TransferColumn, TransferItem, TransferProps } from '../types'
  import { ensureTransferEntry, transferEntries } from '../transferPresentation'

  const props = defineProps<{
    items: T[]
    checked: ReadonlySet<T['key']>
    size?: TransferProps['size']
    virtualScroll?: boolean
    locked?: boolean
    disabled?: boolean
    query: string
    title?: string
    columns?: readonly TransferColumn<T>[]
    groupBy?: (item: T) => readonly string[]
  }>()
  const emit = defineEmits<{ check: [key: string | number] }>()
  const collapsed = shallowReactive(new Set<string>())
  const expanded = new Set<string>()
  const virtualList = shallowRef<VVirtualListInst>()
  const searching = computed(() => props.query.trim() !== '')
  const entries = computed(() =>
    props.groupBy
      ? transferEntries(
          props.items,
          props.groupBy,
          searching.value ? expanded : collapsed
        )
      : props.items
  )
  const itemHeight = computed(() =>
    props.size === 'small' ? 28 : props.size === 'large' ? 40 : 34
  )
  const windowed = computed(
    () => props.virtualScroll !== false && entries.value.length >= 100
  )
  const table = computed(() => Boolean(props.columns?.length))
  const gridStyle = computed(() => {
    if (!table.value) return undefined
    const columns = (props.columns ?? []).map(({ width }) =>
      width !== undefined && Number.isFinite(width) && width > 0
        ? Math.ceil(width)
        : undefined
    )
    return {
      '--tf-columns': [
        '20px',
        ...columns.map(width => (width ? `${width}px` : 'minmax(72px, 1fr)')),
      ].join(' '),
      '--tf-min-table-width': `${columns.reduce<number>((total, width) => total + (width ?? 72) + 8, 20)}px`,
    }
  })
  function toggleGroup(key: string) {
    if (props.disabled || searching.value) return
    if (collapsed.has(key)) collapsed.delete(key)
    else collapsed.add(key)
  }
  watch(
    () => props.query,
    () => virtualList.value?.scrollTo({ top: 0 }),
    { flush: 'post' }
  )
</script>

<style scoped lang="scss">
  .c-transfer__viewport {
    flex: 1;
    min-width: 0;
    min-height: 0;

    &--table {
      overflow-x: auto;
      > * {
        min-width: calc(var(--tf-min-table-width) + 2 * var(--tf-item-padding));
      }
    }
  }

  .c-transfer__columns {
    display: grid;
    grid-template-columns: var(--tf-columns);
    align-items: center;
    gap: 8px;
    min-height: var(--tf-item-height);
    padding-inline: var(--tf-item-padding);
    background: var(--tf-header-bg);
    border-bottom: 1px solid var(--tf-border);
    font-size: var(--tf-item-font-size);
    font-weight: 600;
    color: var(--c-text-1, var(--c-theme-text-1, #262626));

    > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .c-transfer__list {
    overflow-y: auto;
    padding: 4px 0;
    max-height: var(--tf-height);

    &--virtual {
      padding: 0;
    }
  }
</style>
