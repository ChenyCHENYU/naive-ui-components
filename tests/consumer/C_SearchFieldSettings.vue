<template>
  <C_FormSearch
    v-model="query"
    v-model:visible-fields="visible"
    :form-item-list="fields"
    :config="config"
  />
  <C_Select
    v-model="enabled"
    :options="options"
    @select="row => row?.label.toUpperCase()"
  />
</template>
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_FormSearch,
    serializeSearch,
    type SearchConfig,
    type SearchFormItem,
  } from '@robot-admin/naive-ui-components/C_FormSearch'
  import {
    C_Select,
    type SelectOptionNode,
  } from '@robot-admin/naive-ui-components/C_Select'

  interface Query {
    keyword: string
    department: number[]
    region: number | null
  }
  const query = ref<Query>({ keyword: '', department: [], region: null })
  const visible = ref<Array<keyof Query>>(['keyword'])
  const fields: SearchFormItem<Query>[] = [
    { type: 'input', prop: 'keyword' },
    {
      type: 'treeSelect',
      prop: 'department',
      attrs: { multiple: true },
      list: [{ key: 0, label: 'HQ' }],
    },
    {
      type: 'cascader',
      prop: 'region',
      list: [
        { value: 0, label: 'Root', children: [{ value: 1, label: 'Branch' }] },
      ],
    },
  ]
  const config: SearchConfig<Query> = {
    fieldSettings: {
      lockedKeys: ['keyword'],
      persistKey: 'consumer:query',
      scope: 'factory-a',
    },
    onSearch: model => {
      serializeSearch(model, fields, {
        scope: 'active',
        visibleFields: visible.value,
      })
    },
  }
  const enabled = ref<boolean | null>(false)
  const options: SelectOptionNode<boolean>[] = [
    {
      type: 'group',
      label: 'State',
      children: [
        { value: false, label: 'Disabled' },
        { value: true, label: 'Enabled' },
      ],
    },
  ]
</script>
