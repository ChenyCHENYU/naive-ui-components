<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_FormSearch,
    type SearchFormParams,
  } from '@robot-admin/naive-ui-components/C_FormSearch'

  const query = ref<SearchFormParams>({ name: '', pageNum: 1, pageSize: 10 })
  const onReset = (params: SearchFormParams) => {
    query.value = params
  }
  const legacyReset = () => {}
</script>

<template>
  <C_FormSearch
    v-model="query"
    :form-item-list="[{ type: 'input', prop: 'name' }]"
    @reset="onReset"
  />
  <C_FormSearch
    :form-params="query"
    :form-item-list="[]"
    @reset="legacyReset"
  />
</template>
