<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Time,
    type TimeExpose,
  } from '@robot-admin/naive-ui-components/C_Time'
  import {
    C_Menu,
    type MenuExpose,
  } from '@robot-admin/naive-ui-components/C_Menu'
  const time = ref<TimeExpose>()
  const menu = ref<MenuExpose>()
  const readState = () => {
    const single: number | null = time.value?.singleTime ?? null
    const start: number | null = time.value?.startTime ?? null
    const end: number | null = time.value?.endTime ?? null
    menu.value?.menuRef?.showOption('home')
    return [single, start, end]
  }
  void readState
</script>
<template>
  <C_Time
    ref="time"
    mode="single"
  />
  <C_Menu
    ref="menu"
    :options="[{ label: 'Home', key: 'home' }]"
  />
</template>
