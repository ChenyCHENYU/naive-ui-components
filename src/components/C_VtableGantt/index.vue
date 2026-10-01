<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-01
 * @Description: VTable 甘特图组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-vtable-gantt-wrapper">
    <div
      v-if="showToolbar"
      class="gantt-toolbar"
    >
      <div class="toolbar-left">
        <span class="gantt-title">{{ title || '甘特图' }}</span>
      </div>
      <div class="toolbar-right">
        <NButton
          v-if="showFullscreenButton"
          size="small"
          @click="toggleFullscreen"
        >
          <template #icon>
            <C_Icon
              :name="isFullscreen ? 'carbon:minimize' : 'carbon:maximize'"
              :size="16"
              color="currentColor"
            />
          </template>
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </NButton>
      </div>
    </div>
    <div
      ref="ganttContainerRef"
      class="gantt-container"
      :style="{ height: containerHeight }"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
  import { NButton } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import {
    presetConfigs,
    type GanttTask,
    type GanttOptions,
    type GanttPreset,
  } from './data'
  import { mergeGanttOptions } from './optionsMerge'

  defineOptions({ name: 'C_VtableGantt' })

  interface Props {
    data?: GanttTask[]
    options?: GanttOptions
    preset?: GanttPreset
    height?: string | number
    title?: string
    showToolbar?: boolean
    showFullscreenButton?: boolean
    theme?: 'light' | 'dark'
  }

  const props = withDefaults(defineProps<Props>(), {
    data: () => [],
    options: () => ({}),
    preset: 'basic',
    height: '600px',
    title: '',
    showToolbar: true,
    showFullscreenButton: true,
    theme: 'light',
  })

  const emit = defineEmits<{
    ganttCreated: [gantt: any]
    taskClick: [task: GanttTask, event: Event]
    taskChange: [task: GanttTask, changes: any]
  }>()

  const ganttContainerRef = ref<HTMLDivElement>()
  const ganttInstance = ref<any>()
  const isFullscreen = ref(false)
  let initVersion = 0
  let initTimer: ReturnType<typeof setTimeout> | undefined
  let resizeTimer: ReturnType<typeof setTimeout> | undefined
  let disposed = false

  const containerHeight = computed(() =>
    typeof props.height === 'number' ? `${props.height}px` : props.height
  )

  const isCurrentInitialization = (
    version: number,
    container: HTMLDivElement
  ): boolean =>
    !disposed &&
    version === initVersion &&
    ganttContainerRef.value === container

  const processData = (data: GanttTask[]): GanttTask[] => {
    return data.map(item => ({
      ...item,
      title: item.title || `任务${item.id}`,
      children: item.children ? processData(item.children) : undefined,
    }))
  }

  const getThemeConfig = (isDark: boolean) => ({
    underlayBackgroundColor: isDark ? '#1e1e1e' : '#ffffff',
    timelineHeaderBg: isDark ? '#2d2d2d' : '#EEF1F5',
    gridBg: isDark ? '#1e1e1e' : '#ffffff',
    lineColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 128, 128, 0.2)',
    textColor: isDark ? '#ffffff' : '#000000',
  })

  const applyThemeToTimelineHeader = (
    timelineHeader: any,
    themeColors: any
  ) => ({
    ...timelineHeader,
    backgroundColor: themeColors.timelineHeaderBg,
    horizontalLine: {
      ...timelineHeader?.horizontalLine,
      lineColor: themeColors.lineColor,
    },
    verticalLine: {
      ...timelineHeader?.verticalLine,
      lineColor: themeColors.lineColor,
    },
    scales: timelineHeader?.scales?.map((scale: any) => ({
      ...scale,
      style: {
        ...scale.style,
        color: themeColors.textColor,
      },
    })),
  })

  const applyThemeToGrid = (grid: any, themeColors: any) => ({
    ...grid,
    backgroundColor: themeColors.gridBg,
    horizontalLine: {
      ...grid?.horizontalLine,
      lineColor: themeColors.lineColor,
    },
    verticalLine: {
      ...grid?.verticalLine,
      lineColor: themeColors.lineColor,
    },
  })

  const buildGanttOptions = (
    finalConfig: any,
    processedData: GanttTask[],
    tableTheme: any,
    themeColors: any
  ) => ({
    ...finalConfig,
    records: processedData,
    underlayBackgroundColor: themeColors.underlayBackgroundColor,
    taskListTable: {
      ...finalConfig.taskListTable,
      theme: tableTheme,
    },
    timelineHeader: applyThemeToTimelineHeader(
      finalConfig.timelineHeader,
      themeColors
    ),
    grid: applyThemeToGrid(finalConfig.grid, themeColors),
  })

  const bindGanttEvents = (instance: any) => {
    instance.on('click_cell', (args: any) => {
      const { record, event } = args || {}
      if (record) emit('taskClick', record, event)
    })
    instance.on('change_data', (args: any) => {
      const { record, changes } = args || {}
      if (record && changes) emit('taskChange', record, changes)
    })
  }

  const initGantt = async () => {
    const container = ganttContainerRef.value
    if (!container || disposed) return
    const version = ++initVersion
    try {
      const { Gantt } = await import('@visactor/vtable-gantt')
      const { themes } = await import('@visactor/vtable')
      if (!isCurrentInitialization(version, container)) return
      const isDark = props.theme === 'dark'
      const presetConfig = presetConfigs[props.preset] || presetConfigs.basic
      const finalConfig = mergeGanttOptions(presetConfig, props.options)
      const processedData = processData(props.data || [])
      if (ganttInstance.value) ganttInstance.value.release()
      const tableTheme = isDark ? themes.DARK : themes.DEFAULT
      const themeColors = getThemeConfig(isDark)
      const ganttOptions = buildGanttOptions(
        finalConfig,
        processedData,
        tableTheme,
        themeColors
      )
      const instance = new Gantt(container, ganttOptions)
      if (!isCurrentInitialization(version, container)) {
        instance.release()
        return
      }
      ganttInstance.value = instance
      bindGanttEvents(instance)
      emit('ganttCreated', instance)
    } catch (error) {
      console.error('甘特图初始化失败:', error)
    }
  }

  const scheduleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      resizeTimer = undefined
      if (!disposed) ganttInstance.value?.resize?.()
    }, 100)
  }

  const toggleFullscreen = async () => {
    const container = ganttContainerRef.value
    if (!container) return
    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen()
      } else {
        await container.requestFullscreen()
      }
      isFullscreen.value = document.fullscreenElement === container
      scheduleResize()
    } catch (error) {
      console.warn('全屏切换失败:', error)
      isFullscreen.value = document.fullscreenElement === container
    }
  }

  const handleFullscreenChange = () => {
    isFullscreen.value = document.fullscreenElement === ganttContainerRef.value
    scheduleResize()
  }

  const updateData = (newData: GanttTask[]) => {
    if (ganttInstance.value && newData) {
      try {
        ganttInstance.value.setRecords(processData(newData))
      } catch (error) {
        console.warn('更新数据失败:', error)
      }
    }
  }

  const updateOptions = (newOptions: GanttOptions) => {
    if (ganttInstance.value && newOptions) {
      try {
        ganttInstance.value.updateOption(newOptions)
      } catch (error) {
        console.warn('更新配置失败:', error)
      }
    }
  }

  const destroyGantt = () => {
    if (ganttInstance.value) {
      try {
        ganttInstance.value.release()
      } catch (error) {
        console.warn('销毁甘特图失败:', error)
      } finally {
        ganttInstance.value = undefined
      }
    }
  }

  watch(
    () => props.data,
    newData => {
      if (newData && ganttInstance.value) updateData(newData)
    },
    { deep: true }
  )

  watch(
    () => [props.options, props.preset],
    () => nextTick(() => initGantt()),
    { deep: true }
  )

  watch(
    () => props.theme,
    () => nextTick(() => initGantt())
  )

  onMounted(() => {
    disposed = false
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    nextTick(() => {
      if (disposed) return
      initTimer = setTimeout(() => initGantt(), 100)
    })
  })

  onUnmounted(() => {
    disposed = true
    initVersion += 1
    if (initTimer) clearTimeout(initTimer)
    if (resizeTimer) clearTimeout(resizeTimer)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    destroyGantt()
  })

  defineExpose({
    ganttInstance,
    updateData,
    updateOptions,
    toggleFullscreen,
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
