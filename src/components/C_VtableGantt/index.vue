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
    <div class="gantt-body">
      <div
        ref="ganttContainerRef"
        class="gantt-container"
        :style="{ height: containerHeight }"
      />
      <NResult
        v-if="initializationError"
        class="gantt-error"
        status="error"
        title="甘特图加载失败"
        :description="initializationError.message"
      >
        <template #footer>
          <NButton
            :loading="loading"
            @click="initGantt"
            >重试</NButton
          >
        </template>
      </NResult>
    </div>
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    shallowRef,
    computed,
    watch,
    nextTick,
    onMounted,
    onUnmounted,
  } from 'vue'
  import { NButton, NResult } from 'naive-ui'
  import type { Gantt as GanttInstance } from '@visactor/vtable-gantt'
  import type { IEditor } from '@visactor/vtable-editors'
  import C_Icon from '../C_Icon/index.vue'
  import {
    presetConfigs,
    type GanttTask,
    type GanttOptions,
    type GanttPreset,
  } from './data'
  import { mergeGanttOptions } from './optionsMerge'
  import { bindGanttEvents } from './ganttEvents'

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
    error: [error: Error]
  }>()

  const ganttContainerRef = ref<HTMLDivElement>()
  // 图库实例不参与模板深层响应式，保留原始实例和其内部记录。
  const ganttInstance = shallowRef<any>()
  const isFullscreen = ref(false)
  const loading = ref(false)
  const initializationError = shallowRef<Error>()
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
      theme: tableTheme.extends(finalConfig.taskListTable?.theme ?? {}),
    },
    timelineHeader: applyThemeToTimelineHeader(
      finalConfig.timelineHeader,
      themeColors
    ),
    grid: applyThemeToGrid(finalConfig.grid, themeColors),
  })

  const resolveGanttOptions = (
    themes: typeof import('@visactor/vtable').themes
  ) => {
    const isDark = props.theme === 'dark'
    const presetConfig = presetConfigs[props.preset] || presetConfigs.basic
    const finalConfig = mergeGanttOptions(presetConfig, props.options)
    return buildGanttOptions(
      finalConfig,
      processData(props.data),
      isDark ? themes.DARK : themes.DEFAULT,
      getThemeConfig(isDark)
    )
  }

  const releaseInstance = (instance?: GanttInstance) => {
    if (!instance) return
    try {
      instance.release()
    } catch (error) {
      console.warn('销毁甘特图失败:', error)
    }
  }

  const ensureEditor = (
    register: typeof import('@visactor/vtable').register,
    name: string,
    create: () => IEditor
  ) => {
    if (!register.editor(name)) register.editor(name, create())
  }

  const initGantt = async () => {
    clearTimeout(initTimer)
    initTimer = undefined
    const container = ganttContainerRef.value
    if (!container || disposed) return
    const version = ++initVersion
    loading.value = true
    initializationError.value = undefined
    let candidate: GanttInstance | undefined
    try {
      const [
        { Gantt },
        { themes, register },
        { InputEditor, DateInputEditor },
      ] = await Promise.all([
        import('@visactor/vtable-gantt'),
        import('@visactor/vtable'),
        import('@visactor/vtable-editors'),
      ])
      if (!isCurrentInitialization(version, container)) return
      // Preserve applications' own editor registrations.
      ensureEditor(register, 'input', () => new InputEditor())
      ensureEditor(register, 'date-input', () => new DateInputEditor())
      const ganttOptions = resolveGanttOptions(themes)
      destroyGantt()
      const instance = new Gantt(container, ganttOptions)
      candidate = instance
      if (!isCurrentInitialization(version, container)) {
        instance.release()
        return
      }
      bindGanttEvents(
        instance,
        (task, event) => emit('taskClick', task, event),
        (task, changes) => emit('taskChange', task, changes)
      )
      ganttInstance.value = instance
      candidate = undefined
      emit('ganttCreated', instance)
    } catch (error) {
      releaseInstance(candidate)
      if (!isCurrentInitialization(version, container)) return
      initializationError.value =
        error instanceof Error ? error : new Error(String(error))
      emit('error', initializationError.value)
    } finally {
      if (isCurrentInitialization(version, container)) loading.value = false
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
    const instance = ganttInstance.value
    ganttInstance.value = undefined
    releaseInstance(instance)
  }

  watch(
    () => props.data,
    newData => {
      if (newData && ganttInstance.value) updateData(newData)
    },
    { deep: true }
  )

  watch(
    () => [props.options, props.preset, props.theme],
    () => void initGantt(),
    { deep: true, flush: 'post' }
  )

  onMounted(() => {
    disposed = false
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    nextTick(() => {
      if (disposed || initVersion > 0) return
      initTimer = setTimeout(() => initGantt(), 100)
    })
  })

  onUnmounted(() => {
    disposed = true
    loading.value = false
    initVersion += 1
    if (initTimer) clearTimeout(initTimer)
    if (resizeTimer) clearTimeout(resizeTimer)
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    destroyGantt()
  })

  defineExpose({
    ganttInstance,
    loading,
    error: initializationError,
    reload: initGantt,
    updateData,
    updateOptions,
    toggleFullscreen,
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
