<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Transfer,
    type TransferColumn,
    type TransferItem,
    type TransferProps,
  } from '@robot-admin/naive-ui-components/C_Transfer'
  const selected = ref<Array<string | number>>([])
  const items: TransferItem[] = [
    { key: 0, label: 'Zero' },
    { key: 'disabled', label: 'Disabled', disabled: true },
  ]
  const virtualScroll: TransferProps['virtualScroll'] = false
  const devices = [
    {
      key: 1,
      label: 'Incoming scale',
      code: 'A-100',
      area: ['East', 'Warehouse'],
    },
  ]
  const deviceKeys = ref<number[]>([])
  const columns = [
    {
      key: 'code',
      title: 'Code',
      width: 120,
      format: device => device.code.toUpperCase(),
    },
    { key: 'label', title: 'Name' },
  ] satisfies TransferColumn<(typeof devices)[number]>[]
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
    v-model="deviceKeys"
    :data="devices"
    :columns="columns"
    :group-by="device => device.area"
    filterable
  />
  <C_Transfer
    v-model="selected"
    :data="items"
    :virtual-scroll="virtualScroll"
    size="small"
    style="--tf-height: 240px"
  />
</template>
