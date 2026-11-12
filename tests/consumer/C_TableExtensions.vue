<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Table,
    defineTableColumns,
    createTableSelectEditor,
    createTableAutoCompleteEditor,
    type TableColumn,
  } from '@robot-admin/naive-ui-components/C_Table'
  import type { OptionSource } from '@robot-admin/naive-ui-components/C_Select'
  interface Row {
    id: number
    qty: number
    customerId: number | null
    remark: string
    locked: boolean
  }
  interface Customer {
    id: number
    name: string
    creditCode: string
  }
  const rows = ref<Row[]>([])
  const source: OptionSource<Customer, number> = {
    request: async () => ({ rows: [], total: 0 }),
    value: row => row.id,
    label: row => row.name,
  }
  const columns = defineTableColumns<Row>([
    {
      type: 'group',
      title: '单据',
      children: [
        {
          key: 'qty',
          title: '数量',
          editable: row => !row.locked,
          editType: 'number',
          editProps: {
            precision: 3,
            format: value => (value == null ? '' : value.toFixed(3)),
            parse: text => Number(text),
          },
        },
        {
          key: 'customerId',
          title: '客户',
          editType: 'select',
          editProps: {
            source: row => ({ ...source, filters: { document: row.id } }),
          },
        },
      ],
    },
  ])
  const selectEditor = createTableSelectEditor({
    source,
    onSelect: customer => {
      const code: string | undefined = customer?.creditCode
      void code
      // @ts-expect-error Candidate fields are inferred from the source.
      void customer?.unknownCode
    },
  })
  const textEditor = createTableAutoCompleteEditor({
    source,
    renderLabel: row => `${row.name} ${row.creditCode}`,
    onSelect: row => {
      const { name } = row
      void name
    },
  })
  const extra: TableColumn<Row>[] = [
    { key: 'customerId', title: '客户', editRender: selectEditor },
    { key: 'remark', title: '备注', editRender: textEditor },
  ]
  void extra
  defineTableColumns<Row>([
    {
      type: 'group',
      title: '错误字段',
      children: [
        // @ts-expect-error Strict grouping retains business key checking.
        { key: 'missing', title: '错误' },
      ],
    },
  ])
</script>
<template>
  <C_Table
    :columns="columns"
    :data="rows"
    row-key="id"
    :config="{ edit: 'cell' }"
  />
</template>
