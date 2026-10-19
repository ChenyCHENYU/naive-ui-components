<template>
  <VVirtualList
    v-if="windowed"
    ref="virtualList"
    class="c-transfer__list c-transfer__list--virtual"
    :items="items"
    :item-size="itemHeight"
    :padding-top="4"
    :padding-bottom="4"
    :style="{
      height: `min(var(--tf-height), ${items.length * itemHeight + 8}px)`,
    }"
  >
    <template #default="{ item }">
      <TransferRow
        :item="item"
        :checked="checked.has(item.key)"
        @check="emit('check', $event)"
      />
    </template>
  </VVirtualList>
  <div
    v-else
    class="c-transfer__list"
  >
    <TransferRow
      v-for="item in items"
      :key="item.key"
      :item="item"
      :checked="checked.has(item.key)"
      @check="emit('check', $event)"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, shallowRef, watch } from 'vue'
  import { VVirtualList, type VVirtualListInst } from 'vueuc'
  import TransferRow from './TransferRow.vue'
  import type { TransferItem, TransferProps } from '../types'

  const props = defineProps<{
    items: TransferItem[]
    checked: ReadonlySet<string | number>
    size?: TransferProps['size']
    virtualScroll?: boolean
    query: string
  }>()
  const emit = defineEmits<{ check: [key: string | number] }>()
  const virtualList = shallowRef<VVirtualListInst>()
  const itemHeight = computed(() =>
    props.size === 'small' ? 28 : props.size === 'large' ? 40 : 34
  )
  const windowed = computed(
    () => props.virtualScroll !== false && props.items.length >= 100
  )
  watch(
    () => props.query,
    () => virtualList.value?.scrollTo({ top: 0 }),
    { flush: 'post' }
  )
</script>

<style scoped lang="scss">
  .c-transfer__list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
    min-height: 0;
    max-height: var(--tf-height);

    &--virtual {
      padding: 0;
    }
  }
</style>
