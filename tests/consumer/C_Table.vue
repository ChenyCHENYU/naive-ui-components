<template>
  <C_Table :crud="crud" />
  <C_Table :crud="externalCrud" />
</template>

<script setup lang="ts">
import { h, type ComputedRef, type Ref } from 'vue'
import {
  C_Table,
  type CrudBinding,
  type DataRecord,
  type TableColumn,
} from '@robot-admin/naive-ui-components'

interface EmployeeRow {
  id: number
  profile: {
    name: string
  }
}

declare const crud: CrudBinding<EmployeeRow>

interface ExternalTableColumn<T> {
  key?: string
  title?: string
  render?: (row: T, index: number) => unknown
  [key: string]: unknown
}

declare const externalCrud: {
  data: Ref<EmployeeRow[]>
  loading: Ref<boolean>
  columns: ComputedRef<ExternalTableColumn<EmployeeRow>[]>
}

interface ChildRow extends DataRecord {
  id: number
  name: string
}

declare const childRows: ChildRow[]
declare const childColumns: TableColumn<ChildRow>[]

const childTableVNode = h(C_Table<ChildRow>, {
  data: childRows,
  columns: childColumns,
  rowKey: (row: ChildRow) => row.id,
})

void [externalCrud, childTableVNode]
</script>
