<template>
  <C_Table :crud="crud" />
  <C_Table :crud="crud">
    <template #loading>
      <C_Loading
        :size="40"
        label="Loading records"
        color="#7080ff"
      />
    </template>
  </C_Table>
  <C_Table
    :crud="externalCrud"
    :config="{
      toolbar: {
        actions: [{ key: 'add', onClick: () => undefined }],
        rightActions: [{ key: 'refresh', onClick: () => undefined }],
      },
    }"
  />
  <C_Table
    :data="childRows"
    :columns="searchableColumns"
    :config="{ toolbar: { show: false }, pagination: false }"
  />
</template>

<script setup lang="ts">
  import { h, type ComputedRef, type Ref } from 'vue'
  import {
    C_Table,
    C_Loading,
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

  // 原生表格迁移后继续提供排序与筛选的强类型配置。
  const searchableColumns: TableColumn<ChildRow>[] = [
    {
      key: 'name',
      title: '姓名',
      sorter: 'default',
      filterOptions: [{ label: 'Chen', value: 'Chen' }],
      filter: (value, row) => row.name === value,
    },
  ]

  const childTableVNode = h(C_Table<ChildRow>, {
    data: childRows,
    columns: childColumns,
    rowKey: (row: ChildRow) => row.id,
  })

  void [externalCrud, childTableVNode]
</script>
