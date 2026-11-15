<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Cascade,
    type CascadeProps,
    type CascadeValue,
  } from '@robot-admin/naive-ui-components/C_Cascade'

  const selection = ref<CascadeValue>({})
  const config = {
    data: [
      { label: 'Region', value: 0, children: [{ label: 'City', value: 1 }] },
    ],
    placeholders: ['Region', 'City', 'District'],
    density: 'compact',
  } satisfies CascadeProps
  const invalid: CascadeProps = {
    data: [],
    // @ts-expect-error Component size remains the existing Naive size contract.
    size: 'tiny',
  }
  void invalid
</script>

<template>
  <C_Cascade
    v-bind="config"
    v-model="selection"
  />
</template>
