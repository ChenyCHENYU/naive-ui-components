<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_UserPicker,
    type UserPickerFields,
    type UserPickerOrganization,
    type UserPickerExpose,
    type UserPickerSource,
    type UserPickerProps,
    createUserPickerSource,
  } from '@robot-admin/naive-ui-components/C_UserPicker'
  interface Person {
    userNo: string
    name: string
    departmentName: string
    position: string
    portrait?: string
    enabled: boolean
  }
  interface Department {
    id: number
    name: string
    children?: Department[]
  }
  interface Filters {
    departmentId?: number
  }
  const ids = ref<string[]>([])
  const id = ref<string | null>(null)
  const picker = ref<UserPickerExpose>()
  const source: UserPickerSource<Person, string, Filters> = {
    rowKey: 'userNo',
    label: row => row.name,
    request: async () => ({ rows: [], total: 0 }),
    resolve: async () => [],
  }
  const organization: UserPickerOrganization<Department, Filters> = {
    data: [{ id: 0, name: '总部' }],
    field: 'departmentId',
    iconConfig: {
      resolve: ({ option }) => {
        option.name.toUpperCase()
        return 'mdi:domain'
      },
    },
  }
  const fields: UserPickerFields<Person> = {
    code: 'userNo',
    department: 'departmentName',
    job: 'position',
    avatar: 'portrait',
  }
  // @ts-expect-error Field mappings follow the business interface.
  const wrong: UserPickerFields<Person> = { job: 'missing' }
  function selected(rows: Person[]) {
    rows[0]?.position.toUpperCase()
  }
  picker.value?.confirm().then(accepted => accepted.valueOf())
  const numericSource: UserPickerSource<{ id: number; name: string }, number> =
    {
      rowKey: 'id',
      label: row => row.name,
      request: async () => ({ rows: [], total: 0 }),
    }
  const mismatch: UserPickerProps<
    { id: number; name: string },
    Record<string, unknown>,
    Department,
    true,
    string
  > = {
    // @ts-expect-error Numeric identity sources cannot pretend to be string models.
    source: numericSource,
    modelValue: ['0'],
    multiple: true,
  }
  const inferred = createUserPickerSource({
    rowKey: 'userNo',
    label: (row: Person) => row.name,
    request: source.request,
    resolve: source.resolve,
  })
  const exact: UserPickerSource<Person, string, Filters> = inferred
  createUserPickerSource({
    // @ts-expect-error Boolean identities are not valid personnel keys.
    rowKey: 'enabled',
    label: (row: Person) => row.name,
    request: source.request,
  })
  void mismatch
  void exact
  void wrong
</script>
<template>
  <C_UserPicker
    ref="picker"
    v-model="ids"
    multiple
    :source="source"
    :organization="organization"
    :fields="fields"
    :disabled-reason="row => (row.enabled ? undefined : '已停用')"
    selection-order
    @select="selected"
  >
    <template #selected="{ items, move }"
      ><span
        v-for="item in items"
        :key="item.value"
        >{{ item.row?.position
        }}<button @click="move(item.value, 1)">移动</button></span
      ></template
    >
  </C_UserPicker>
  <C_UserPicker
    v-model="id"
    :source="source"
    :organization="organization"
  />
  <!-- @vue-expect-error Numeric personnel sources cannot publish into string models. -->
  <C_UserPicker
    v-model="ids"
    multiple
    :source="numericSource"
  />
</template>
