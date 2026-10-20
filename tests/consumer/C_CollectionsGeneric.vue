<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Tree,
    type TreeExpose,
    type TreeNativeProps,
  } from '@robot-admin/naive-ui-components/C_Tree'
  import {
    C_Draggable,
    type DraggableExpose,
    type DragEvent,
  } from '@robot-admin/naive-ui-components/C_Draggable'
  import {
    C_Transfer,
    type TransferProps,
  } from '@robot-admin/naive-ui-components/C_Transfer'

  interface Department {
    code: string
    title: string
    headcount: number
    members?: Department[]
  }
  interface WorkItem {
    uuid: string
    salary: number
    team: string
  }
  interface Person {
    key: number
    label: string
    teamCode: string
  }
  const departments: Department[] = [
    { code: 'engineering', title: 'Engineering', headcount: 12 },
  ]
  const tree = ref<TreeExpose<Department>>()
  const native: TreeNativeProps<Department> = {
    keyField: 'code',
    labelField: 'title',
    getChildren: node => node.members,
    filter: (pattern, node) => node.title.includes(pattern),
    onLoad: async node => {
      void node.headcount.toFixed()
    },
    onUpdateSelectedKeys: (_keys, nodes, meta) => {
      const selected: Department | null = nodes[0] ?? meta.node
      void selected
    },
  }
  function selectDepartment(node: Department | null) {
    void node
  }
  function inspectTree() {
    const node: Department | null = tree.value?.getSelectedNode() ?? null
    const checked: Array<Department | null> =
      tree.value?.getCheckedData().options ?? []
    // @ts-expect-error Business properties retain their actual value types.
    node?.headcount.toUpperCase()
    void checked
  }
  void inspectTree

  const work = ref<WorkItem[]>([{ uuid: 'a', salary: 2000, team: 'UI' }])
  const draggable = ref<DraggableExpose<WorkItem>>()
  function receiveList(list: WorkItem[]) {
    void list[0].salary.toFixed()
  }
  function receiveDrag(event: DragEvent<WorkItem>) {
    void event.item.team.toUpperCase()
  }
  function inspectDraggable() {
    draggable.value?.addItem({ uuid: 'b', salary: 3000, team: 'Platform' })
    // @ts-expect-error Commands use the same business item shape as v-model.
    draggable.value?.addItem({ id: 1, title: 'invalid' })
    const item: WorkItem | undefined = draggable.value?.getItem(0)
    void item
  }
  void inspectDraggable

  const people: Person[] = [{ key: 0, label: 'Zero', teamCode: 'eng' }]
  const selected = ref<number[]>([])
  const wrongKeys = ref<string[]>([])
  const filterPeople: TransferProps<Person>['filterMethod'] = (query, item) =>
    item.teamCode.includes(query)
  function receiveKeys(
    keys: number[],
    _direction: 'left' | 'right',
    moved: number[]
  ) {
    keys.forEach(key => key.toFixed())
    moved.forEach(key => key.toFixed())
  }
</script>

<template>
  <C_Tree
    ref="tree"
    :data="departments"
    :tree-props="native"
    :actions="[
      {
        key: 'edit',
        text: 'Edit',
        icon: 'mdi:pencil',
        show: node => node.headcount > 0,
      },
    ]"
    @node-select="selectDepartment"
    @node-action="(_action, node) => selectDepartment(node)"
  >
    <template #label="{ option }">
      <span>{{ option.headcount.toFixed() }}</span>
    </template>
  </C_Tree>
  <!-- @vue-expect-error Business callback fields are not an open index signature. -->
  <C_Tree
    :data="departments"
    :tree-props="{ filter: (_pattern, node) => node.nonexistent }"
  />
  <C_Draggable
    ref="draggable"
    v-model="work"
    :item-key="item => item.uuid"
    :item-title="item => item.salary.toFixed()"
    @list-change="receiveList"
    @drag-end="receiveDrag"
  >
    <template #default="{ item }">
      <span>{{ item.team.toUpperCase() }} {{ item.salary.toFixed() }}</span>
    </template>
  </C_Draggable>
  <!-- @vue-expect-error The item callback keeps the business item type. -->
  <C_Draggable
    v-model="work"
    :item-title="item => item.nonexistent"
  />
  <C_Transfer
    v-model="selected"
    :data="people"
    :filter-method="filterPeople"
    @change="receiveKeys"
  />
  <!-- @vue-expect-error A numeric-key data source cannot bind string keys. -->
  <C_Transfer
    v-model="wrongKeys"
    :data="people"
  />
</template>
