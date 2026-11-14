<template>
  <Handle
    v-if="!start"
    id="input"
    type="target"
    :position="Position.Top"
    :connectable="!readonly"
    title="输入端口"
    :class="['workflow-port', { 'workflow-port--readonly': readonly }]"
  />
  <Handle
    id="output"
    type="source"
    :position="Position.Bottom"
    :connectable="!readonly"
    :style="{ left: 'calc(50% + 32px)' }"
    title="拖动到下游节点的输入端口"
    :class="['workflow-port', { 'workflow-port--readonly': readonly }]"
  />
</template>

<script setup lang="ts">
  import { Handle, Position } from '@vue-flow/core'
  import { useWorkflowReadonly } from './workflowPresentation'

  defineProps<{ start?: boolean }>()
  const readonly = useWorkflowReadonly()
</script>

<style scoped>
  .workflow-port {
    width: 10px;
    height: 10px;
    border: 2px solid var(--workflow-surface, #fff);
    border-radius: 50%;
    background: var(--workflow-accent, #2080f0);
    z-index: 3;
  }
  .workflow-port--readonly {
    opacity: 0.45;
    cursor: default;
  }
</style>
