<template>
  <div
    v-if="entry.kind === 'group'"
    class="c-transfer__group-row"
    :role="columns ? 'row' : undefined"
  >
    <div
      class="c-transfer__group-cell"
      :style="indent"
      :role="columns ? 'cell' : undefined"
      :aria-colspan="columns ? columns.length + 1 : undefined"
    >
      <span v-if="!expandable">{{ entry.label }}</span>
      <button
        v-else
        type="button"
        :aria-expanded="entry.expanded"
        @click="emit('expand', entry.key)"
      >
        <C_Icon
          :name="entry.expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'"
        />
        {{ entry.label }}
      </button>
    </div>
  </div>
  <div
    v-else-if="item"
    class="c-transfer__item"
    :class="{
      'is-disabled': item.disabled,
      'is-checked': selected,
      'is-locked': locked,
      'is-table': columns,
    }"
    :style="columns ? undefined : indent"
    :role="columns ? 'row' : undefined"
    @click="toggle"
  >
    <span
      class="c-transfer__item-check"
      :role="columns ? 'cell' : undefined"
    >
      <NCheckbox
        :checked="selected"
        :disabled="locked || item.disabled"
        :aria-label="item.label"
        :size="size"
        @update:checked="toggle"
        @click.stop
      />
    </span>
    <template v-if="columns">
      <span
        v-for="cell in cells"
        :key="cell.key"
        class="c-transfer__item-label"
        role="cell"
        :title="cell.text"
        >{{ cell.text }}</span
      >
    </template>
    <template v-else>
      <C_Icon
        v-if="item.icon"
        :name="item.icon"
        class="c-transfer__item-icon"
      />
      <span class="c-transfer__item-label">{{ item.label }}</span>
    </template>
  </div>
</template>

<script setup lang="ts" generic="T extends TransferItem">
  import { computed } from 'vue'
  import { NCheckbox } from 'naive-ui'
  import C_Icon from '../../C_Icon/index.vue'
  import type { TransferColumn, TransferItem, TransferProps } from '../types'
  import { transferCellText, type TransferEntry } from '../transferPresentation'
  const props = defineProps<{
    entry: TransferEntry<T>
    checked: ReadonlySet<T['key']>
    locked?: boolean
    size?: TransferProps['size']
    columns?: readonly TransferColumn<T>[]
    expandable: boolean
  }>()
  const emit = defineEmits<{ check: [key: T['key']]; expand: [key: string] }>()
  const item = computed(() =>
    props.entry.kind === 'item' ? props.entry.item : undefined
  )
  const selected = computed(
    () => !!item.value && props.checked.has(item.value.key)
  )
  const indent = computed(() =>
    props.entry.depth > 0
      ? {
          paddingInlineStart: `calc(var(--tf-item-padding) + ${props.entry.depth * 12}px)`,
        }
      : undefined
  )
  const cells = computed(() => {
    const row = item.value
    return row
      ? props.columns?.map(column => ({
          key: column.key,
          text: transferCellText(row, column),
        }))
      : []
  })
  function toggle() {
    const row = item.value
    if (row && !props.locked && !row.disabled) emit('check', row.key)
  }
</script>

<style scoped lang="scss">
  .c-transfer__group-cell {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--tf-item-height);
    padding-inline: var(--tf-item-padding);
    font-size: var(--tf-item-font-size);
    font-weight: 600;
    color: var(--c-text-2, var(--c-theme-text-2, #525252));

    button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 100%;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
  }

  .c-transfer__item {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: var(--tf-item-height);
    gap: 8px;
    padding: 0 var(--tf-item-padding);
    cursor: pointer;
    transition: background 0.15s;
    font-size: var(--tf-item-font-size);
    color: var(--c-text-1, var(--c-theme-text-1, #262626));

    &.is-table {
      display: grid;
      grid-template-columns: var(--tf-columns);
    }
    &:hover {
      background: var(--tf-item-hover);
    }
    &.is-disabled,
    &.is-locked {
      cursor: not-allowed;
      &:hover {
        background: transparent;
      }
    }
    &.is-disabled {
      opacity: 0.45;
    }
    &.is-checked {
      color: var(--tf-accent);
      font-weight: 500;
    }
    &-icon {
      font-size: 16px;
      flex-shrink: 0;
      color: var(--c-text-3, var(--c-theme-text-3, #a3a3a3));
    }
    &-check {
      display: inline-flex;
    }
    &-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
