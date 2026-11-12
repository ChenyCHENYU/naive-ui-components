<script setup lang="ts">
  import { h, ref } from 'vue'
  import {
    C_Select,
    type OptionSource,
  } from '@robot-admin/naive-ui-components/C_Select'
  import {
    C_AutoComplete,
    type AutoCompleteProps,
  } from '@robot-admin/naive-ui-components/C_AutoComplete'

  interface Customer {
    id: number
    name: string
    email: string
  }
  const current = ref<number | null>(null)
  const multiple = ref<number[]>([])
  const text = ref('')
  const email = ref('')
  const source = {
    request: async () => ({
      rows: [{ id: 0, name: 'Same', email: 'a@example.test' }],
      total: 1,
    }),
    value: row => row.id,
    label: row => row.name,
  } satisfies OptionSource<Customer, number>
  const rendering: AutoCompleteProps<Customer> = {
    source,
    renderLabel: row => {
      // @ts-expect-error Source row does not have an unknown field.
      void row.missing
      return h('span', [row.name, h('small', row.email)])
    },
  }
  const invalidRendering: AutoCompleteProps<Customer> = {
    source,
    // @ts-expect-error A renderer cannot replace the entity contract.
    renderLabel: (row: { other: string }) => row.other,
  }
  void rendering
  void invalidRendering
  const local = [
    { value: 'Hello', label: 'Greeting', email: 'local@example.test' },
  ]
</script>
<template>
  <C_Select
    v-model="current"
    :source="source"
    @select="row => (email = row?.email ?? '')"
  />
  <C_Select
    v-model="multiple"
    :source="source"
    multiple
    @select="rows => (email = rows.map(row => row.email).join(','))"
  />
  <C_AutoComplete
    v-model="text"
    :source="source"
    :render-label="row => h('span', [row.name, h('small', row.email)])"
    @select="row => (email = row.email)"
  />
  <C_AutoComplete
    v-model="text"
    :options="local"
    @select="row => (email = row.email)"
  />
</template>
