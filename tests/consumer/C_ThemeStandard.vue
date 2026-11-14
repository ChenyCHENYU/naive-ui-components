<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { NConfigProvider } from 'naive-ui'
  import {
    createComponentTheme,
    COMPONENT_COLOR_PALETTES,
    type ComponentColorMode,
  } from '@robot-admin/naive-ui-components/config'
  import { C_Density } from '@robot-admin/naive-ui-components/C_Density'
  import { C_Select } from '@robot-admin/naive-ui-components/C_Select'
  import { C_City } from '@robot-admin/naive-ui-components/C_City'
  const mode = ref<ComponentColorMode>('light')
  const theme = computed(() =>
    createComponentTheme({
      mode: mode.value,
      primary: COMPONENT_COLOR_PALETTES.light.primary,
      bgCard: '#fffdf8',
      bgMuted: '#f3eddf',
      text1: '#362c22',
      border: '#ddcfb9',
      skeletonBg: '#e7ddcd',
    })
  )
  const value = ref<number | null>(null)
  const city = ref('')
</script>

<template>
  <NConfigProvider v-bind="theme">
    <C_Density density="compact">
      <C_Select
        v-model="value"
        :options="[{ label: '示例', value: 1 }]"
      />
      <C_City v-model="city" />
    </C_Density>
  </NConfigProvider>
</template>
