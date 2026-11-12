<template>
  <C_Tree
    ref="tree"
    :data="roots"
    :search-source="{
      scope: 'company-a',
      request: ({ search, signal, limit }) =>
        searchPaths(search, signal, limit),
      resolve: resolvePath,
      load: (node, { signal }) => loadChildren(node.id, signal),
    }"
    checkable
    cascade
    check-strategy="child"
    :addable="false"
    @node-select="
      node => {
        selectedCode = node?.code ?? ''
      }
    "
    @search-error="
      error => {
        searchError = error
      }
    "
  >
    <template #label="{ option }">{{ option.code }} {{ option.name }}</template>
  </C_Tree>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Tree,
    type TreeExpose,
    type TreeKey,
    type TreeSearchSource,
  } from '@robot-admin/naive-ui-components/C_Tree'

  interface Department {
    id: number
    code: string
    name: string
    isLeaf?: boolean
    children?: Department[]
  }
  const roots: Department[] = [
    { id: 0, code: 'HQ', name: 'Headquarters', isLeaf: false },
  ]
  const child: Department = { id: 1, code: 'ENG', name: 'Engineering' }
  const selectedCode = ref('')
  const searchError = ref<unknown>(null)
  const tree = ref<TreeExpose<Department>>()
  const searchPaths = async (
    search: string,
    signal: AbortSignal,
    limit: number
  ) => {
    void search
    void signal
    void limit
    return [[roots[0], child]]
  }
  const resolvePath = async (key: TreeKey, signal: AbortSignal) => {
    void signal
    return key === 1 ? [roots[0], child] : null
  }
  const loadChildren = async (id: number, signal: AbortSignal) => {
    void signal
    return id === 0 ? [child] : []
  }
  const separatelyDeclared: TreeSearchSource<Department> = {
    request: ({ search, signal, limit }) => searchPaths(search, signal, limit),
    load: (node, { signal }) => loadChildren(node.id, signal),
  }
  async function locateDepartment() {
    await tree.value?.locate(1)
    await tree.value?.nextMatch()
    return tree.value?.getSelectedNode()?.code
  }
  void separatelyDeclared
  void locateDepartment
</script>
