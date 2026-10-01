<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-01
 * @Description: AntV X6 图形编辑器组件（ER/BPMN/UML）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-antv-container">
    <component
      :is="currentComponent"
      v-bind="componentProps"
      @ready="handleReady"
      @data-change="handleDataChange"
      ref="layoutRef"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, type Component } from 'vue'
  import type { Graph } from '@antv/x6'
  import ERLayout from './layout/ER/index.vue'
  import BPMNLayout from './layout/BPMN/index.vue'
  import UMLLayout from './layout/UML/index.vue'
  import type { BPMNDiagramData, DiagramConfig, DiagramData } from './types'
  import { fromBpmnCells, toBpmnCells, type BpmnCell } from './bpmnAdapter'

  defineOptions({ name: 'C_AntV' })

  interface Props extends DiagramConfig {
    type: 'er' | 'bpmn' | 'uml'
    data?: DiagramData
    width?: string | number
    height?: string | number
    readonly?: boolean
    showToolbar?: boolean
    theme?: 'light' | 'dark'
  }

  const props = withDefaults(defineProps<Props>(), {
    width: '100%',
    height: '600px',
    readonly: false,
    showToolbar: true,
    theme: 'light',
  })

  const emit = defineEmits<{
    (e: 'ready', graph: Graph): void
    (e: 'data-change', data: DiagramData): void
  }>()

  const layoutRef = ref()

  const components = {
    er: ERLayout,
    bpmn: BPMNLayout,
    uml: UMLLayout,
  } as const

  const currentComponent = computed<Component>(() => components[props.type])

  const componentProps = computed(() => {
    const baseProps = {
      width: props.width,
      height: props.height,
      readonly: props.readonly,
      showToolbar: props.showToolbar,
      theme: props.theme,
    }

    const adaptedData =
      props.type === 'bpmn' && props.data && 'nodes' in props.data
        ? toBpmnCells(props.data as BPMNDiagramData)
        : props.data

    return {
      ...baseProps,
      data: adaptedData,
    }
  })

  const handleReady = (graph: Graph) => {
    emit('ready', graph)
  }

  const handleDataChange = (data: DiagramData | BpmnCell[]) => {
    emit(
      'data-change',
      props.type === 'bpmn' && Array.isArray(data)
        ? fromBpmnCells(data)
        : (data as DiagramData)
    )
  }

  defineExpose({
    getGraph: () => layoutRef.value?.getGraph?.(),
    getData: () => {
      const rawData = layoutRef.value?.getData?.()

      if (props.type === 'bpmn' && Array.isArray(rawData))
        return fromBpmnCells(rawData as BpmnCell[])

      return rawData
    },
  })
</script>

<style scoped>
  .c-antv-container {
    width: 100%;
    height: 100%;
  }
</style>
