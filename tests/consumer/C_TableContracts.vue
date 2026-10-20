<template>
  <C_Table
    :data="employees"
    :columns="columns"
    :config="config"
    row-key="id"
    @save="row => acceptEmployee(row)"
    @selection-change="(_keys, rows) => rows.forEach(acceptEmployee)"
    @row-add="row => acceptEmployee(row)"
    @child-selection-change="
      (_parent, _keys, rows) => rows.forEach(acceptChild)
    "
  />
  <!-- @vue-expect-error Wrong row keys must fail at the component boundary. -->
  <C_Table
    :data="employees"
    :columns="columns"
    row-key="idd"
  />
  <!-- @vue-expect-error A save handler must accept the actual business row. -->
  <C_Table
    :data="employees"
    :columns="columns"
    @save="wrongSave"
  />
</template>

<script setup lang="ts">
  import {
    C_Table,
    defineTableColumns,
    defineTableConfig,
    type TableProps,
    type TableInstance,
  } from '@robot-admin/naive-ui-components/C_Table'

  interface Employee {
    id: number
    name: string
    age: number
  }
  interface Child {
    id: number
    title: string
  }
  const employees: Employee[] = [{ id: 1, name: 'Chen', age: 20 }]
  const columns = defineTableColumns<Employee>([
    { key: 'name', title: 'Name', render: row => row.name.toUpperCase() },
  ])
  const config = defineTableConfig<Employee, Child>({
    expand: {
      onLoadData: row => [{ id: row.id, title: row.name }],
      renderContent: (_row, children, _loading, selection) => {
        selection?.selectedKeys.map(key => String(key))
        return children[0]?.title.toUpperCase()
      },
    },
    selection: {
      childSelection: { childRowCheckable: child => child.title.length > 0 },
    },
    edit: {
      onSave: row => {
        row.age.toFixed()
      },
    },
  })
  const props: TableProps<Employee, Child> = {
    data: employees,
    columns,
    config,
  }
  const acceptEmployee = (row: Employee) => row.name.toUpperCase()
  const acceptChild = (row: Child) => row.title.toUpperCase()
  const wrongSave = (row: { name: number }) => row.name.toFixed()

  type ComponentProps = Parameters<typeof C_Table<Employee, Child>>[0]
  type IsAny<T> = 0 extends 1 & T ? true : false
  type Assert<T extends true> = T
  type SaveRow = Parameters<NonNullable<ComponentProps['onSave']>>[0]
  type SaveRowIsTyped = Assert<IsAny<SaveRow> extends false ? true : false>
  type Exposed = Parameters<
    NonNullable<Parameters<typeof C_Table<Employee, Child>>[2]>
  >[0]
  declare const inferredInstance: Exposed
  const publicInstance: TableInstance<Employee, Child> = inferredInstance
  const { name }: { name: string } = inferredInstance.getSelectedRows()[0]
  const { title }: { title: string } =
    inferredInstance.getChildSelectedRows(1)[0]
  const editingName: string | undefined =
    inferredInstance.getEditingData()?.name
  const managedName: string | undefined = inferredInstance
    .getManager()
    .edit.getEditingData()?.name
  const saveRowIsTyped: SaveRowIsTyped = true
  void [
    props,
    publicInstance,
    name,
    title,
    editingName,
    managedName,
    saveRowIsTyped,
  ]
</script>
