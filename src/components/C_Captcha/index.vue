<template>
  <div
    class="c-captcha-modern"
    :data-theme="theme"
  >
    <div class="captcha-shell">
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
            <span v-if="verifying">…</span>
            <span
              v-else-if="isVerified"
              class="success-icon"
              >✓</span
            >
            <span
              v-else-if="hasError"
              class="error-icon"
              >!</span
            >
            <span v-else>↔</span>
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
            <span v-else>{{ triggerText || t('captcha.trigger') }}</span>
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
        ↻
      </button>
    </div>
    <PuzzleVcode
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
    onBeforeUnmount,
    ref,
    type Component,
  } from 'vue'
  import { useComponentFeedback, useComponentLocale } from '../../config'
  import type {
    CaptchaEmits,
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
    verificationTimeout: 10_000,
    requireServerVerification: false,
  })
  const emit = defineEmits<CaptchaEmits>()
  const feedback = useComponentFeedback(() => props.feedback)
  const { t } = useComponentLocale(() => props.locale)

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
  const verificationData = ref<CaptchaSuccessPayload | null>(null)
  let errorTimer: ReturnType<typeof setTimeout> | null = null
  let verificationController: AbortController | null = null

  const captchaImages = computed(() =>
    props.images.length > 0 ? props.images : undefined
  )
  const statusText = computed(() => {
    if (verifying.value) return t('captcha.verifying')
    if (isVerified.value) return t('captcha.success')
    if (hasError.value) return t('captcha.failed')
    return props.triggerText || t('captcha.trigger')
  })

  const clearErrorTimer = () => {
    if (!errorTimer) return
    clearTimeout(errorTimer)
    errorTimer = null
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

  const showCaptcha = () => {
    if (props.disabled || verifying.value || isVerified.value) return
    hasError.value = false
    showModal.value = true
  }

  const handleSuccess = async () => {
    showModal.value = false
    hasError.value = false
    verificationController?.abort()
    const controller = new AbortController()
    verificationController = controller
    verifying.value = true

    try {
      const result = await verifyCaptchaProof(createCaptchaProof(), {
        verifier: props.verifier,
        timeout: props.verificationTimeout,
        requireServerVerification: props.requireServerVerification,
        signal: controller.signal,
      })
      if (verificationController !== controller) return
      verificationData.value = result
      isVerified.value = true
      emit('success', result)
      emit('change', true)
    } catch (error) {
      if (
        verificationController !== controller ||
        (error instanceof CaptchaVerificationError && error.code === 'aborted')
      ) {
        return
      }
      const message =
        error instanceof Error ? error.message : t('captcha.failed')
      feedback.error(t('captcha.verifyFailed'), error)
      showError(message, error)
    } finally {
      if (verificationController === controller) {
        verificationController = null
        verifying.value = false
      }
    }
  }

  const handlePuzzleFail = () => {
    showModal.value = false
    showError(t('captcha.puzzleFailed'))
  }

  const handleClose = () => {
    showModal.value = false
  }

  const resetCaptcha = () => {
    verificationController?.abort()
    verificationController = null
    verifying.value = false
    isVerified.value = false
    hasError.value = false
    showModal.value = false
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

  onBeforeUnmount(() => {
    verificationController?.abort()
    clearErrorTimer()
  })
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
