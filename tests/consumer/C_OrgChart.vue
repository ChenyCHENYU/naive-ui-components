<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_OrgChart,
    type OrgChartNode,
    type OrgChartKey,
    type OrgChartProps,
    type OrgChartSlots,
    type OrgChartEmits,
    type OrgChartExpose,
  } from '@robot-admin/naive-ui-components/C_OrgChart'

  interface Department {
    code: number
    title: string
    leader: string
    portrait?: string
    headcount: number
    units?: Department[]
  }
  const department: Department = {
    code: 0,
    title: '研发中心',
    leader: '负责人',
    headcount: 12,
    units: [{ code: 1, title: '平台部', leader: '张经理', headcount: 6 }],
  }
  const legacy: OrgChartNode = {
    id: 0,
    label: '总部',
    children: [{ id: 1, label: '团队' }],
  }
  const chart = ref<OrgChartExpose<Department>>()
  const legacyRef = ref<InstanceType<typeof C_OrgChart>>()
  legacyRef.value?.zoomIn()
  const legacyNode: OrgChartNode | null = legacyRef.value?.getNode(0) ?? null
  void legacyNode
  const selected = ref<OrgChartKey | null>(0)
  const expanded = ref<OrgChartKey[]>([0])
  const props: OrgChartProps<Department> = {
    data: department,
    keyField: 'code',
  }
  const wrong: OrgChartProps<Department> = {
    data: department,
    // @ts-expect-error Field names retain the actual business schema.
    keyField: 'missing',
  }
  const slots: OrgChartSlots<Department> = {
    node: ({ node, isSelected, select }) => {
      node.headcount.toFixed()
      // @ts-expect-error Numeric business properties are not strings.
      node.headcount.toUpperCase()
      void isSelected
      void select
      return node.leader
    },
  }
  function inspect(node: Department) {
    node.headcount.toFixed()
  }
  function change(key: OrgChartKey | null, node: Department) {
    selected.value = key
    node.leader.toUpperCase()
  }
  function inspectRef() {
    const node: Department | null = chart.value?.getNode(0) ?? null
    const result: Promise<boolean> | undefined = chart.value?.locate(1)
    const zoom: number | undefined = chart.value?.zoom
    // @ts-expect-error Exposed lookup preserves the original business node type.
    node?.headcount.toUpperCase()
    void result
    void zoom
  }
  type ClickNode = OrgChartEmits<Department>['node-click'][0]
  const original: ClickNode = department
  void props
  void wrong
  void slots
  void inspectRef
  void original
</script>

<template>
  <C_OrgChart
    :data="legacy"
    @node-click="node => node.label.toUpperCase()"
  />
  <C_OrgChart
    ref="chart"
    v-model:selected-key="selected"
    v-model:expanded-keys="expanded"
    :data="department"
    key-field="code"
    label-field="title"
    children-field="units"
    subtitle-field="leader"
    avatar-field="portrait"
    @node-click="inspect"
    @node-expand="node => node.headcount.toFixed()"
    @update:selected-key="change"
  >
    <template
      #node="{ node, key, isLeaf, isExpanded, isSelected, select, toggle }"
    >
      <button
        type="button"
        :aria-pressed="isSelected"
        @click="select"
        >{{ node.title }} {{ node.headcount.toFixed() }}</button
      >
      <button
        v-if="!isLeaf"
        type="button"
        :aria-expanded="isExpanded"
        @click="toggle"
        >{{ key }}</button
      >
    </template>
  </C_OrgChart>
</template>
