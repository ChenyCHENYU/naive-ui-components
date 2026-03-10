<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-03-06
 * @Description: 用户引导组件（基于 driver.js）— 增强版
 * 支持：步骤分组 / 键盘导航 / 步骤回调 / 主题自定义 / 完成持久化
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <NTooltip
    v-if="props.showTrigger"
    placement="bottom"
    trigger="hover"
  >
    <template #trigger>
      <NButton
        text
        @click="startGuide"
      >
        <C_Icon
          :name="props.triggerIcon"
          :size="18"
        />
      </NButton>
    </template>
    <span>{{ props.triggerTooltip }}</span>
  </NTooltip>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { NTooltip, NButton } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import { driver } from 'driver.js'
  import 'driver.js/dist/driver.css'
  import type { GuideProps, GuideStep } from './types'

  defineOptions({ name: 'C_Guide' })

  const props = withDefaults(defineProps<GuideProps>(), {
    steps: () => [],
    doneBtnText: '完成',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    showProgress: true,
    keyboard: true,
    animate: true,
    allowClose: true,
    popoverClass: 'driverjs-theme',
    showTrigger: true,
    triggerTooltip: '功能引导',
    triggerIcon: 'mdi:sign-routes',
  })

  const emit = defineEmits<{
    /** 引导开始 */
    start: []
    /** 引导完成（走完全部步骤） */
    complete: []
    /** 引导被用户关闭（未完成） */
    close: [currentStep: number]
    /** 步骤切换 */
    'step-change': [stepIndex: number, step: GuideStep]
  }>()

  /** 持久化 key */
  const persistKey = computed(() => {
    const prefix = props.persistence?.keyPrefix ?? 'c_guide'
    return `${prefix}_completed`
  })

  /** 是否已完成引导 */
  const isCompleted = (): boolean => {
    if (!props.persistence?.enabled) return false
    try {
      return localStorage.getItem(persistKey.value) === 'true'
    } catch {
      return false
    }
  }

  /** 标记引导已完成 */
  const markCompleted = () => {
    if (!props.persistence?.enabled) return
    try {
      localStorage.setItem(persistKey.value, 'true')
    } catch {
      // localStorage 不可用时静默忽略
    }
  }

  /** 重置完成状态 */
  const resetCompleted = () => {
    try {
      localStorage.removeItem(persistKey.value)
    } catch {
      // 静默忽略
    }
  }

  /**
   * * @description: 过滤掉需要跳过的步骤
   * ! @return 有效步骤列表
   */
  const getActiveSteps = (): GuideStep[] => {
    return props.steps.filter(step => !step.skipIf?.())
  }

  /**
   * * @description: 构建主题相关的 CSS 变量
   * ! @return popoverClass 字符串
   */
  const buildPopoverClass = (): string => {
    const classes = [props.popoverClass]
    if (props.theme) {
      // 通过 CSS 变量注入主题
      const root = document.documentElement
      if (props.theme.popoverBgColor)
        root.style.setProperty(
          '--c-guide-popover-bg',
          props.theme.popoverBgColor
        )
      if (props.theme.popoverTextColor)
        root.style.setProperty(
          '--c-guide-popover-text',
          props.theme.popoverTextColor
        )
      if (props.theme.primaryColor)
        root.style.setProperty(
          '--c-guide-primary',
          props.theme.primaryColor
        )
      if (props.theme.overlayOpacity !== undefined)
        root.style.setProperty(
          '--c-guide-overlay-opacity',
          String(props.theme.overlayOpacity)
        )
      if (props.theme.borderRadius)
        root.style.setProperty(
          '--c-guide-radius',
          props.theme.borderRadius
        )
    }
    return classes.filter(Boolean).join(' ')
  }

  /**
   * * @description: 启动引导流程
   * ? @param {boolean} force 是否强制启动（忽略持久化状态）
   */
  const startGuide = (force = false) => {
    if (!force && isCompleted()) return

    const activeSteps = getActiveSteps()
    if (!activeSteps.length) {
      console.warn(
        '[C_Guide] 未提供引导步骤（steps），请通过 :steps prop 传入。'
      )
      return
    }

    let currentStepIndex = 0

    const driverObj = driver({
      popoverClass: buildPopoverClass(),
      animate: props.animate,
      showProgress: props.showProgress,
      allowClose: props.allowClose,
      doneBtnText: props.doneBtnText,
      nextBtnText: props.nextBtnText,
      prevBtnText: props.prevBtnText,
      steps: activeSteps.map(step => ({
        element: step.element,
        popover: step.popover,
      })),
      onHighlightStarted: (_el) => {
        const step = activeSteps[currentStepIndex]
        if (step) {
          step.onHighlightStarted?.(_el as Element | undefined, step)
          emit('step-change', currentStepIndex, step)
        }
      },
      onDeselected: (_el) => {
        const step = activeSteps[currentStepIndex]
        step?.onDeselected?.(_el as Element | undefined, step)
        currentStepIndex++
      },
      onDestroyStarted: () => {
        if (currentStepIndex >= activeSteps.length) {
          markCompleted()
          emit('complete')
        } else {
          emit('close', currentStepIndex)
        }
        driverObj.destroy()
      },
    })

    emit('start')
    driverObj.drive()
  }

  defineExpose({
    startGuide,
    resetCompleted,
    isCompleted,
  })
</script>
