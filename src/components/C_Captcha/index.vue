<template>
  <div
    class="c-captcha-modern"
    :data-theme="theme"
  >
    <div
      v-if="isAltchaProvider"
      ref="altchaHost"
      class="altcha-provider"
      :class="{ 'is-disabled': disabled || verifying }"
    >
      <component
        v-if="altchaReady"
        :is="'altcha-widget'"
        class="altcha-widget"
      />
      <button
        v-else
        type="button"
        class="captcha-trigger"
        :class="{
          error: altchaLoadError,
          disabled: disabled || !altchaLoadError,
        }"
        :disabled="disabled || !altchaLoadError"
        :aria-busy="!altchaLoadError"
        @click="loadAltcha"
      >
        <span class="captcha-content">
          <span
            class="captcha-icon"
            aria-hidden="true"
          >
            <C_Icon
              :name="altchaLoadError ? 'captcha-error' : 'captcha-verifying'"
              type="svg"
              :svg-path="
                altchaLoadError
                  ? CAPTCHA_ICON_PATHS.error
                  : CAPTCHA_ICON_PATHS.verifying
              "
              :size="18"
              class="captcha-state-icon"
              :class="{
                'is-error': altchaLoadError,
                'is-spinning': !altchaLoadError,
              }"
            />
          </span>
          <span class="captcha-text">
            {{
              altchaLoadError ? t('captcha.loadFailed') : t('captcha.verifying')
            }}
          </span>
        </span>
      </button>
    </div>
    <div
      v-else
      class="captcha-shell"
    >
      <button
        type="button"
        class="captcha-trigger"
        :class="{
          verified: isVerified,
          error: hasError,
          disabled: disabled || verifying,
        }"
        :disabled="disabled || verifying || isVerified"
        :aria-busy="verifying"
        :aria-label="statusText"
        @click="showCaptcha"
      >
        <span class="captcha-content">
          <span
            class="captcha-icon"
            aria-hidden="true"
          >
            <C_Icon
              :name="statusIcon.name"
              type="svg"
              :svg-path="statusIcon.path"
              :size="20"
              class="captcha-state-icon"
              :class="{
                'is-spinning': verifying,
                'is-success': isVerified,
                'is-error': hasError,
              }"
            />
          </span>
          <span
            class="captcha-text"
            aria-live="polite"
          >
            <span v-if="verifying">{{ t('captcha.verifying') }}</span>
            <span
              v-else-if="isVerified"
              class="success-text"
            >
              {{ t('captcha.success') }}
            </span>
            <span
              v-else-if="hasError"
              class="error-text"
            >
              {{ t('captcha.failed') }}
            </span>
            <span v-else>{{ triggerText ?? t('captcha.trigger') }}</span>
          </span>
        </span>
      </button>
      <button
        v-if="isVerified || hasError"
        type="button"
        class="refresh-button"
        :title="t('captcha.reset')"
        :aria-label="t('captcha.reset')"
        @click="resetCaptcha"
      >
        <C_Icon
          name="captcha-refresh"
          type="svg"
          :svg-path="CAPTCHA_ICON_PATHS.refresh"
          :size="16"
        />
      </button>
    </div>
    <PuzzleVcode
      v-if="!isAltchaProvider"
      :show="showModal"
      :imgs="captchaImages"
      @success="handleSuccess"
      @close="handleClose"
      @fail="handlePuzzleFail"
    />
  </div>
</template>

