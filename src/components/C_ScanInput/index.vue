<template>
  <div
    class="c-scan-input"
    :style="theme"
  >
    <div class="c-scan-input__controls">
      <NInput
        :value="modelValue ?? ''"
        :disabled="disabled"
        :size="size"
        :placeholder="placeholder ?? t('scan.placeholder')"
        :input-props="{ 'aria-label': t('scan.input') }"
        @update:value="updateManualValue"
        @keydown.enter="submit"
      />
      <NButton
        v-if="camera && canCamera"
        :size="size"
        :disabled="disabled || mode === 'camera'"
        @click="openCamera"
        >{{ t('scan.camera') }}</NButton
      >
      <NButton
        v-if="photo && canPhoto"
        :size="size"
        :disabled="disabled || mode === 'photo'"
        @click="photoInput?.click()"
        >{{ t('scan.photo') }}</NButton
      >
      <NButton
        v-if="mode"
        :size="size"
        @click="stop"
        >{{ t('scan.cancel') }}</NButton
      >
      <input
        v-if="photo && canPhoto"
        ref="photoInput"
        type="file"
        accept="image/*"
        hidden
        @change="selectPhoto"
      />
    </div>
    <video
      v-if="mode === 'camera'"
      ref="video"
      muted
      playsinline
      :aria-label="t('scan.preview')"
    />
    <p
      v-if="feedback"
      role="status"
      >{{ feedback }}</p
    >
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { NButton, NInput } from 'naive-ui'
  import { useComponentDensity } from '../../composables/useComponentDensity'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import { resolveComponentDensity } from '../../core/density'
  import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'
  import { CHINESE, ENGLISH } from './locale'
  import type { ScanInputEmits, ScanInputProps } from './types'
  import { useScanInput } from './useScanInput'

  defineOptions({ name: 'C_ScanInput' })
  const props = defineProps<ScanInputProps>()
  const emit = defineEmits<ScanInputEmits>()
  const theme = useComponentTheme()
  const density = useComponentDensity()
  const size = computed(() => resolveComponentDensity(density.value).size)
  const { t } = useScopedComponentLocale(CHINESE, ENGLISH, () => props.locale)
  const photoInput = ref<HTMLInputElement>()
  const {
    mode,
    message,
    video,
    canCamera,
    canPhoto,
    openCamera,
    scanPhoto,
    stop,
  } = useScanInput(
    props,
    (result, input) => {
      emit('update:modelValue', result.value)
      emit('scan', result, input)
    },
    (error, input) => emit('error', error, input)
  )
  const feedback = computed(() => {
    if (message.value) return t(`scan.${message.value}`)
    if (mode.value) return t(`scan.${mode.value}Progress`)
    if (
      (props.camera || props.photo) &&
      !(props.camera && canCamera.value) &&
      !(props.photo && canPhoto.value)
    )
      return t('scan.unavailable')
    return ''
  })

  function selectPhoto(event: Event) {
    const input = event.target
    if (!(input instanceof HTMLInputElement)) return
    const file = input.files?.[0]
    input.value = ''
    if (file) void scanPhoto(file)
  }

  function submit(event: KeyboardEvent) {
    if (
      event.isComposing ||
      event.keyCode === 229 ||
      props.disabled ||
      !props.modelValue
    )
      return
    event.preventDefault()
    emit('submit', props.modelValue)
  }

  function updateManualValue(value: string) {
    if (mode.value) stop()
    emit('update:modelValue', value)
  }
</script>

<style scoped lang="scss">
  .c-scan-input {
    display: grid;
    gap: 8px;
    min-width: 0;

    &__controls {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      :deep(.n-input) {
        flex: 1 1 160px;
      }
    }

    video {
      display: block;
      width: min(100%, 380px);
      max-height: 280px;
      border-radius: var(--c-radius, var(--c-theme-radius));
      background: var(--c-bg-muted, var(--c-theme-bg-muted));
    }

    p {
      margin: 0;
      color: var(--c-text-2, var(--c-theme-text-2));
      font-size: 0.875em;
    }
  }
</style>
