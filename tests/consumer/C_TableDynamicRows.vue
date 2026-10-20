<script setup lang="ts">
  import { shallowRef } from 'vue'
  import {
    C_Table,
    useDynamicRows,
    type TableConfig,
    type DynamicRowsOptions,
    type DataRecord,
  } from '@robot-admin/naive-ui-components/C_Table'
  interface Employee {
    id: number
    name: string
  }
  const employees = shallowRef<Employee[]>([{ id: 1, name: 'Original' }])
  let nextId = 1
  const dynamic: DynamicRowsOptions<Employee> = {
    defaultRowData: source => ({ id: ++nextId, name: source?.name ?? 'New' }),
  }
  const config: TableConfig<Employee> = { dynamicRows: dynamic }
  const disabled: TableConfig<Employee> = { dynamicRows: false }
  const legacy: TableConfig = { dynamicRows: true }
  const legacyRows = shallowRef<DataRecord[]>([])
  // @ts-expect-error Concrete business models need a complete row factory.
  const noFactory: TableConfig<Employee> = { dynamicRows: true }
  const noObjectFactory: TableConfig<Employee> = {
    // @ts-expect-error An object configuration must also supply the row factory.
    dynamicRows: { enableCopy: true },
  }
  const partialFactory: DynamicRowsOptions<Employee> = {
    // @ts-expect-error Factory results must contain every required business field.
    defaultRowData: () => ({ id: 2 }),
  }
  const checkHooks = () => {
    useDynamicRows(employees, dynamic)
    useDynamicRows(legacyRows)
    // @ts-expect-error Direct composable use has the same concrete-model requirement.
    useDynamicRows(employees)
    // @ts-expect-error Passing other options cannot bypass the factory requirement.
    useDynamicRows(employees, { rowKey: 'id' })
  }
  const acceptEmployee = (row: Employee) => {
    row.id.toFixed()
    row.name.toUpperCase()
  }
  void [
    disabled,
    legacy,
    noFactory,
    noObjectFactory,
    partialFactory,
    checkHooks,
  ]
</script>
<template>
  <C_Table
    :data="employees"
    :columns="[{ key: 'name', title: 'Name' }]"
    :config="config"
    @row-add="acceptEmployee"
  />
  <C_Table
    :data="employees"
    :columns="[{ key: 'name', title: 'Name' }]"
    :config="disabled"
  />
  <!-- @vue-expect-error Template inputs cannot turn concrete business rows into empty drafts. -->
  <C_Table
    :data="employees"
    :columns="[{ key: 'name', title: 'Name' }]"
    :config="{ dynamicRows: true }"
  />
</template>
