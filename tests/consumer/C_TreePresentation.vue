<template>
  <C_Tree
    :data="departments"
    key-field="code"
    label-field="title"
    children-field="items"
    type-field="category"
    mode="org"
    :icon-config="{
      resolve: ({ option, expanded, selected, isLeaf, loading }) =>
        loading
          ? 'mdi:loading'
          : option.category === 'user'
            ? undefined
            : {
                name: expanded ? 'mdi:folder-open' : 'mdi:folder',
                color: selected ? '#2080f0' : undefined,
                size: isLeaf ? 14 : 16,
              },
    }"
    :actions="[
      {
        key: 'edit',
        text: 'Edit',
        icon: 'mdi:pencil',
        disabled: node => node.locked,
        loading: node => saving.has(node.code),
      },
    ]"
  >
    <template #label="{ option, expanded, isLeaf, loading }">
      <span>{{ option.title }} · {{ option.count ?? 0 }}</span>
      <span v-if="!isLeaf && expanded">Expanded</span>
      <span v-if="loading">Loading</span>
    </template>
    <template #suffix="{ option, selected, checked, loading }">
      {{ option.code }} {{ selected }} {{ checked }} {{ loading }}
    </template>
  </C_Tree>
  <C_Tree
    :data="departments"
    :tree-props="native"
    :icon-config="icons"
  />
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Tree,
    type ActionConfig,
    type IconConfig,
    type TreeNativeProps,
    type TreeNodeIcon,
    type TreeNodeRenderContext,
    type TreeRenderContext,
  } from '@robot-admin/naive-ui-components/C_Tree'

  interface Department {
    code: number
    title: string
    category: 'department' | 'user'
    locked: boolean
    count?: number
    items?: Department[]
  }
  const departments: Department[] = [
    {
      code: 0,
      title: 'Engineering',
      category: 'department',
      locked: false,
      count: 12,
    },
  ]
  const saving = ref(new Set<number>())
  const icons: IconConfig<Department> = {
    resolve: ({ option, expanded }) =>
      option.category === 'user'
        ? undefined
        : expanded
          ? 'mdi:folder-open'
          : 'mdi:folder',
  }
  // Existing manually constructed contexts and callbacks keep their original contract.
  const legacy: TreeRenderContext<Department> = {
    option: departments[0],
    checked: false,
    selected: false,
  }
  const native: TreeNativeProps<Department> = {
    keyField: 'code',
    labelField: 'title',
    childrenField: 'items',
    renderPrefix: (context: TreeRenderContext<Department>) =>
      context.option.title,
    renderLabel: ({ option, expanded, isLeaf, loading }) =>
      `${option.title}:${expanded}:${isLeaf}:${loading}`,
  }
  const renderState = (
    context: TreeNodeRenderContext<Department>
  ): TreeNodeIcon | null =>
    context.isLeaf
      ? null
      : { name: 'mdi:domain', size: 16, color: 'currentColor' }
  const invalidIcon: IconConfig<Department> = {
    // @ts-expect-error Icon descriptors require a string name.
    resolve: () => ({ name: 123 }),
  }
  const invalidAction: ActionConfig<Department> = {
    key: 'edit',
    text: 'Edit',
    icon: 'mdi:pencil',
    // @ts-expect-error Node callbacks retain the inferred business schema.
    disabled: node => node.unknownPermission,
  }
  const invalidLoading: ActionConfig<Department> = {
    key: 'edit',
    text: 'Edit',
    icon: 'mdi:pencil',
    // @ts-expect-error Busy predicates return boolean, not a promise.
    loading: async () => true,
  }
  void legacy
  void renderState
  void invalidIcon
  void invalidAction
  void invalidLoading
</script>
