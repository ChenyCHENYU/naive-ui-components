<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @LastEditTime: 2026-10-04
 * @Description: 通用功能引导，按需加载引擎，支持可见目标、图文主题与完整生命周期
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
        class="c-guide-trigger"
        text
        :loading="loading"
        :aria-label="props.triggerTooltip"
        @click="startGuide(true)"
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
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { NTooltip, NButton, useThemeVars } from 'naive-ui'
  import type { Driver, PopoverDOM } from 'driver.js'
  import C_Icon from '../C_Icon/index.vue'
  import { renderGuideDescription, resolveGuideTarget } from './data'
  import type { GuideProps, GuideStep } from './types'

  defineOptions({ name: 'C_Guide' })

  const props = withDefaults(defineProps<GuideProps>(), {
    steps: () => [],
    doneBtnText: '完成',
    nextBtnText: '下一步',
    prevBtnText: '上一步',
    showSkipButton: true,
    skipBtnText: '跳过引导',
    showProgress: true,
    keyboard: true,
    animate: true,
    allowClose: true,
    skipMissingElements: true,
    popoverClass: 'driverjs-theme',
    showTrigger: true,
    triggerTooltip: '功能引导',
    triggerIcon: 'mdi:sign-routes',
  })
  const emit = defineEmits<{
    start: []
    complete: []
    close: [currentStep: number]
    skip: [currentStep: number]
    'step-change': [stepIndex: number, step: GuideStep]
    error: [error: unknown]
  }>()
  const themeVars = useThemeVars()
  const loading = ref(false)
  const persistKey = computed(
    () => `${props.persistence?.keyPrefix ?? 'c_guide'}_completed`
  )
  let activeDriver: Driver | null = null
  let disposeActiveGuide: (() => void) | undefined
  let generation = 0

  /** 读取当前引导的完成状态；存储不可用时仍允许使用。 */
  const isCompleted = (): boolean => {
    if (!props.persistence?.enabled) return false
    try {
      return localStorage.getItem(persistKey.value) === 'true'
    } catch {
      return false
    }
  }

  /** 仅在用户走完引导时记住完成状态。 */
  const markCompleted = (): void => {
    if (!props.persistence?.enabled) return
    try {
      localStorage.setItem(persistKey.value, 'true')
    } catch {
      /* 存储不可用时保留本次操作。 */
    }
  }

  /** 清除完成状态，用于重新展示新版本引导。 */
  const resetCompleted = (): void => {
    try {
      localStorage.removeItem(persistKey.value)
    } catch {
      /* 存储不可用时忽略。 */
    }
  }

  /** 主动停止或卸载不视为用户完成，也不触发用户关闭事件。 */
  const stopGuide = (): void => {
    generation++
    loading.value = false
    const dispose = disposeActiveGuide
    disposeActiveGuide = undefined
    dispose?.()
  }

  /** 将 Provider 中的主题映射到挂载在 body 的弹层，支持独立消费与实时切换。 */
  const applyPopoverTheme = (popover: PopoverDOM): void => {
    const theme = props.theme ?? {}
    const variables: Record<string, string> = {
      '--c-guide-bg': theme.popoverBgColor ?? themeVars.value.popoverColor,
      '--c-guide-text': theme.popoverTextColor ?? themeVars.value.textColor1,
      '--c-guide-text-secondary':
        theme.popoverTextColor ?? themeVars.value.textColor2,
      '--c-guide-text-muted': themeVars.value.textColor3,
      '--c-guide-primary': theme.primaryColor ?? themeVars.value.primaryColor,
      '--c-guide-primary-hover':
        theme.primaryColor ?? themeVars.value.primaryColorHover,
      '--c-guide-border': themeVars.value.borderColor,
      '--c-guide-radius': theme.borderRadius ?? '14px',
    }
    for (const [name, value] of Object.entries(variables)) {
      popover.wrapper.style.setProperty(name, value)
    }
  }

  /** 未指定透明度时保留 Driver 默认值，避免 undefined 覆盖默认配置。 */
  const getOverlayOptions = () =>
    props.theme?.overlayOpacity === undefined
      ? {}
      : { overlayOpacity: props.theme.overlayOpacity }

  /** 自动启动遵守完成状态；用户点击入口可强制重看。 */
  const shouldSkipStart = (force: boolean): boolean =>
    loading.value || (!force && isCompleted())

  /** 用户打开后加载引擎，加载期间卸载、配置变更或停止会取消待启动任务。 */
  const startGuide = async (force = false): Promise<void> => {
    if (shouldSkipStart(force)) return
    stopGuide()
    const request = generation
    loading.value = true
    try {
      const { driver } = await import('driver.js')
      if (request !== generation) return
      const activeSteps = props.steps.filter(
        step =>
          !step.skipIf?.() &&
          (!props.skipMissingElements ||
            !step.element ||
            resolveGuideTarget(step.element))
      )
      if (!activeSteps.length) return
      let reason: 'close' | 'complete' | 'dispose' | 'skip' = 'close'
      let currentStepIndex = 0
      let finalized = false
      let transitioning = false
      /** 首帧及动画期间锁定导航，避免 Driver 留下上一步的高亮标记。 */
      const updateNavigation = (popover: PopoverDOM): void => {
        popover.nextButton.disabled = transitioning
        popover.previousButton.disabled = transitioning
      }
      /** Driver 在首帧前销毁时不会调用 onDestroyed，所有退出路径仍需完成清理。 */
      const finalizeGuide = (): void => {
        if (finalized) return
        finalized = true
        if (activeDriver === driverObj) {
          activeDriver = null
          disposeActiveGuide = undefined
        }
        if (reason === 'complete') {
          markCompleted()
          emit('complete')
        } else if (reason !== 'dispose') {
          if (reason === 'skip') emit('skip', currentStepIndex)
          emit('close', currentStepIndex)
        }
      }
      const destroyGuide = (): void => {
        driverObj.destroy()
        finalizeGuide()
      }
      const advanceGuide = (): void => {
        if (transitioning) return
        if (driverObj.isLastStep()) {
          reason = 'complete'
          destroyGuide()
        } else driverObj.moveNext()
      }
      const overlayOptions = getOverlayOptions()
      const driverObj = driver({
        popoverClass: `c-guide-popover ${props.popoverClass}`.trim(),
        animate:
          props.animate &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        showProgress: props.showProgress,
        progressText: '{{current}} / {{total}}',
        allowClose: props.allowClose,
        allowKeyboardControl: props.keyboard,
        skipMissingElement: props.skipMissingElements,
        ...overlayOptions,
        doneBtnText: props.doneBtnText,
        nextBtnText: props.nextBtnText,
        prevBtnText: props.prevBtnText,
        steps: activeSteps.map(step => ({
          // Driver 运行时允许动态目标返回 undefined，但 1.8 的声明仍限定 Element。
          element: step.element
            ? () => resolveGuideTarget(step.element) as Element
            : undefined,
          popover: {
            ...step.popover,
            description: renderGuideDescription(step),
          },
          onHighlightStarted: (element, _step, { state }) => {
            transitioning = true
            currentStepIndex = state.activeIndex ?? currentStepIndex
            step.onHighlightStarted?.(element, step)
            emit('step-change', currentStepIndex, step)
          },
          onHighlighted: () => {
            transitioning = false
            const { popover } = driverObj.getState()
            if (popover) updateNavigation(popover)
          },
          onDeselected: element => step.onDeselected?.(element, step),
        })),
        onPopoverRender: popover => {
          applyPopoverTheme(popover)
          updateNavigation(popover)
          if (props.showSkipButton && props.allowClose) {
            const skipButton = document.createElement('button')
            skipButton.type = 'button'
            skipButton.className = 'c-guide-skip-btn'
            skipButton.textContent = props.skipBtnText
            skipButton.addEventListener('click', () => {
              reason = 'skip'
              destroyGuide()
            })
            popover.footer.prepend(skipButton)
          }
        },
        onNextClick: advanceGuide,
        onPrevClick: () => {
          if (!transitioning) driverObj.movePrevious()
        },
        onDestroyStarted: destroyGuide,
        onDestroyed: finalizeGuide,
      })
      activeDriver = driverObj
      disposeActiveGuide = () => {
        reason = 'dispose'
        destroyGuide()
      }
      emit('start')
      if (request === generation) driverObj.drive()
    } catch (error) {
      if (request === generation) {
        stopGuide()
        emit('error', error)
      }
    } finally {
      if (request === generation) loading.value = false
    }
  }

  onBeforeUnmount(stopGuide)
  watch(() => props.steps, stopGuide)
  watch(
    [themeVars, () => props.theme],
    () => {
      const popover = activeDriver?.getState().popover
      if (popover) applyPopoverTheme(popover)
    },
    { deep: true }
  )

  defineExpose({ startGuide, stopGuide, resetCompleted, isCompleted })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
<style lang="scss">
  @use './popover.scss';
</style>
