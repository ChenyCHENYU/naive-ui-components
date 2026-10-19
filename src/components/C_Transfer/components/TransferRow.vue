<template>
  <div
    class="c-transfer__item"
    :class="{ 'is-disabled': item.disabled, 'is-checked': checked }"
    @click="toggle"
  >
    <NCheckbox
      :checked="checked"
      :disabled="item.disabled"
      :aria-label="item.label"
      size="small"
      @update:checked="toggle"
      @click.stop
    />
    <C_Icon
      v-if="item.icon"
      :name="item.icon"
      class="c-transfer__item-icon"
    />
    <span class="c-transfer__item-label">{{ item.label }}</span>
  </div>
</template>

<script setup lang="ts">
  import { NCheckbox } from 'naive-ui'
  import C_Icon from '../../C_Icon/index.vue'
  import type { TransferItem } from '../types'
  const props = defineProps<{ item: TransferItem; checked: boolean }>()
  const emit = defineEmits<{ check: [key: string | number] }>()
  const toggle = () => {
    if (!props.item.disabled) emit('check', props.item.key)
  }
</script>

<style scoped lang="scss">
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
    color: var(--c-text-1, var(--text-color-1, #262626));

    &:hover {
      background: var(--tf-item-hover);
    }
    &.is-disabled {
      opacity: 0.45;
      cursor: not-allowed;
      &:hover {
        background: transparent;
      }
    }
    &.is-checked {
      color: var(--tf-accent);
      font-weight: 500;
    }
    &-icon {
      font-size: 16px;
      flex-shrink: 0;
      color: var(--c-text-3, var(--text-color-3, #a3a3a3));
    }
    &-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