<script setup lang="ts">
  import {
    computed,
    defineAsyncComponent,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
    type Component,
  } from 'vue'
  import type { AltchaWidgetElement } from 'altcha/types/generic'
  import { useComponentFeedback, useComponentLocale } from '../../config'
  import C_Icon from '../C_Icon/index.vue'
  import type {
    CaptchaEmits,
    CaptchaProof,
    CaptchaProps,
    CaptchaSuccessPayload,
  } from './types'
  import {
    CaptchaVerificationError,
    createCaptchaProof,
    verifyCaptchaProof,
  } from './verification'

  defineOptions({ name: 'C_Captcha' })

  const props = withDefaults(defineProps<CaptchaProps>(), {
    images: () => [],
    disabled: false,
    theme: 'dark',
    provider: 'puzzle-captcha',
    verificationTimeout: 10_000,
    requireServerVerification: false,
  })
  const emit = defineEmits<CaptchaEmits>()
  const feedback = useComponentFeedback(() => props.feedback)
  const { t } = useComponentLocale(() => props.locale)

  const CAPTCHA_ICON_PATHS = {
    default:
      'M12 2 3 6V12C3 17.25 6.84 22.74 12 24 17.16 22.74 21 17.25 21 12V6L12 2M12 4.18 19 7.3V12C19 16.18 16.2 20.62 12 21.82 7.8 20.62 5 16.18 5 12V7.3L12 4.18M11 8V14.17L8.41 11.59 7 13 12 18 17 13 15.59 11.58 13 14.17V8H11Z',
    verifying: 'M12 4V2A10 10 0 0 0 2 12H4A8 8 0 0 1 12 4Z',
    success:
      'M12 2 4 5V11C4 16.55 7.84 21.74 12 23 16.16 21.74 20 16.55 20 11V5L12 2M12 4.18 18 6.42V11C18 15.45 15.18 19.69 12 20.82 8.82 19.69 6 15.45 6 11V6.42L12 4.18M10 17 16 11 14.59 9.58 10 13.17 8.41 11.58 7 13 10 17Z',
    error:
      'M12 2C6.48 2 2 6.48 2 12S6.48 22 12 22 22 17.52 22 12 17.52 2 12 2M13 17H11V15H13V17M13 13H11V7H13V13Z',
    refresh:
      'M17.65 6.35C16.2 4.9 14.21 4 12 4 7.58 4 4 7.58 4 12S7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.82 16.33 14.61 18 12 18 8.69 18 6 15.31 6 12S8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H21V3L17.65 6.35Z',
  } as const

  const PuzzleVcode: Component =
    typeof window === 'undefined'
      ? () => null
      : defineAsyncComponent({
          loader: () =>
            import('vue3-puzzle-vcode').then(module => module.default),
          onError(error, _retry, fail) {
            feedback.error(t('captcha.loadFailed'), error)
            emit('load-error', error)
            fail()
          },
        })

  const showModal = ref(false)
  const isVerified = ref(false)
  const hasError = ref(false)
  const verifying = ref(false)
  const altchaHost = ref<HTMLElement | null>(null)
  const altchaReady = ref(false)
  const altchaLoadError = ref<Error | null>(null)
  const verificationData = ref<CaptchaSuccessPayload | null>(null)
  let errorTimer: ReturnType<typeof setTimeout> | null = null
  let verificationController: AbortController | null = null
  let altchaWidget: AltchaWidgetElement | null = null
  let altchaLoadGeneration = 0
  let interactionActive = false

  const isAltchaProvider = computed(() => props.provider === 'altcha')

  const captchaImages = computed(() =>
    props.images.length > 0 ? props.images : undefined
  )
  const statusIcon = computed(() => {
    if (verifying.value) {
      return { name: 'captcha-verifying', path: CAPTCHA_ICON_PATHS.verifying }
    }
    if (isVerified.value) {
      return { name: 'captcha-success', path: CAPTCHA_ICON_PATHS.success }
    }
    if (hasError.value) {
      return { name: 'captcha-error', path: CAPTCHA_ICON_PATHS.error }
    }
    return { name: 'captcha-default', path: CAPTCHA_ICON_PATHS.default }
  })
  const statusText = computed(() => {
    if (verifying.value) return t('captcha.verifying')
    if (isVerified.value) return t('captcha.success')
    if (hasError.value) return t('captcha.failed')
    return props.triggerText ?? t('captcha.trigger')
  })

  const clearErrorTimer = () => {
    if (!errorTimer) return
    clearTimeout(errorTimer)
    errorTimer = null
  }

  const setInteractionActive = (active: boolean) => {
    if (interactionActive === active) return
    interactionActive = active
    emit('visible-change', active)
  }

  const setModalVisible = (visible: boolean) => {
    if (showModal.value === visible) return
    showModal.value = visible
    setInteractionActive(visible)
  }

  const showError = (message: string, cause?: unknown) => {
    isVerified.value = false
    hasError.value = true
    verificationData.value = null
    clearErrorTimer()
    errorTimer = setTimeout(() => {
      hasError.value = false
      errorTimer = null
    }, 3000)
    emit('fail', message)
    emit('change', false)
    if (cause) emit('verify-error', cause)
  }

  const shouldIgnoreVerificationError = (
    controller: AbortController,
    error: unknown
  ): boolean =>
    verificationController !== controller ||
    (error instanceof CaptchaVerificationError && error.code === 'aborted')

  const finishVerification = (controller: AbortController) => {
    if (verificationController !== controller) return
    verificationController = null
    verifying.value = false
    setInteractionActive(false)
  }

  const verifyProof = async (
    proof: CaptchaProof,
    requireServerVerification = props.requireServerVerification
  ) => {
    hasError.value = false
    verificationController?.abort()
    const controller = new AbortController()
    verificationController = controller
    verifying.value = true
    setInteractionActive(true)

    try {
      const result = await verifyCaptchaProof(proof, {
        verifier: props.verifier,
        timeout: props.verificationTimeout,
        requireServerVerification,
        signal: controller.signal,
      })
      if (verificationController !== controller) return
      verificationData.value = result
      isVerified.value = true
      emit('success', result)
      emit('change', true)
    } catch (error) {
      if (shouldIgnoreVerificationError(controller, error)) return
      const message =
        error instanceof Error ? error.message : t('captcha.failed')
      feedback.error(t('captcha.verifyFailed'), error)
      showError(message, error)
      if (proof.type === 'altcha') altchaWidget?.reset()
    } finally {
      finishVerification(controller)
    }
  }

  const handleSuccess = async () => {
    showModal.value = false
    await verifyProof(createCaptchaProof())
  }

  const handlePuzzleFail = () => {
    setModalVisible(false)
    showError(t('captcha.puzzleFailed'))
  }

  const handleClose = () => {
    setModalVisible(false)
  }

  type AltchaStateDetail = {
    payload?: string
    state?: string
  }

  const handleAltchaVerified = (event: Event) => {
    const payload = (event as CustomEvent<AltchaStateDetail>).detail?.payload
    if (!payload?.trim()) {
      showError(t('captcha.failed'))
      altchaWidget?.reset()
      setInteractionActive(false)
      return
    }
    void verifyProof(
      {
        token: payload,
        timestamp: Date.now(),
        type: 'altcha',
      },
      true
    )
  }

  const handleAltchaStateChange = (event: Event) => {
    const state = (event as CustomEvent<AltchaStateDetail>).detail?.state
    if (state === 'verifying') {
      setInteractionActive(true)
      return
    }
    if (state === 'error') {
      showError(t('captcha.failed'))
      setInteractionActive(false)
      return
    }
    if (state === 'expired') {
      isVerified.value = false
      verificationData.value = null
      emit('change', false)
      setInteractionActive(false)
    }
  }

  const unbindAltchaWidget = () => {
    if (!altchaWidget) return
    altchaWidget.removeEventListener('verified', handleAltchaVerified)
    altchaWidget.removeEventListener('statechange', handleAltchaStateChange)
    altchaWidget = null
  }

  const reportAltchaLoadError = (generation: number, cause: unknown) => {
    if (generation !== altchaLoadGeneration) return
    unbindAltchaWidget()
    altchaReady.value = false
    const error =
      cause instanceof Error ? cause : new Error(t('captcha.loadFailed'))
    altchaLoadError.value = error
    feedback.error(t('captcha.loadFailed'), error)
    emit('load-error', error)
  }

  const mountAltchaWidget = async (
    generation: number,
    challengeUrl: string
  ) => {
    await Promise.all([import('altcha'), import('altcha/i18n/zh-cn')])
    if (generation !== altchaLoadGeneration) return
    altchaReady.value = true
    await nextTick()
    if (generation !== altchaLoadGeneration) return
    const widget = altchaHost.value?.querySelector('altcha-widget')
    if (!widget) throw new Error('ALTCHA widget failed to initialize.')
    altchaWidget = widget
    widget.addEventListener('verified', handleAltchaVerified)
    widget.addEventListener('statechange', handleAltchaStateChange)
    widget.setAttribute('theme', props.theme)
    await widget.configure({
      auto: 'off',
      challenge: challengeUrl,
      display: 'standard',
      hideFooter: true,
      hideLogo: true,
      language: props.locale?.locale === 'en-US' ? 'en' : 'zh-cn',
      minDuration: 350,
      timeout: Math.max(props.verificationTimeout, 1_000),
      type: 'switch',
      workers: 1,
    })
  }

  const loadAltcha = async () => {
    const generation = ++altchaLoadGeneration
    unbindAltchaWidget()
    altchaReady.value = false
    altchaLoadError.value = null
    const challengeUrl = props.challengeUrl?.trim()
    if (!challengeUrl) {
      reportAltchaLoadError(
        generation,
        new Error('ALTCHA provider requires a server-owned challengeUrl.')
      )
      return
    }

    try {
      await mountAltchaWidget(generation, challengeUrl)
    } catch (cause) {
      reportAltchaLoadError(generation, cause)
    }
  }

  const showCaptcha = () => {
    if (props.disabled || verifying.value || isVerified.value) return
    hasError.value = false
    if (isAltchaProvider.value) {
      if (!altchaWidget) {
        void loadAltcha()
        return
      }
      void altchaWidget.verify().catch(error => {
        const cause = error instanceof Error ? error : new Error(String(error))
        feedback.error(t('captcha.verifyFailed'), cause)
        showError(cause.message, cause)
        setInteractionActive(false)
      })
      return
    }
    setModalVisible(true)
  }

  const resetCaptcha = () => {
    verificationController?.abort()
    verificationController = null
    verifying.value = false
    isVerified.value = false
    hasError.value = false
    setModalVisible(false)
    altchaWidget?.reset()
    verificationData.value = null
    clearErrorTimer()
    emit('reset')
    emit('change', false)
  }

  defineExpose({
    validate: () => isVerified.value,
    getToken: () => verificationData.value?.token ?? '',
    getVerificationData: () => verificationData.value,
    reset: resetCaptcha,
    show: showCaptcha,
  })

  onMounted(() => {
    if (isAltchaProvider.value) void loadAltcha()
  })

  watch(
    () => [
      props.provider,
      props.challengeUrl,
      props.theme,
      props.locale?.locale,
      props.verificationTimeout,
    ],
    () => {
      if (isAltchaProvider.value) {
        void loadAltcha()
        return
      }
      ++altchaLoadGeneration
      unbindAltchaWidget()
      altchaReady.value = false
      altchaLoadError.value = null
    }
  )

  onBeforeUnmount(() => {
    ++altchaLoadGeneration
    unbindAltchaWidget()
    verificationController?.abort()
    clearErrorTimer()
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
