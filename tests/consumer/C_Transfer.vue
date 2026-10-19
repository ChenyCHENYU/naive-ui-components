<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Transfer,
    type TransferItem,
    type TransferProps,
  } from '@robot-admin/naive-ui-components/C_Transfer'
  const selected = ref<Array<string | number>>([])
  const items: TransferItem[] = [
    { key: 0, label: 'Zero' },
    { key: 'disabled', label: 'Disabled', disabled: true },
  ]
  const virtualScroll: TransferProps['virtualScroll'] = false
  const onChange = (
    keys: Array<string | number>,
    direction: 'left' | 'right',
    moved: Array<string | number>
  ) => {
    void keys
    void direction
    void moved
  }
</script>

<template>
  <C_Transfer
    v-model="selected"
    :data="items"
    filterable
    @change="onChange"
  />
  <C_Transfer
    v-model="selected"
    :data="items"
    :virtual-scroll="virtualScroll"
    size="small"
    style="--tf-height: 240px"
  />
</template>
