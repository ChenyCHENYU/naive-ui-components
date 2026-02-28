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
        @ratio="handleRatio"
        @rotate="rotate"
        @flip-x="core.flipX"
        @flip-y="core.flipY"
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
            :can-move="true"
            :can-move-box="true"
            :original="false"
            :high="true"
            :full="false"
            :mode="'contain'"
            @real-time="handleRealTimePreview"
            @img-load="onImgLoad"
          />
          <div v-else class="c-image-cropper__placeholder">
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
        <NButton @click="handleCancel">取消</NButton>
        <NButton type="primary" :loading="exporting" @click="handleConfirm"
          >确认裁剪</NButton
        >
      </NSpace>
    </template>
  </NModal>

  <div v-else class="c-image-cropper">
    <div class="c-image-cropper__body">
      <CropperToolbar
        v-if="props.showToolbar"
        :current-ratio="currentRatio"
        :ratio-presets="ratioPresets"
        @ratio="handleRatio"
        @rotate="rotate"
        @flip-x="core.flipX"
        @flip-y="core.flipY"
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
            :can-move="true"
            :can-move-box="true"
            :original="false"
            :high="true"
            :full="false"
            :mode="'contain'"
            @real-time="handleRealTimePreview"
            @img-load="onImgLoad"
          />
          <div v-else class="c-image-cropper__placeholder">
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
import { ref, computed, watch } from "vue";
import { NModal, NButton, NSpace } from "naive-ui";
import { VueCropper } from "vue-cropper";
import C_Icon from "../C_Icon/index.vue";
import type {
  AspectRatioPreset,
  CropOutputFormat,
  ImageCropperExpose,
  ImageCropperProps,
} from "./types";
import { useCropperCore } from "./composables/useCropperCore";
import CropperToolbar from "./components/CropperToolbar.vue";
import CropperPreview from "./components/CropperPreview.vue";

defineOptions({ name: "C_ImageCropper" });

const props = withDefaults(defineProps<ImageCropperProps>(), {
  src: "",
  aspectRatio: 0,
  outputFormat: "png",
  outputQuality: 0.92,
  maxOutputWidth: 0,
  maxOutputHeight: 0,
  showPreview: true,
  showToolbar: true,
  circular: false,
  disabled: false,
  height: "400px",
  modal: false,
  modalTitle: "图片裁剪",
});

const emit = defineEmits<{
  crop: [result: any];
  ready: [];
  error: [error: Event];
  confirm: [result: any];
  cancel: [];
}>();

const imgSrc = ref(props.src);
const currentRatio = ref(props.aspectRatio);
const modalVisible = ref(false);
const exporting = ref(false);
const previewData = ref<any>(null);

const inlineCropperRef = ref<any>(null);
const modalCropperRef = ref<any>(null);

const activeCropperRef = computed(() =>
  props.modal ? modalCropperRef.value : inlineCropperRef.value,
);

const containerHeight = computed(() =>
  typeof props.height === "number" ? `${props.height}px` : props.height,
);

const vueCropperOutputType = computed(() => {
  const map: Record<CropOutputFormat, string> = {
    png: "png",
    jpeg: "jpeg",
    webp: "webp",
  };
  return map[props.outputFormat as CropOutputFormat] || "png";
});

const isFixed = computed(() => currentRatio.value > 0);

const fixedNumber = computed(() => {
  if (currentRatio.value <= 0) return [1, 1];
  if (currentRatio.value === 1) return [1, 1];
  if (Math.abs(currentRatio.value - 16 / 9) < 0.01) return [16, 9];
  if (Math.abs(currentRatio.value - 4 / 3) < 0.01) return [4, 3];
  if (Math.abs(currentRatio.value - 3 / 2) < 0.01) return [3, 2];
  return [Math.round(currentRatio.value * 100), 100];
});

const autoCropSize = computed(() => ({
  width: 300,
  height: currentRatio.value > 0 ? 300 / currentRatio.value : 200,
}));

const ratioPresets: AspectRatioPreset[] = [
  { label: "自由", value: 0 },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
];

const formatRef = computed(() => props.outputFormat as CropOutputFormat);
const qualityRef = computed(() => props.outputQuality);
const maxWRef = computed(() => props.maxOutputWidth);
const maxHRef = computed(() => props.maxOutputHeight);

const core = useCropperCore({
  format: formatRef,
  quality: qualityRef,
  maxWidth: maxWRef,
  maxHeight: maxHRef,
});

watch(activeCropperRef, (v) => {
  core.cropperRef.value = v;
});

function handleRealTimePreview(data: any) {
  previewData.value = data;
}
function onImgLoad(status: string) {
  if (status === "success") emit("ready");
}
function rotate(angle: number) {
  core.rotate(angle);
}
function handleRatio(v: number) {
  currentRatio.value = v;
}
function handleReset() {
  core.reset();
}

async function handleConfirm() {
  exporting.value = true;
  try {
    const result = await core.getCropResult();
    emit("confirm", result);
    emit("crop", result);
    modalVisible.value = false;
  } finally {
    exporting.value = false;
  }
}

function handleCancel() {
  modalVisible.value = false;
  emit("cancel");
}

function loadFile(file: File) {
  const reader = new FileReader();
  reader.onload = (e) => {
    imgSrc.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
}

watch(
  () => props.src,
  (v) => {
    imgSrc.value = v;
  },
);
watch(
  () => props.aspectRatio,
  (v) => {
    currentRatio.value = v;
  },
);

defineExpose<ImageCropperExpose>({
  getCropResult: core.getCropResult,
  rotate: core.rotate,
  zoom: core.zoom,
  flipX: core.flipX,
  flipY: core.flipY,
  reset: core.reset,
  setAspectRatio: (r: number) => {
    currentRatio.value = r;
  },
  loadFile,
  open: (src?: string) => {
    if (src) imgSrc.value = src;
    modalVisible.value = true;
  },
  close: () => {
    modalVisible.value = false;
  },
});
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
