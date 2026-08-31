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
  import { computed, onBeforeUnmount } from 'vue'
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
  let activeDriver: ReturnType<typeof driver> | null = null

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
  const buildPopoverClass = (): string => props.popoverClass || ''

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

    activeDriver?.destroy()
    let currentStepIndex = 0
    let completed = false

    const driverObj = driver({
      popoverClass: buildPopoverClass(),
      animate: props.animate,
      showProgress: props.showProgress,
      allowClose: props.allowClose,
      allowKeyboardControl: props.keyboard,
      overlayOpacity: props.theme?.overlayOpacity,
      doneBtnText: props.doneBtnText,
      nextBtnText: props.nextBtnText,
      prevBtnText: props.prevBtnText,
      steps: activeSteps.map(step => ({
        element: step.element,
        popover: step.popover,
      })),
      onPopoverRender: popover => {
        if (props.theme?.popoverBgColor)
          popover.wrapper.style.backgroundColor = props.theme.popoverBgColor
        if (props.theme?.popoverTextColor)
          popover.wrapper.style.color = props.theme.popoverTextColor
        if (props.theme?.borderRadius)
          popover.wrapper.style.borderRadius = props.theme.borderRadius
        if (props.theme?.primaryColor) {
          popover.nextButton.style.backgroundColor = props.theme.primaryColor
          popover.nextButton.style.borderColor = props.theme.primaryColor
        }
      },
      onHighlightStarted: (_el, _step, { state }) => {
        currentStepIndex = state.activeIndex ?? currentStepIndex
        const step = activeSteps[currentStepIndex]
        if (step) {
          step.onHighlightStarted?.(_el as Element | undefined, step)
          emit('step-change', currentStepIndex, step)
        }
      },
      onDeselected: _el => {
        const step = activeSteps[currentStepIndex]
        step?.onDeselected?.(_el as Element | undefined, step)
      },
      onNextClick: () => {
        if (driverObj.isLastStep()) {
          completed = true
          driverObj.destroy()
        } else {
          driverObj.moveNext()
        }
      },
      onDestroyStarted: () => {
        if (completed) {
          markCompleted()
          emit('complete')
        } else {
          emit('close', currentStepIndex)
        }
        activeDriver = null
        driverObj.destroy()
      },
    })

    emit('start')
    activeDriver = driverObj
    driverObj.drive()
  }

  onBeforeUnmount(() => {
    activeDriver?.destroy()
    activeDriver = null
  })

  defineExpose({
    startGuide,
    resetCompleted,
    isCompleted,
  })
</script>
