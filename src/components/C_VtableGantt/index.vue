<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-01
 * @Description: VTable 甘特图组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-vtable-gantt-wrapper"
    :style="themeStyle"
  >
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

<script setup lang="ts" generic="T extends GanttTask = GanttTask">
  import {
    useComponentTheme,
    useComponentColorMode,
  } from '../../composables/useComponentTheme'
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
  import type {
    Gantt as GanttInstance,
    GanttConstructorOptions,
  } from '@visactor/vtable-gantt'
  import type { IEditor } from '@visactor/vtable-editors'
  import C_Icon from '../C_Icon/index.vue'
  import { presetConfigs } from './data'
  import type {
    GanttTask,
    GanttOptions,
    GanttProps,
    GanttEmits,
    GanttExpose,
  } from './types'
  import { mergeGanttOptions } from './optionsMerge'
  import { bindGanttEvents } from './ganttEvents'

  defineOptions({ name: 'C_VtableGantt' })

  const props = withDefaults(defineProps<GanttProps<T>>(), {
    data: () => [],
    options: () => ({}),
    preset: 'basic',
    height: '600px',
    title: '',
    showToolbar: true,
    showFullscreenButton: true,
  })

  const colorMode = useComponentColorMode(() => props.theme)
  const themeStyle = useComponentTheme(() => props.theme)
  const emit = defineEmits<GanttEmits<T>>()

  const ganttContainerRef = ref<HTMLDivElement>()
  // 图库实例不参与模板深层响应式，保留原始实例和其内部记录。
  const ganttInstance = shallowRef<GanttInstance>()
  const isFullscreen = ref(false)
  const loading = ref(false)
  const initializationError = shallowRef<Error>()
  let initVersion = 0
  let initTimer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  let currentOptions: GanttConstructorOptions | undefined
  // 保存应用主题前的配置，补丁只合并普通配置，不能展开 SDK Theme 类实例。
  let currentConfig: Record<string, unknown> | undefined
  let currentThemes: typeof import('@visactor/vtable').themes | undefined

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

  const processData = <D extends GanttTask>(data: D[]): D[] => {
    return data.map(item => ({
      ...item,
      title: item.title || `任务${item.id}`,
      children: item.children ? processData(item.children) : undefined,
    }))
  }

  const themeColor = (
    name:
      | 'bg-body'
      | 'bg-card'
      | 'bg-surface'
      | 'bg-muted'
      | 'bg-hover'
      | 'border'
      | 'text-1'
      | 'text-2'
      | 'text-3'
      | 'primary'
  ) =>
    String(
      themeStyle.value[`--c-${name}`] ?? themeStyle.value[`--c-theme-${name}`]
    )
  const getThemeConfig = () => ({
    underlayBackgroundColor: themeColor('bg-body'),
    timelineHeaderBg: themeColor('bg-muted'),
    gridBg: themeColor('bg-card'),
    surfaceBg: themeColor('bg-surface'),
    hoverBg: themeColor('bg-hover'),
    lineColor: themeColor('border'),
    textColor: themeColor('text-1'),
    secondaryTextColor: themeColor('text-2'),
    mutedTextColor: themeColor('text-3'),
    primaryColor: themeColor('primary'),
  })

  const getTaskTableTheme = (colors: ReturnType<typeof getThemeConfig>) => {
    const cell = {
      bgColor: colors.gridBg,
      color: colors.textColor,
      borderColor: colors.lineColor,
      hover: {
        cellBgColor: colors.hoverBg,
        inlineRowBgColor: colors.hoverBg,
        inlineColumnBgColor: colors.hoverBg,
      },
    }
    const header = {
      ...cell,
      bgColor: colors.timelineHeaderBg,
      color: colors.secondaryTextColor,
    }
    return {
      underlayBackgroundColor: colors.gridBg,
      defaultStyle: cell,
      headerStyle: header,
      rowHeaderStyle: header,
      cornerHeaderStyle: header,
      bodyStyle: cell,
      frameStyle: { borderColor: colors.lineColor },
      selectionStyle: {
        cellBgColor: colors.hoverBg,
        cellBorderColor: colors.primaryColor,
      },
      columnResize: {
        lineColor: colors.primaryColor,
        bgColor: colors.hoverBg,
      },
      scrollStyle: {
        scrollRailColor: colors.timelineHeaderBg,
        scrollSliderColor: colors.mutedTextColor,
      },
      tooltipStyle: { bgColor: colors.surfaceBg, color: colors.textColor },
    }
  }

  // 网格线支持 SDK 回调；显式回调须原样交给 SDK，不能展开为普通对象。
  type GridLine =
    | NonNullable<GanttOptions['grid']>['verticalLine']
    | NonNullable<GanttOptions['grid']>['horizontalLine']
  const withLineColor = <L extends GridLine>(line: L, color: string) =>
    typeof line === 'function'
      ? line
      : { ...line, lineColor: line?.lineColor ?? color }

  const applyThemeToTimelineHeader = (
    timelineHeader: any,
    themeColors: any
  ) => ({
    ...timelineHeader,
    backgroundColor:
      timelineHeader?.backgroundColor ?? themeColors.timelineHeaderBg,
    horizontalLine: withLineColor(
      timelineHeader?.horizontalLine,
      themeColors.lineColor
    ),
    verticalLine: withLineColor(
      timelineHeader?.verticalLine,
      themeColors.lineColor
    ),
    scales: timelineHeader?.scales?.map((scale: any) => ({
      ...scale,
      style: {
        ...scale.style,
        color: scale.style?.color ?? themeColors.textColor,
      },
    })),
  })

  const applyThemeToGrid = (grid: any, themeColors: any) => ({
    ...grid,
    backgroundColor: grid?.backgroundColor ?? themeColors.gridBg,
    horizontalLine: withLineColor(grid?.horizontalLine, themeColors.lineColor),
    verticalLine: withLineColor(grid?.verticalLine, themeColors.lineColor),
  })

  const applyThemeToFrame = (
    frame: GanttOptions['frame'],
    themeColors: ReturnType<typeof getThemeConfig>
  ) => ({
    ...frame,
    outerFrameStyle: {
      ...frame?.outerFrameStyle,
      borderColor: frame?.outerFrameStyle?.borderColor ?? themeColors.lineColor,
    },
    verticalSplitLine: withLineColor(
      frame?.verticalSplitLine,
      themeColors.lineColor
    ),
    horizontalSplitLine: withLineColor(
      frame?.horizontalSplitLine,
      themeColors.lineColor
    ),
  })

  const buildGanttOptions = (
    finalConfig: any,
    processedData: GanttTask[],
    tableTheme: any,
    themeColors: any
  ) => ({
    ...finalConfig,
    records: processedData,
    underlayBackgroundColor:
      finalConfig.underlayBackgroundColor ??
      themeColors.underlayBackgroundColor,
    taskListTable: {
      ...finalConfig.taskListTable,
      // SDK extends 返回独立 Theme；公共默认在前，项目显式配置最后覆盖。
      theme: tableTheme
        .extends(getTaskTableTheme(themeColors))
        .extends(finalConfig.taskListTable?.theme ?? {}),
    },
    timelineHeader: applyThemeToTimelineHeader(
      finalConfig.timelineHeader,
      themeColors
    ),
    grid: applyThemeToGrid(finalConfig.grid, themeColors),
    frame: applyThemeToFrame(finalConfig.frame, themeColors),
    scrollStyle: {
      ...finalConfig.scrollStyle,
      scrollRailColor:
        finalConfig.scrollStyle?.scrollRailColor ?? themeColors.hoverBg,
      scrollSliderColor:
        finalConfig.scrollStyle?.scrollSliderColor ??
        themeColors.mutedTextColor,
    },
  })

  const resolveGanttOptions = (
    themes: typeof import('@visactor/vtable').themes,
    config: Record<string, unknown>,
    records: GanttTask[]
  ) => {
    const isDark = colorMode.value === 'dark'
    return buildGanttOptions(
      config,
      records,
      isDark ? themes.DARK : themes.DEFAULT,
      getThemeConfig()
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
      const presetConfig = presetConfigs[props.preset] || presetConfigs.basic
      const config = mergeGanttOptions(presetConfig, props.options)
      const ganttOptions = resolveGanttOptions(
        themes,
        config,
        processData(props.data)
      )
      destroyGantt()
      const instance = new Gantt(container, ganttOptions)
      candidate = instance
      if (!isCurrentInitialization(version, container)) {
        instance.release()
        return
      }
      bindGanttEvents<T>(
        instance,
        (task, event) => emit('taskClick', task, event),
        (task, changes) => emit('taskChange', task, changes)
      )
      ganttInstance.value = instance
      currentOptions = ganttOptions
      currentConfig = config
      currentThemes = themes
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
    } catch (error) {
      console.warn('全屏切换失败:', error)
      isFullscreen.value = document.fullscreenElement === container
    }
  }

  // SDK 自带容器 ResizeObserver，尺寸变化由它处理，避免调用内部 _resize。
  const handleFullscreenChange = () => {
    isFullscreen.value = document.fullscreenElement === ganttContainerRef.value
  }

  const updateData = (newData: T[]) => {
    if (ganttInstance.value && newData) {
      try {
        const records = processData(newData)
        ganttInstance.value.setRecords(records)
        if (currentOptions) currentOptions = { ...currentOptions, records }
      } catch (error) {
        console.warn('更新数据失败:', error)
      }
    }
  }

  const updateOptions = (newOptions: GanttOptions<T>) => {
    if (
      ganttInstance.value &&
      currentOptions &&
      currentConfig &&
      currentThemes
    ) {
      try {
        const nextConfig = mergeGanttOptions(currentConfig, newOptions)
        const nextOptions = resolveGanttOptions(
          currentThemes,
          nextConfig,
          currentOptions.records ?? []
        )
        ganttInstance.value.updateOption(nextOptions)
        currentOptions = nextOptions
        currentConfig = nextConfig
      } catch (error) {
        console.warn('更新配置失败:', error)
      }
    }
  }

  const destroyGantt = () => {
    const instance = ganttInstance.value
    ganttInstance.value = undefined
    currentOptions = undefined
    currentConfig = undefined
    currentThemes = undefined
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
    () => [props.options, props.preset],
    () => void initGantt(),
    { deep: true, flush: 'post' }
  )

  watch(
    themeStyle,
    () => {
      const instance = ganttInstance.value
      if (!instance) return
      // SDK 的公开 updateOption 会重新布局并可能定位标记线；换肤后恢复公开滚动坐标。
      const { scrollTop, scrollLeft } = instance
      updateOptions({})
      instance.scrollTop = scrollTop
      instance.scrollLeft = scrollLeft
    },
    { flush: 'post' }
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
  } satisfies {
    [K in keyof GanttExpose<T>]:
      GanttExpose<T>[K] | import('vue').Ref<GanttExpose<T>[K]>
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
