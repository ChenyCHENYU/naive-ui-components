<template>
  <C_Tabs
    v-model="activeTab"
    :items="tabs"
    type="segment"
    tabs-only
    @change="handleChange"
  />
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Tabs,
    defineTabs,
    type TabsItem,
  } from '@robot-admin/naive-ui-components/C_Tabs'

  const activeTab = ref<string | number>('basic')
  const tabs = defineTabs([
    { key: 'basic', label: '基础表格' },
    { key: 'tree', label: '树形表格', badge: 2 },
  ])

  const handleChange = (value: string | number, item?: TabsItem) => {
    activeTab.value = value
    void item
  }
</script>
