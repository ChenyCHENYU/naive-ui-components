<script setup lang="ts">
  import {
    C_ActionBar,
    defineActions,
    type ActionDropdownItem,
  } from '@robot-admin/naive-ui-components/C_ActionBar'
  import { C_Form, useCForm } from '@robot-admin/naive-ui-components/C_Form'
  import {
    C_Table,
    type TableConfig,
    type TableProps,
  } from '@robot-admin/naive-ui-components/C_Table'

  interface Employee {
    id: number
    name: string
  }
  const saveEmployee = async (employee: Employee) => employee
  const form = useCForm({
    initialValues: { id: 1, name: '' },
    options: [{ type: 'input', prop: 'name' }],
    config: { onSubmit: ({ model }) => saveEmployee(model) },
  })
  const actions = defineActions([
    { key: 'save', onClick: form.submit },
    { key: 'reset', onClick: () => true },
  ])
  const { formRef, bindings } = form
  const dropdown: ActionDropdownItem = {
    key: 'save',
    label: 'Save',
    onClick: form.submit,
  }
  const config: TableConfig<Employee> = {
    edit: { onSave: saveEmployee, onCancel: () => false },
    actions: {
      custom: [
        { key: 'save', label: 'Save', icon: 'save', onClick: saveEmployee },
      ],
    },
    error: { onRetry: () => saveEmployee(form.model.value) },
    batchActions: {
      actions: [
        {
          key: 'save',
          label: 'Save',
          onClick: (_keys, rows) => Promise.all(rows.map(saveEmployee)),
        },
      ],
    },
  }
  const unsupportedHeight: TableProps<Employee> = {
    // @ts-expect-error 高度需放在 config.display，原生同名属性被内部绑定覆盖。
    maxHeight: 400,
  }
  void unsupportedHeight
  const props: TableProps<Employee> = {
    data: [form.model.value],
    columns: [{ key: 'name', title: 'Name' }],
    config,
    size: 'small',
    minHeight: 100,
    onSave: saveEmployee,
    'onSelection-change': (_keys, rows) => rows.map(employee => employee.name),
  }
  const oldProps: TableProps<Employee> = {
    // @ts-expect-error 编辑功能应通过 config.edit 配置。
    editable: true,
  }
  const oldExpand: TableProps<Employee> = {
    // @ts-expect-error 旧展开数据入口不再混入当前主契约。
    onLoadExpandData: async () => [],
  }
  const oldSelection: TableProps<Employee> = {
    // @ts-expect-error 选择功能应通过 config.selection 配置。
    enableSelection: true,
  }
  const wrongRow: TableConfig<Employee> = {
    edit: {
      // @ts-expect-error 返回值可忽略，输入仍必须是实际业务模型。
      onSave: (employee: { id: string }) => Promise.resolve(employee),
    },
  }
  void [dropdown, oldProps, oldExpand, oldSelection, wrongRow]
</script>

<template>
  <C_Form
    ref="formRef"
    v-bind="bindings"
  />
  <C_ActionBar :actions="actions" />
  <C_Table v-bind="props" />
</template>
