<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_WorkFlow,
    type User,
    type Department,
    type WorkflowPeopleOptions,
    type WorkflowData,
    type WorkflowExpose,
  } from '@robot-admin/naive-ui-components/C_WorkFlow'

  const directory: Department[] = [
    { id: 'root', name: '总部' },
    { id: 'team', name: '研发', parentId: 'root' },
  ]
  const records: User[] = [
    {
      id: 'A',
      name: '甲',
      department: '研发',
      departmentId: 'team',
      role: '成员',
    },
  ]
  const people: WorkflowPeopleOptions = {
    scope: 'company-A',
    source: {
      rowKey: 'id',
      label: row => row.name,
      request: async ({ filters, page, search, signal }) => {
        const id: string | number | undefined = filters?.departmentId
        page.toFixed()
        search.toUpperCase()
        signal.throwIfAborted()
        void id
        return { rows: records, total: records.length }
      },
      resolve: async (ids, signal) => {
        signal.throwIfAborted()
        return records.filter(row => ids.includes(row.id))
      },
    },
    organization: {
      data: directory,
      keyField: 'id',
      labelField: 'name',
      field: 'departmentId',
    },
    rowCheckable: row => row.role !== '停用',
    fixedFilters: { includeDescendants: true },
  }
  const invalid: WorkflowPeopleOptions = {
    // @ts-expect-error Workflow personnel use their stable string identity.
    source: {
      rowKey: () => 123,
      label: row => row.name,
      request: async () => ({ rows: records, total: records.length }),
    },
  }
  const definition = ref<WorkflowData>({ nodes: [], edges: [] })
  const workflow = ref<WorkflowExpose>()
  const legacy = ref<InstanceType<typeof C_WorkFlow>>()
  workflow.value?.validateWorkflow()
  legacy.value?.saveWorkflow()
  void invalid
</script>

<template>
  <C_WorkFlow
    ref="workflow"
    v-model="definition"
    :people="people"
  />
  <C_WorkFlow
    :users="records"
    :departments="directory"
    readonly
  />
</template>
