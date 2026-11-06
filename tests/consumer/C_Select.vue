<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Select,
    type SelectOptionItem,
  } from '@robot-admin/naive-ui-components/C_Select'

  const single = ref<number | null>(null)
  const chosen = ref<string[]>([])
  const status = ref<Array<number | boolean>>([0, false])
  const statusOptions: SelectOptionItem<number | boolean>[] = [
    { label: '待处理', value: 0 },
    { label: '停用', value: false },
  ]
</script>

<template>
  <C_Select
    v-model="single"
    :options="[{ label: '待处理', value: 0 }]"
  />
  <C_Select
    v-model="chosen"
    multiple
    filterable
    tag
  />
  <C_Select
    v-model="status"
    :options="statusOptions"
    multiple
  />
</template>
