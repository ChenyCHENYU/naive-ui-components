<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 进度条组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NProgress
    v-bind="progressProps"
    :percentage="processedPercentage"
    :processing="isAnimation"
  >
    <template
      v-if="showIndicator && hasIndicatorSlot"
      #default
    >
      <slot name="indicator" />
    </template>
  </NProgress>
</template>

<script lang="ts" setup>
  import {
    ref,
    computed,
    watch,
    useSlots,
    onMounted,
    onBeforeUnmount,
    type CSSProperties,
  } from 'vue'
  import { NProgress } from 'naive-ui'

  defineOptions({ name: 'C_Progress' })

  type CSS = CSSProperties | string

  interface Props {
    percentage: number | number[]
    isAnimation?: boolean
    time?: number
    type?: 'line' | 'circle' | 'multiple-circle' | 'dashboard'
    borderRadius?: number | string
    circleGap?: number
    color?: string | string[] | { stops: string[] } | Array<{ stops: string[] }>
    fillBorderRadius?: number | string
    gapDegree?: number
    gapOffsetDegree?: number
    height?: number
    indicatorPlacement?: 'inside' | 'outside'
    indicatorTextColor?: string
    offsetDegree?: number
    railColor?: string | string[]
    railStyle?: string | CSS | Array<string | CSS>
    showIndicator?: boolean
    status?: 'default' | 'success' | 'error' | 'warning' | 'info'
    strokeWidth?: number
    unit?: string
  }

  const props = withDefaults(defineProps<Props>(), {
    percentage: 0,
    isAnimation: false,
    time: 3000,
    indicatorPlacement: 'outside',
    showIndicator: true,
    status: 'default',
    strokeWidth: 7,
    unit: '%',
  })

  const slots = useSlots()
  const p = ref<number | number[]>(
    props.isAnimation && props.type !== 'multiple-circle'
      ? 0
      : Array.isArray(props.percentage)
        ? [...props.percentage]
        : props.percentage
  )

  const hasIndicatorSlot = computed(() => !!slots.indicator)

  const processedPercentage = computed(() => {
    return props.type === 'multiple-circle'
      ? Array.isArray(p.value)
        ? p.value
        : [p.value]
      : Array.isArray(p.value)
        ? p.value[0]
        : p.value
  })

  const progressProps = computed(() => ({
    type: props.type,
    borderRadius: props.borderRadius,
    circleGap: props.circleGap,
    color: props.color,
    fillBorderRadius: props.fillBorderRadius,
    gapDegree: props.gapDegree,
    gapOffsetDegree: props.gapOffsetDegree,
    height: props.height,
    indicatorPlacement: props.indicatorPlacement,
    indicatorTextColor: props.indicatorTextColor,
    offsetDegree: props.offsetDegree,
    railColor: props.railColor,
    railStyle: props.railStyle,
    showIndicator: props.showIndicator,
    status: props.status,
    strokeWidth: props.strokeWidth,
    unit: props.unit,
  }))

  let mounted = false
  let animationFrame: number | null = null

  function cancelAnimation() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame)
    animationFrame = null
  }

  function animateTo(targetValue: number, duration: number) {
    const current = Array.isArray(p.value) ? p.value[0] : p.value
    const startValue = Number.isFinite(current) ? current : 0
    if (startValue === targetValue) return
    const startTime = performance.now()

    function tick(now: number) {
      const progress = Math.min(Math.max((now - startTime) / duration, 0), 1)
      p.value = Math.round(startValue + (targetValue - startValue) * progress)
      if (progress < 1) animationFrame = requestAnimationFrame(tick)
      else animationFrame = null
    }

    animationFrame = requestAnimationFrame(tick)
  }

  function syncProgress() {
    cancelAnimation()
    const target = props.percentage
    if (props.type === 'multiple-circle') {
      p.value = Array.isArray(target) ? [...target] : [target]
      return
    }

    const rawValue = Array.isArray(target) ? target[0] : target
    const targetValue = Number.isFinite(rawValue) ? rawValue : 0
    const duration = Number.isFinite(props.time) ? Math.max(0, props.time) : 0
    if (!props.isAnimation || duration === 0) {
      p.value = targetValue
      return
    }

    animateTo(targetValue, duration)
  }

  watch(
    [
      () => props.percentage,
      () => props.isAnimation,
      () => props.type,
      () => props.time,
    ],
    () => {
      if (mounted) syncProgress()
    },
    { deep: true }
  )

  onMounted(() => {
    mounted = true
    syncProgress()
  })
  onBeforeUnmount(() => {
    mounted = false
    cancelAnimation()
  })
</script>
