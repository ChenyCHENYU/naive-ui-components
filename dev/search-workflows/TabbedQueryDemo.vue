<script setup lang="ts">
  import { computed, ref } from 'vue'
  import {
    C_FormSearch,
    type SearchFormItem,
  } from '@robot-admin/naive-ui-components/C_FormSearch'
  import {
    C_Table,
    type TableColumn,
    type TableConfig,
  } from '@robot-admin/naive-ui-components/C_Table'
  import {
    C_Tabs,
    type TabsValue,
  } from '@robot-admin/naive-ui-components/C_Tabs'
  import { useTabbedQuery } from '@robot-admin/naive-ui-components/workflows'
  import {
    C_TaskPanel,
    type TaskPanelTask,
  } from '@robot-admin/naive-ui-components/C_TaskPanel'
  import '@robot-admin/naive-ui-components/C_FormSearch/style.css'
  import '@robot-admin/naive-ui-components/C_Table/base.css'
  import '@robot-admin/naive-ui-components/C_Tabs/style.css'
  import '@robot-admin/naive-ui-components/C_TaskPanel/style.css'

  interface Shipment {
    id: string
    warehouse: string
  }

  const tabs = [
    { key: 'pending', label: '待发运' },
    { key: 'shipped', label: '已发运' },
  ]
  const warehouses = ['华北仓', '华南仓', '华北仓', '华东仓', '华北仓']
  const rows = Object.fromEntries(
    tabs.map(({ key }, index) => [
      key,
      warehouses.map((warehouse, rowIndex) => ({
        id: `${index ? 'DONE' : 'WAIT'}-0${rowIndex + 1}`,
        warehouse,
      })),
    ])
  )
  const draft = ref({ warehouse: '' })
  const activeTab = ref<TabsValue | null>('pending')
  const requests = ref(0)
  const fields: SearchFormItem<typeof draft.value>[] = [
    {
      prop: 'warehouse',
      label: '仓库',
      type: 'input',
      placeholder: '输入仓库名称',
    },
  ]
  const columns: TableColumn<Shipment>[] = [
    { key: 'id', title: '发运单号' },
    { key: 'warehouse', title: '仓库' },
  ]

  const { data, loading, pagination, appliedQuery, setQuery, setPage } =
    useTabbedQuery({
      activeTab,
      initialQuery: draft.value,
      pageSize: 2,
      async request({ tab, query, page, pageSize }) {
        requests.value++
        const matches = (rows[tab] ?? []).filter(row =>
          row.warehouse.includes(query.warehouse.trim())
        )
        const start = (page - 1) * pageSize
        return {
          data: matches.slice(start, start + pageSize),
          total: matches.length,
        }
      },
    })

  const exportTasks = ref<TaskPanelTask[]>([])
  const tableConfig = computed<TableConfig<Shipment>>(() => ({
    pagination: {
      remote: true,
      showSizePicker: false,
      showQuickJumper: false,
      ...pagination.value,
    },
    export: {
      scopes: ['page', 'matching'],
      onExportMatching() {
        const criteria = appliedQuery.value
        if (!criteria) return
        const tab = tabs.find(item => item.key === activeTab.value)
        exportTasks.value = [
          {
            key: exportTasks.value.length + 1,
            title: `${tab?.label} · ${criteria.warehouse || '全部仓库'}`,
            status: 'queued',
          },
          ...exportTasks.value,
        ]
      },
    },
  }))
</script>

<template>
  <section aria-label="发运分页查询">
    <h2>发运分页查询</h2>
    <C_FormSearch
      v-model="draft"
      :form-item-list="fields"
      :loading="loading"
      :config="{ onSearch: setQuery }"
    />
    <C_Tabs
      v-model="activeTab"
      :items="tabs"
    >
      <template #pane="{ active }">
        <C_Table
          v-if="active"
          :data="data"
          :columns="columns"
          :loading="loading"
          :config="tableConfig"
          @pagination-change="setPage"
        />
      </template>
    </C_Tabs>
    <output data-testid="tabbed-query-summary">
      {{ appliedQuery?.warehouse || '全部仓库' }} · 请求 {{ requests }} 次
    </output>
    <C_TaskPanel
      v-if="exportTasks.length"
      :tasks="exportTasks"
      title="发运导出任务"
    />
  </section>
</template>

<style scoped>
  section {
    display: grid;
    gap: 8px;
    min-width: 0;
  }

  h2 {
    margin: 0;
    font-size: 18px;
  }
</style>
