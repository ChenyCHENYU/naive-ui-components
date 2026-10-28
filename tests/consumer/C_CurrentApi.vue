<script setup lang="ts">
  import { provide, ref } from 'vue'
  import {
    FORM_GLOBAL_CONFIG_KEY,
    type FormConfig,
  } from '@robot-admin/naive-ui-components/config'
  import { C_Date } from '@robot-admin/naive-ui-components/C_Date'
  import { C_FormSearch } from '@robot-admin/naive-ui-components/C_FormSearch'
  import { C_Menu } from '@robot-admin/naive-ui-components/C_Menu'
  import {
    createFormRendererRegistry,
    FORM_RENDERER_REGISTRY_KEY,
  } from '@robot-admin/naive-ui-components/C_Form'
  import {
    C_Table,
    defineTableConfig,
  } from '@robot-admin/naive-ui-components/C_Table'

  const date = ref<string | null>(null)
  const formDefaults: FormConfig = { density: 'compact' }
  provide(FORM_GLOBAL_CONFIG_KEY, formDefaults)
  const period = ref<[string, string] | null>(null)
  const query = ref({ keyword: '' })
  const selected = ref<number | null>(1)
  const loadRows = (keyword: string) => Promise.resolve({ items: [keyword] })
  const registry = createFormRendererRegistry()
  provide(FORM_RENDERER_REGISTRY_KEY, registry)

  interface Member {
    id: number
    name: string
  }
  const config = defineTableConfig<Member>({
    edit: 'cell',
    selection: true,
    density: 'compact',
  })
</script>

<template>
  <C_Date v-model="date" />
  <C_Date
    v-model="period"
    mode="daterange"
  />
  <C_FormSearch
    v-model="query"
    :form-item-list="[{ type: 'input', prop: 'keyword' }]"
    :config="{ onSearch: params => loadRows(params.keyword.trim()) }"
  />
  <C_Menu
    v-model="selected"
    :options="[{ key: 1, label: '首页' }]"
  />
  <C_Table
    :data="[{ id: 1, name: 'Ada' }]"
    :columns="[{ key: 'name', title: '姓名' }]"
    :config="config"
  />
</template>
