<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: 电子签名组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-signature">
    <div v-if="showToolbar" class="signature-toolbar">
      <div class="toolbar-section">
        <NButtonGroup>
          <NButton
            :type="currentMode === 'pen' ? 'primary' : 'default'"
            size="small"
            @click="currentMode = 'pen'"
          >
            <template #icon>
              <C_Icon name="mdi:draw" :size="16" color="currentColor" />
            </template>
            画笔
          </NButton>
          <NButton
            :type="currentMode === 'eraser' ? 'primary' : 'default'"
            size="small"
            @click="currentMode = 'eraser'"
          >
            <template #icon>
              <C_Icon name="mdi:eraser" :size="16" color="currentColor" />
            </template>
            橡皮擦
          </NButton>
        </NButtonGroup>
      </div>

      <div class="toolbar-section divider" />

      <div v-if="currentMode === 'pen'" class="toolbar-section">
        <span class="section-label">颜色</span>
        <NColorPicker
          v-model:value="currentPenConfig.color"
          :show-alpha="false"
          size="small"
          :swatches="PRESET_COLORS"
        />
      </div>

      <div v-if="currentMode === 'pen'" class="toolbar-section">
        <span class="section-label">粗细</span>
        <NInputNumber
          v-model:value="currentPenConfig.width"
          :min="1"
          :max="20"
          size="small"
          style="width: 80px"
        />
      </div>

      <div class="toolbar-section divider" />

      <div class="toolbar-section">
        <NButton size="small" :disabled="!canUndo" @click="handleUndo">
          <template #icon>
            <C_Icon name="mdi:undo" :size="16" color="currentColor" />
          </template>
          撤销
        </NButton>
        <NButton size="small" :disabled="!canRedo" @click="handleRedo">
          <template #icon>
            <C_Icon name="mdi:redo" :size="16" color="currentColor" />
          </template>
          重做
        </NButton>
      </div>

      <div class="toolbar-section divider" />

      <div class="toolbar-section">
        <NButton
          size="small"
          type="error"
          :disabled="isEmpty"
          @click="handleClear"
        >
          <template #icon>
            <C_Icon name="mdi:delete-outline" :size="16" color="currentColor" />
          </template>
          清空
        </NButton>
      </div>
    </div>

    <div
      class="signature-canvas-wrapper"
      :class="{ disabled, readonly }"
      :style="{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: backgroundColor || 'transparent',
      }"
    >
      <canvas
        ref="canvasRef"
        class="signature-canvas"
        :class="{ disabled, readonly }"
      />
      <div v-if="isEmpty && !disabled && !readonly" class="canvas-placeholder">
        请在此处签名
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, toRef, onMounted, onUnmounted } from "vue";
import { NButton, NButtonGroup, NColorPicker, NInputNumber } from "naive-ui";
import C_Icon from "../C_Icon/index.vue";
import { useSignatureCanvas } from "./composables/useSignatureCanvas";
import { useSignatureHistory } from "./composables/useSignatureHistory";
import { useSignatureExport } from "./composables/useSignatureExport";
import {
  DEFAULT_PEN_CONFIG,
  DEFAULT_WATERMARK_CONFIG,
  PRESET_COLORS,
} from "./data";
import type {
  ExportOptions,
  PenConfig,
  PenMode,
  SignatureExpose,
  SignaturePoint,
  SignatureProps,
  SignatureStroke,
  WatermarkConfig,
} from "./types";

defineOptions({ name: "C_Signature" });

const props = withDefaults(defineProps<SignatureProps>(), {
  width: "100%",
  height: 300,
  disabled: false,
  readonly: false,
  showToolbar: true,
  maxHistory: 50,
});

const emit = defineEmits<{
  "start-draw": [];
  drawing: [point: SignaturePoint];
  "end-draw": [stroke: SignatureStroke];
  clear: [];
  undo: [];
  redo: [];
  change: [data: SignatureStroke[]];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const currentMode = ref<PenMode>("pen");
const currentPenConfig = reactive<PenConfig>({
  ...DEFAULT_PEN_CONFIG,
  ...props.penConfig,
});
const currentWatermark = reactive<WatermarkConfig>({
  ...DEFAULT_WATERMARK_CONFIG,
  ...props.watermark,
});

const {
  strokes,
  canUndo,
  canRedo,
  isEmpty,
  addStroke,
  undo,
  redo,
  clear,
  loadData,
} = useSignatureHistory({
  maxHistory: props.maxHistory,
  onChange: (data) => {
    canvasInstance.redrawStrokes(data as SignatureStroke[]);
    emit("change", data as SignatureStroke[]);
  },
});

const canvasInstance = useSignatureCanvas({
  canvasRef,
  penConfig: toRef(currentPenConfig),
  mode: currentMode,
  disabled: toRef(props, "disabled"),
  onStrokeComplete: (stroke: SignatureStroke) => {
    addStroke(stroke);
    emit("end-draw", stroke);
  },
  onDrawStart: () => emit("start-draw"),
  onDrawing: (point: SignaturePoint) => emit("drawing", point),
});

const exportInstance = useSignatureExport({
  canvasRef,
  watermark: toRef(currentWatermark),
});

const handleUndo = (): boolean => {
  const result = undo();
  if (result) emit("undo");
  return result;
};

const handleRedo = (): boolean => {
  const result = redo();
  if (result) emit("redo");
  return result;
};

const handleClear = () => {
  clear();
  canvasInstance.clearCanvas();
  emit("clear");
};

const exportSignature = async (
  options?: ExportOptions,
): Promise<string | Blob> => {
  return exportInstance.exportSignature(options);
};

const download = async (
  filename?: string,
  options?: ExportOptions,
): Promise<void> => {
  return exportInstance.download(filename, options);
};

const loadImage = async (imageUrl: string): Promise<void> => {
  await exportInstance.loadImage(imageUrl);
  clear();
};

const getSignatureData = (): SignatureStroke[] =>
  strokes.value as SignatureStroke[];
const loadSignatureData = (data: SignatureStroke[]): void => loadData(data);
const isSignatureEmpty = (): boolean => isEmpty.value;

onMounted(() => {
  canvasInstance.initCanvas();
  canvasInstance.bindEvents();
  if (props.backgroundImage) loadImage(props.backgroundImage);
});

onUnmounted(() => canvasInstance.unbindEvents());

defineExpose<SignatureExpose>({
  clear: handleClear,
  undo: handleUndo,
  redo: handleRedo,
  export: exportSignature,
  download,
  loadImage,
  getSignatureData,
  loadSignatureData,
  isEmpty: isSignatureEmpty,
});
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
