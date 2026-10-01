<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: 图片裁剪组件（基于 vue-cropper）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <NModal
    v-if="props.modal"
    v-model:show="modalVisible"
    preset="card"
    :title="props.modalTitle || '图片裁剪'"
    :style="{ width: '860px' }"
    :mask-closable="false"
    :closable="true"
  >
    <div class="c-image-cropper__body">
      <CropperToolbar
        v-if="props.showToolbar"
        :current-ratio="currentRatio"
        :ratio-presets="ratioPresets"
        :disabled="props.disabled || transforming || exporting || !ready"
        @ratio="handleRatio"
        @rotate="rotate"
        @flip-x="flipX"
        @flip-y="flipY"
        @zoom="core.zoom"
        @reset="handleReset"
      />
      <div class="c-image-cropper__workspace">
        <div
          class="c-image-cropper__canvas"
          :style="{ height: containerHeight }"
        >
          <VueCropper
            v-if="imgSrc"
            ref="modalCropperRef"
            :img="imgSrc"
            :output-size="props.outputQuality"
            :output-type="vueCropperOutputType"
            :can-scale="false"
            :auto-crop="true"
            :auto-crop-width="autoCropSize.width"
            :auto-crop-height="autoCropSize.height"
            :fixed="isFixed"
            :fixed-number="fixedNumber"
            :center-box="true"
            :info="true"
            :info-true="true"
            :can-move="!props.disabled && !exporting && !transforming"
            :can-move-box="!props.disabled && !exporting && !transforming"
            :fixed-box="props.disabled || exporting || transforming"
            :original="false"
            :high="true"
            :full="false"
            :mode="'contain'"
            @real-time="handleRealTimePreview"
            @img-load="onImgLoad"
          />
          <div
            v-else
            class="c-image-cropper__placeholder"
          >
            <C_Icon
              name="mdi:image-plus-outline"
              style="font-size: 48px; opacity: 0.3"
            />
            <span>请选择图片</span>
          </div>
        </div>
        <div
          v-if="props.showPreview && imgSrc"
          class="c-image-cropper__preview-panel"
        >
          <CropperPreview
            :preview-data="previewData"
            :circular="props.circular"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <NSpace justify="end">
        <NButton
          :disabled="exporting"
          @click="handleCancel"
          >取消</NButton
        >
        <NButton
          type="primary"
          :loading="exporting"
          :disabled="props.disabled || transforming || !ready"
          @click="handleConfirm"
          >确认裁剪</NButton
        >
      </NSpace>
    </template>
  </NModal>

  <div
    v-else
    class="c-image-cropper"
  >
    <div class="c-image-cropper__body">
      <CropperToolbar
        v-if="props.showToolbar"
        :current-ratio="currentRatio"
        :ratio-presets="ratioPresets"
        :disabled="props.disabled || transforming || exporting || !ready"
        @ratio="handleRatio"
        @rotate="rotate"
        @flip-x="flipX"
        @flip-y="flipY"
        @zoom="core.zoom"
        @reset="handleReset"
      />
      <div class="c-image-cropper__workspace">
        <div
          class="c-image-cropper__canvas"
          :style="{ height: containerHeight }"
        >
          <VueCropper
            v-if="imgSrc"
            ref="inlineCropperRef"
            :img="imgSrc"
            :output-size="props.outputQuality"
            :output-type="vueCropperOutputType"
            :can-scale="false"
            :auto-crop="true"
            :auto-crop-width="autoCropSize.width"
            :auto-crop-height="autoCropSize.height"
            :fixed="isFixed"
            :fixed-number="fixedNumber"
            :center-box="true"
            :info="true"
            :info-true="true"
            :can-move="!props.disabled && !exporting && !transforming"
            :can-move-box="!props.disabled && !exporting && !transforming"
            :fixed-box="props.disabled || exporting || transforming"
            :original="false"
            :high="true"
            :full="false"
            :mode="'contain'"
            @real-time="handleRealTimePreview"
            @img-load="onImgLoad"
          />
          <div
            v-else
            class="c-image-cropper__placeholder"
          >
            <C_Icon
              name="mdi:image-plus-outline"
              style="font-size: 48px; opacity: 0.3"
            />
            <span>请选择图片</span>
          </div>
        </div>
        <div
          v-if="props.showPreview && imgSrc"
          class="c-image-cropper__preview-panel"
        >
          <CropperPreview
            :preview-data="previewData"
            :circular="props.circular"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { NModal, NButton, NSpace } from 'naive-ui'
  import { VueCropper } from 'vue-cropper'
  import C_Icon from '../C_Icon/index.vue'
  import type {
    AspectRatioPreset,
    CropOutputFormat,
    CropResult,
    ImageCropperExpose,
    ImageCropperProps,
  } from './types'
  import { useCropperCore } from './composables/useCropperCore'
  import CropperToolbar from './components/CropperToolbar.vue'
  import CropperPreview from './components/CropperPreview.vue'
  import { flipImageSource, type FlipAxis } from './flipImageSource'

  defineOptions({ name: 'C_ImageCropper' })

  const props = withDefaults(defineProps<ImageCropperProps>(), {
    src: '',
    aspectRatio: 0,
    outputFormat: 'png',
    outputQuality: 0.92,
    maxOutputWidth: 0,
    maxOutputHeight: 0,
    showPreview: true,
    showToolbar: true,
    circular: false,
    disabled: false,
    height: '400px',
    modal: false,
    modalTitle: '图片裁剪',
  })

  const emit = defineEmits<{
    crop: [result: CropResult]
    ready: []
    error: [error: Error]
    confirm: [result: CropResult]
    cancel: []
  }>()

  const imgSrc = ref(props.src)
  const currentRatio = ref(props.aspectRatio)
  const modalVisible = ref(false)
  const exporting = ref(false)
  const transforming = ref(false)
  const ready = ref(false)
  const previewData = ref<any>(null)

  const inlineCropperRef = ref<any>(null)
  const modalCropperRef = ref<any>(null)

  const activeCropperRef = computed(() =>
    props.modal ? modalCropperRef.value : inlineCropperRef.value
  )

  const containerHeight = computed(() =>
    typeof props.height === 'number' ? `${props.height}px` : props.height
  )

  const vueCropperOutputType = computed(() => {
    const map: Record<CropOutputFormat, string> = {
      png: 'png',
      jpeg: 'jpeg',
      webp: 'webp',
    }
    return map[props.outputFormat as CropOutputFormat] || 'png'
  })

  const isFixed = computed(() => currentRatio.value > 0)

  const fixedNumber = computed(() => {
    if (currentRatio.value <= 0) return [1, 1]
    if (currentRatio.value === 1) return [1, 1]
    if (Math.abs(currentRatio.value - 16 / 9) < 0.01) return [16, 9]
    if (Math.abs(currentRatio.value - 4 / 3) < 0.01) return [4, 3]
    if (Math.abs(currentRatio.value - 3 / 2) < 0.01) return [3, 2]
    return [Math.round(currentRatio.value * 100), 100]
  })

  const autoCropSize = computed(() => ({
    width: 300,
    height: currentRatio.value > 0 ? 300 / currentRatio.value : 200,
  }))

  const ratioPresets: AspectRatioPreset[] = [
    { label: '自由', value: 0 },
    { label: '1:1', value: 1 },
    { label: '16:9', value: 16 / 9 },
    { label: '4:3', value: 4 / 3 },
    { label: '3:2', value: 3 / 2 },
  ]

  const formatRef = computed(() => props.outputFormat as CropOutputFormat)
  const qualityRef = computed(() => props.outputQuality)
  const maxWRef = computed(() => props.maxOutputWidth)
  const maxHRef = computed(() => props.maxOutputHeight)

  const core = useCropperCore({
    format: formatRef,
    quality: qualityRef,
    maxWidth: maxWRef,
    maxHeight: maxHRef,
  })

  watch(activeCropperRef, v => {
    core.cropperRef.value = v
  })

  function handleRealTimePreview(data: any) {
    previewData.value = data
  }
  function onImgLoad(status: string | Error) {
    ready.value = status === 'success'
    if (ready.value) emit('ready')
    else
      reportError(
        status instanceof Error
          ? status
          : new Error('Image could not be loaded')
      )
  }
  function rotate(angle: number) {
    if (props.disabled || transforming.value || exporting.value) return
    core.rotate(angle)
  }
  function handleRatio(v: number) {
    if (props.disabled || transforming.value || exporting.value) return
    currentRatio.value = v
  }
  function handleReset() {
    if (props.disabled || transforming.value || exporting.value) return
    ready.value = false
    core.reset()
  }

  function reportError(error: unknown) {
    emit('error', error instanceof Error ? error : new Error(String(error)))
  }

  async function flip(axis: FlipAxis) {
    if (
      props.disabled ||
      transforming.value ||
      exporting.value ||
      !imgSrc.value
    )
      return
    transforming.value = true
    const source = imgSrc.value
    try {
      const flipped = await flipImageSource(source, axis)
      if (imgSrc.value === source) imgSrc.value = flipped
    } catch (error) {
      reportError(error)
    } finally {
      transforming.value = false
    }
  }

  function flipX() {
    void flip('horizontal')
  }

  function flipY() {
    void flip('vertical')
  }

  async function getCropResult(): Promise<CropResult> {
    if (!ready.value || transforming.value)
      throw new Error('Image cropper is not ready')
    const source = imgSrc.value
    const result = await core.getCropResult()
    if (source !== imgSrc.value || !ready.value)
      throw new Error('Image changed during crop export')
    return result
  }

  async function handleConfirm() {
    if (props.disabled || transforming.value || exporting.value || !ready.value)
      return
    exporting.value = true
    try {
      const result = await getCropResult()
      if (!modalVisible.value) return
      emit('confirm', result)
      emit('crop', result)
      modalVisible.value = false
    } catch (error) {
      reportError(error)
    } finally {
      exporting.value = false
    }
  }

  function handleCancel() {
    modalVisible.value = false
    emit('cancel')
  }

  function loadFile(file: File) {
    if (!file.type.startsWith('image/')) {
      reportError(new Error('Please select an image file'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () =>
      reportError(new Error('Image file could not be read'))
    reader.onload = e => {
      if (typeof e.target?.result === 'string') imgSrc.value = e.target.result
    }
    reader.readAsDataURL(file)
  }

  watch(imgSrc, () => {
    ready.value = false
    previewData.value = null
  })
  watch(
    () => props.src,
    v => {
      imgSrc.value = v
    }
  )
  watch(
    () => props.aspectRatio,
    v => {
      currentRatio.value = v
    }
  )

  defineExpose<ImageCropperExpose>({
    getCropResult,
    rotate: core.rotate,
    zoom: core.zoom,
    flipX,
    flipY,
    reset: core.reset,
    setAspectRatio: (r: number) => {
      currentRatio.value = r
    },
    loadFile,
    open: (src?: string) => {
      if (src) imgSrc.value = src
      modalVisible.value = true
    },
    close: () => {
      modalVisible.value = false
    },
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
