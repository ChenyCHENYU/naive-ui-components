<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @LastEditTime: 2026-10-04
 * @Description: 通用功能引导，按需加载引擎，支持可见目标、图文主题与完整生命周期
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <section
    v-if="props.checklist"
    class="c-guide-checklist"
    :style="themeStyle"
    :aria-label="props.checklist.title || t('guide.checklist')"
  >
    <header>
      <strong>{{ props.checklist.title || t('guide.checklist') }}</strong>
      <span role="status">{{
        t('guide.checklistProgress', {
          done: checklistProgress,
          total: checklistItems.length,
        })
      }}</span>
    </header>
    <ul>
      <li
        v-for="item in checklistItems"
        :key="item.id"
      >
        <button
          type="button"
          :disabled="loading"
          @click="startGuide(true, item.id)"
        >
          <span>{{ item.title }}</span>
          <span :class="{ 'is-complete': item.done }">{{
            t(item.done ? 'guide.checklistDone' : 'guide.checklistPending')
          }}</span>
        </button>
      </li>
    </ul>
  </section>
  <NTooltip
    v-else-if="props.showTrigger"
    placement="bottom"
    trigger="hover"
  >
    <template #trigger>
      <NButton
        class="c-guide-trigger"
        :style="themeStyle"
        text
        :loading="loading"
        :aria-label="props.triggerTooltip ?? t('guide.trigger')"
        @click="startGuide(true)"
      >
        <C_Icon
          :name="props.triggerIcon"
          :size="18"
        />
      </NButton>
    </template>
    <span>{{ props.triggerTooltip ?? t('guide.trigger') }}</span>
  </NTooltip>
</template>

