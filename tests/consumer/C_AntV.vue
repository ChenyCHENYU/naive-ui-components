<template>
  <C_AntV
    type="bpmn"
    :data="diagram"
    @data-change="handleChange"
  />
</template>

<script setup lang="ts">
  import {
    C_AntV,
    type BPMNDiagramData,
    type DiagramData,
  } from '@robot-admin/naive-ui-components/C_AntV'

  const diagram: BPMNDiagramData = {
    nodes: [],
    flows: [],
  }

  const handleChange = (data: DiagramData): void => {
    void data
  }
</script>
