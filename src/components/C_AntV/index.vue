<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-01
 * @Description: AntV X6 图形编辑器组件（ER/BPMN/UML）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-antv-container"
    :style="componentTheme"
  >
    <component
      :is="currentComponent"
      :style="componentTheme"
      v-bind="componentProps"
      @ready="handleReady"
      @data-change="handleDataChange"
      ref="layoutRef"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, defineAsyncComponent, type Component } from 'vue'
  import type { Graph } from '@antv/x6'
  import {
    useComponentTheme,
    useComponentColorMode,
  } from '../../composables/useComponentTheme'
  import type {
    BPMNDiagramData,
    DiagramConfig,
    DiagramData,
    DiagramExpose,
  } from './types'
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
  })

  const emit = defineEmits<{
    (e: 'ready', graph: Graph): void
    (e: 'data-change', data: DiagramData): void
  }>()
  const componentTheme = useComponentTheme(() => props.theme)
  const colorMode = useComponentColorMode(() => props.theme)

  const layoutRef = ref<{
    getGraph: () => Graph | null | undefined
    getData: () => DiagramData | BpmnCell[] | undefined
  }>()

  const components = {
    er: defineAsyncComponent(() =>
      import('./layout/ER/index.vue').then(module => module.default)
    ),
    bpmn: defineAsyncComponent(() =>
      import('./layout/BPMN/index.vue').then(module => module.default)
    ),
    uml: defineAsyncComponent(() =>
      import('./layout/UML/index.vue').then(module => module.default)
    ),
  } as const

  const currentComponent = computed<Component>(() => components[props.type])

  const componentProps = computed(() => {
    const baseProps = {
      width: props.width,
      height: props.height,
      readonly: props.readonly,
      showToolbar: props.showToolbar,
      theme: colorMode.value,
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
    getGraph: () => layoutRef.value?.getGraph() ?? undefined,
    getData: () => {
      const rawData = layoutRef.value?.getData()

      if (props.type === 'bpmn' && Array.isArray(rawData))
        return fromBpmnCells(rawData)

      return Array.isArray(rawData) ? undefined : rawData
    },
  } satisfies DiagramExpose)
</script>

<style scoped>
  .c-antv-container {
    width: 100%;
    height: 100%;
  }
</style>