<script setup lang="ts">
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { computed, onBeforeUnmount, ref, watch } from 'vue'
  import { NTooltip, NButton } from 'naive-ui'
  import type { Driver, PopoverDOM } from 'driver.js'
  import C_Icon from '../C_Icon/index.vue'
  import { renderGuideDescription, resolveGuideTarget } from './data'
  import type { GuideProps, GuideStep } from './types'
  import { useGuideLocale } from './locale'

  defineOptions({ name: 'C_Guide' })
  const themeStyle = useComponentTheme()
  const { t } = useGuideLocale()

  const props = withDefaults(defineProps<GuideProps>(), {
    steps: () => [],
    showSkipButton: true,
    showProgress: true,
    keyboard: true,
    animate: true,
    allowClose: true,
    skipMissingElements: true,
    popoverClass: 'driverjs-theme',
    showTrigger: true,
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
  const buttonText = computed(() => ({
    done: props.doneBtnText ?? t('guide.done'),
    next: props.nextBtnText ?? t('guide.next'),
    previous: props.prevBtnText ?? t('guide.previous'),
    skip: props.skipBtnText ?? t('guide.skip'),
  }))
  const loading = ref(false)
  const checklistItems = computed(() => {
    if (!props.checklist) return []
    const completed = new Set(props.checklist.completedIds)
    return props.steps.flatMap(step =>
      step.id && !step.skipIf?.()
        ? [
            {
              id: step.id,
              title: step.popover.title,
              done: completed.has(step.id),
            },
          ]
        : []
    )
  })
  const checklistProgress = computed(
    () => checklistItems.value.filter(item => item.done).length
  )
  const persistKey = computed(
    () => `${props.persistence?.keyPrefix ?? 'c_guide'}_completed`
  )
  let activeDriver: Driver | null = null
  let disposeActiveGuide: (() => void) | undefined
  let completeActiveAction: ((action: string) => boolean) | undefined
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
    completeActiveAction = undefined
    dispose?.()
  }

  const resolvePopoverTheme = (): Record<string, string> => {
    const theme = props.theme ?? {}
    return {
      '--c-guide-bg':
        theme.popoverBgColor ??
        'var(--c-bg-surface, var(--c-theme-bg-surface))',
      '--c-guide-text':
        theme.popoverTextColor ?? 'var(--c-text-1, var(--c-theme-text-1))',
      '--c-guide-text-secondary':
        theme.popoverTextColor ?? 'var(--c-text-2, var(--c-theme-text-2))',
      '--c-guide-text-muted': 'var(--c-text-3, var(--c-theme-text-3))',
      '--c-guide-primary':
        theme.primaryColor ?? 'var(--c-primary, var(--c-theme-primary))',
      '--c-guide-primary-hover':
        theme.primaryColor ??
        'var(--c-primary-hover, var(--c-theme-primary-hover))',
      '--c-guide-border': 'var(--c-border, var(--c-theme-border))',
      '--c-guide-radius': theme.borderRadius ?? '14px',
    }
  }

  let appliedThemeKeys: string[] = []
  /** 仅更新本实例创建的 body 弹层；保留直接传入的语义变量，不搬运布局样式。 */
  const applyPopoverTheme = (popover: PopoverDOM): void => {
    for (const name of appliedThemeKeys)
      popover.wrapper.style.removeProperty(name)
    const variables = resolvePopoverTheme()
    for (const [name, value] of Object.entries(themeStyle.value))
      if (value !== undefined && value !== null) variables[name] = String(value)
    appliedThemeKeys = Object.keys(variables)
    for (const [name, value] of Object.entries(variables))
      popover.wrapper.style.setProperty(name, value)
  }

  /** 未指定透明度时保留 Driver 默认值，避免 undefined 覆盖默认配置。 */
  const getOverlayOptions = () =>
    props.theme?.overlayOpacity === undefined
      ? {}
      : { overlayOpacity: props.theme.overlayOpacity }

  /** 自动启动遵守完成状态；用户点击入口可强制重看。 */
  const shouldSkipStart = (force: boolean): boolean =>
    loading.value || (!force && isCompleted())

  const shouldAnimate = () =>
    props.animate &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function resolveStart(fromStepId?: string) {
    const activeSteps = props.steps.filter(
      step =>
        !step.skipIf?.() &&
        (!props.skipMissingElements ||
          !step.element ||
          resolveGuideTarget(step.element))
    )
    const initialIndex =
      fromStepId === undefined
        ? 0
        : activeSteps.findIndex(step => step.id === fromStepId)
    if (!activeSteps[initialIndex]) return
    return { activeSteps, initialIndex }
  }

  /** 用户打开后加载引擎，加载期间卸载、配置变更或停止会取消待启动任务。 */
  const startGuide = async (
    force = false,
    fromStepId?: string
  ): Promise<void> => {
    if (shouldSkipStart(force)) return
    stopGuide()
    const request = generation
    loading.value = true
    try {
      const { driver } = await import('driver.js')
      if (request !== generation) return
      const start = resolveStart(fromStepId)
      if (!start) return
      const { activeSteps, initialIndex } = start
      let reason: 'close' | 'complete' | 'dispose' | 'skip' = 'close'
      let currentStepIndex = initialIndex
      let finalized = false
      let transitioning = false
      const completedIds = new Set(props.checklist?.completedIds)
      const completedActions = new Set(
        activeSteps.flatMap((step, index) =>
          step.id && completedIds.has(step.id) ? [index] : []
        )
      )
      let advanceAfterHighlight = false
      const waitingForAction = () =>
        Boolean(activeSteps[currentStepIndex]?.action) &&
        !completedActions.has(currentStepIndex)
      /** 首帧及动画期间锁定导航，避免 Driver 留下上一步的高亮标记。 */
      const updateNavigation = (popover: PopoverDOM): void => {
        const waiting = waitingForAction()
        popover.nextButton.disabled = transitioning || waiting
        if (waiting) {
          popover.nextButton.title = t('guide.waitingForAction')
        } else {
          popover.nextButton.removeAttribute('title')
        }
        popover.previousButton.disabled = transitioning
      }
      /** Driver 在首帧前销毁时不会调用 onDestroyed，所有退出路径仍需完成清理。 */
      const finalizeGuide = (): void => {
        if (finalized) return
        finalized = true
        if (activeDriver === driverObj) {
          activeDriver = null
          disposeActiveGuide = undefined
          completeActiveAction = undefined
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
        if (transitioning || waitingForAction()) return
        if (driverObj.isLastStep()) {
          reason = 'complete'
          destroyGuide()
        } else driverObj.moveNext()
      }
      const overlayOptions = getOverlayOptions()
      const driverObj = driver({
        popoverClass: `c-guide-popover ${props.popoverClass}`.trim(),
        animate: shouldAnimate(),
        showProgress: props.showProgress,
        progressText: '{{current}} / {{total}}',
        allowClose: props.allowClose,
        allowKeyboardControl: props.keyboard,
        skipMissingElement: props.skipMissingElements,
        ...overlayOptions,
        doneBtnText: buttonText.value.done,
        nextBtnText: buttonText.value.next,
        prevBtnText: buttonText.value.previous,
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
            if (advanceAfterHighlight) {
              advanceAfterHighlight = false
              const step = currentStepIndex
              queueMicrotask(() => {
                if (activeDriver === driverObj && step === currentStepIndex)
                  advanceGuide()
              })
            }
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
            skipButton.textContent = buttonText.value.skip
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
      completeActiveAction = action => {
        if (
          driverObj.getActiveIndex() !== currentStepIndex ||
          !waitingForAction() ||
          activeSteps[currentStepIndex]?.action !== action
        )
          return false
        completedActions.add(currentStepIndex)
        if (transitioning) advanceAfterHighlight = true
        else advanceGuide()
        return true
      }
      disposeActiveGuide = () => {
        reason = 'dispose'
        destroyGuide()
      }
      emit('start')
      if (request === generation) driverObj.drive(initialIndex)
    } catch (error) {
      if (request === generation) {
        stopGuide()
        emit('error', error)
      }
    } finally {
      if (request === generation) loading.value = false
    }
  }

  watch(buttonText, ({ done, next, previous, skip }) => {
    if (!activeDriver) return
    activeDriver.setConfig({
      ...activeDriver.getConfig(),
      doneBtnText: done,
      nextBtnText: next,
      prevBtnText: previous,
    })
    const { popover } = activeDriver.getState()
    if (popover) {
      popover.nextButton.textContent = activeDriver.isLastStep() ? done : next
      popover.previousButton.textContent = previous
      const skipButton = popover.footer.querySelector('.c-guide-skip-btn')
      if (skipButton) skipButton.textContent = skip
    }
  })

  onBeforeUnmount(stopGuide)
  watch(() => props.steps, stopGuide)
  watch(
    [themeStyle, () => props.theme],
    () => {
      const popover = activeDriver?.getState().popover
      if (popover) applyPopoverTheme(popover)
    },
    { deep: true }
  )

  const completeAction = (action: string): boolean =>
    completeActiveAction?.(action) ?? false

  defineExpose({
    startGuide,
    completeAction,
    stopGuide,
    resetCompleted,
    isCompleted,
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
<style lang="scss">
  @use './popover.scss';
</style>
