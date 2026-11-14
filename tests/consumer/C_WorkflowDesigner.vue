<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_WorkFlow,
    type Condition,
    type WorkflowConditionField,
    type WorkflowData,
    type WorkflowExpose,
    type WorkflowSlots,
  } from '@robot-admin/naive-ui-components/C_WorkFlow'

  const condition: Condition = {
    id: 'amount',
    name: '大额',
    field: 'amount',
    operator: 'greater_than',
    value: '100',
    targetNodeId: 'approval',
    priority: 0,
  }
  condition.value.trim()
  const fields: WorkflowConditionField[] = [
    {
      key: 'amount',
      label: '申请金额',
      type: 'number',
      operators: ['equals', 'greater_than'],
    },
  ]
  const invalidField: WorkflowConditionField = {
    key: 'x',
    label: 'x',
    // @ts-expect-error Operators keep the existing finite public vocabulary.
    operators: ['exec'],
  }
  // @ts-expect-error Values stay strings for existing consumers.
  const invalidCondition: Condition = { ...condition, value: 1 }
  const workflow = ref<WorkflowExpose>()
  const definition = ref<WorkflowData>({ nodes: [], edges: [] })
  const slots: WorkflowSlots = {
    node: ({ node }) =>
      node.type === 'approval'
        ? node.data.approvers?.map(user => user.name).join(',')
        : node.data.title,
  }
  workflow.value?.getCurrentWorkflowData().nodes.forEach(node => {
    if (node.type === 'condition')
      node.data.conditions?.forEach(item => item.value.trim())
  })
  void [slots, invalidField, invalidCondition]
</script>

<template>
  <C_WorkFlow
    ref="workflow"
    v-model="definition"
    :condition-fields="fields"
    :allowed-node-types="['approval', 'copy', 'condition']"
    :allow-cycles="false"
  >
    <template #node="{ node, readonly, edit, remove }">
      <div>
        {{ node.data.title }}
        <span v-if="node.type === 'condition'">{{
          node.data.conditions?.[0]?.value.trim()
        }}</span>
        <button
          v-if="!readonly"
          @click.stop="edit"
          >配置</button
        >
        <button
          v-if="!readonly && node.type !== 'start'"
          @click.stop="remove"
          >移除</button
        >
      </div>
    </template>
  </C_WorkFlow>
</template>
