<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Table,
    defineTableColumns,
  } from '@robot-admin/naive-ui-components/C_Table'

  interface Measurement {
    id: string
    S: string
    C: string
    locked: boolean
  }
  const rows = ref<Measurement[]>([
    { id: 'sample-1', S: '0.01000', C: '', locked: false },
  ])
  const columns = defineTableColumns<Measurement>([
    {
      key: 'S',
      title: 'S',
      editType: 'input',
      editable: row => !row.locked,
    },
    {
      key: 'C',
      title: 'C',
      editType: 'input',
      editProps: { clearable: true },
    },
  ])

  defineTableColumns<Measurement>([
    // @ts-expect-error 业务列键继续受模型约束。
    {
      key: 'missing',
      title: '无效字段',
    },
  ])
</script>

<template>
  <C_Table
    v-model:data="rows"
    :columns="columns"
    :config="{ edit: 'inline', density: 'compact', pagination: false }"
    row-key="id"
  />
</template>
