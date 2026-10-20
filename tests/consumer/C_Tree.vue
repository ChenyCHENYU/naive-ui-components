<template>
  <C_Tree :data="businessRows" />
  <C_Tree
    :data="customRows"
    :tree-props="{
      keyField: 'code',
      labelField: 'title',
      childrenField: 'items',
    }"
  />
  <C_Tree
    ref="tree"
    v-model:selected-keys="selected"
    v-model:expanded-keys="expanded"
    v-model:checked-keys="checked"
    v-model:search-pattern="pattern"
    :data="departments"
    density="compact"
    :tree-props="native"
    :addable="false"
    @update:checked-keys="handleChecked"
    @load-error="handleError"
  >
    <template #label="{ option, checked: isChecked }">
      <span>{{ option.title }} {{ isChecked ? '✓' : '' }}</span>
    </template>
    <template #empty>No departments</template>
  </C_Tree>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { C_Tree } from '@robot-admin/naive-ui-components'
  import type {
    ComponentDensity,
    TreeExpose,
    TreeKey,
    TreeNodeData,
    TreeNativeProps,
    TreeOption,
    TreeUpdateMeta,
  } from '@robot-admin/naive-ui-components/C_Tree'

  // Public inputs accept normal domain interfaces without Record/index signatures.
  interface BusinessTreeRow {
    id: number
    name: string
    children?: BusinessTreeRow[]
  }
  interface CustomTreeRow {
    code: string
    title: string
    items?: CustomTreeRow[]
  }
  const businessRows: BusinessTreeRow[] = [{ id: 1, name: 'Department' }]
  const customRows: CustomTreeRow[] = [
    { code: 'engineering', title: 'Engineering' },
  ]
  const tree = ref<TreeExpose>()
  const selected = ref<TreeKey[]>([])
  const expanded = ref<TreeKey[]>([])
  const checked = ref<TreeKey[]>([])
  const pattern = ref('')
  const density: ComponentDensity = 'compact'
  const departments: TreeNodeData[] = [
    {
      uuid: 'engineering',
      title: 'Engineering',
      nodes: [{ uuid: 'frontend', title: 'Frontend' }],
    },
  ]
  const native: TreeNativeProps = {
    keyField: 'uuid',
    labelField: 'title',
    childrenField: 'nodes',
    disabledField: 'inactive',
    checkable: true,
    cascade: true,
    checkStrategy: 'child',
    virtualScroll: true,
  }
  const handleChecked = (
    keys: TreeKey[],
    options: Array<TreeOption | null>,
    meta: TreeUpdateMeta
  ) => {
    void keys
    void options
    void meta
  }
  const handleError = (error: unknown, node: TreeOption) => {
    void error
    void node
  }
  const readPublicKeys = (): TreeKey[][] => [
    tree.value?.selectedKeys ?? [],
    tree.value?.expandedKeys ?? [],
    tree.value?.checkedKeys ?? [],
  ]
  void readPublicKeys
  const scroll = () => {
    tree.value?.scrollTo({ key: 'frontend' })
    tree.value?.scrollTo(0, 100)
  }
  void density
  void scroll
</script>
