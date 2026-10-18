<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_SplitPane,
    type SplitPaneExpose,
    type PanelInfo,
  } from '@robot-admin/naive-ui-components/C_SplitPane'
  const size = ref(35)
  const split = ref<SplitPaneExpose>()
  const onPanel = (info: PanelInfo) => (info.collapsed ? 0 : info.size)
</script>

<template>
  <C_SplitPane
    ref="split"
    v-model:size="size"
    :min-first-size="240"
    :min-second-size="320"
  >
    <template #first="panel"
      ><span>{{ onPanel(panel) }}</span></template
    >
    <template #second="{ collapsed }"
      ><div v-if="!collapsed">Details</div></template
    >
  </C_SplitPane>
</template>
