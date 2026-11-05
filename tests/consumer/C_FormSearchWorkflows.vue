<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_FormSearch,
    serializeSearch,
    type SearchFieldContext,
    type SearchFormItem,
    type SearchNumberRangeValue,
    type FormSearchExpose,
  } from '@robot-admin/naive-ui-components/C_FormSearch'
  interface Query {
    tenant: string
    amount: number | null
    bounds: SearchNumberRangeValue
    month: string | null
    enabled: boolean | null
    customer: string
  }
  const query = ref<Query>({
    tenant: '001',
    amount: 0,
    bounds: null,
    month: null,
    enabled: false,
    customer: '',
  })
  const search = ref<FormSearchExpose<Query>>()
  const fields: SearchFormItem<Query>[] = [
    { type: 'input', prop: 'tenant', fixed: true },
    { type: 'number', prop: 'amount', label: '金额' },
    {
      type: 'number-range',
      prop: 'bounds',
      label: '范围',
      span: 2,
      query: { keys: ['lower', 'upper'] },
    },
    { type: 'month', prop: 'month', label: '月份', valueMode: 'formatted' },
    {
      type: 'select',
      prop: 'enabled',
      label: '状态',
      list: [
        { value: false, label: '停用' },
        { value: true, label: '启用' },
      ],
    },
    {
      type: 'custom',
      prop: 'customer',
      label: '客户',
      slot: 'customer',
      defaultValue: '',
      render: ({ prop, value, updateValue }) => {
        const customerField: 'customer' = prop
        updateValue(value.toUpperCase())
        // @ts-expect-error The customer field only accepts strings.
        updateValue(42)
        return customerField
      },
    },
  ]
  const legacyField = {
    type: 'custom',
    prop: 'customer',
    defaultValue: '',
    render: ({ model, updateValue }: SearchFieldContext<Query>) => {
      updateValue(model.customer)
      return null
    },
  } satisfies SearchFormItem<Query>
  const dynamicField = {
    type: 'custom',
    prop: 'status',
    render: ({ value, updateValue }) => {
      updateValue(true)
      // @ts-expect-error An open model does not declare the field's value type.
      value.toUpperCase()
      return null
    },
  } satisfies SearchFormItem
  void [legacyField, dynamicField]
  const execute = (params: Query) =>
    Promise.resolve(serializeSearch(params, fields))
  search.value?.appliedParams?.tenant.toUpperCase()
  search.value?.hasUnappliedChanges.valueOf()
</script>
<template>
  <C_FormSearch
    ref="search"
    v-model="query"
    :form-item-list="fields"
    :config="{
      density: 'compact',
      layout: 'grid',
      labelPlacement: 'left',
      labelWidth: 80,
      onSearch: execute,
    }"
  >
    <template #customer="{ value, model, disabled, updateValue }">
      <button
        type="button"
        :disabled="disabled"
        @click="updateValue(model.customer)"
        >{{ value }}</button
      >
    </template>
  </C_FormSearch>
</template>
