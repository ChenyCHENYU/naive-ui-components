<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-16
 * @Description: 二维码组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-qrcode">
    <div class="qrcode-wrapper" :class="{ 'with-border': showBorder }">
      <canvas v-show="mode === 'canvas'" ref="canvasRef" />
      <div
        v-if="mode === 'svg'"
        class="qrcode-svg"
        :style="{ width: `${size}px`, height: `${size}px` }"
        v-html="svgHtml"
      />
    </div>
    <div v-if="showLabel && label" class="qrcode-label">
      {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef, watch, onMounted } from "vue";
import { useQRCode } from "./composables/useQRCode";
import type {
  ErrorCorrectionLevel,
  ExportType,
  LogoOptions,
  QRCodeExpose,
  RenderMode,
} from "./types";

defineOptions({ name: "C_QRCode" });

interface Props {
  value: string;
  size?: number;
  color?: string;
  bgColor?: string;
  errorCorrectionLevel?: ErrorCorrectionLevel;
  margin?: number;
  mode?: RenderMode;
  logo?: LogoOptions;
  showBorder?: boolean;
  label?: string;
  showLabel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 200,
  color: "#000000",
  bgColor: "#FFFFFF",
  errorCorrectionLevel: "M",
  margin: 2,
  mode: "canvas",
  logo: undefined,
  showBorder: true,
  label: "",
  showLabel: false,
});

const emit = defineEmits<{
  error: [error: Error];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

const { svgHtml, error, render, toDataURL, download } = useQRCode(canvasRef, {
  value: toRef(props, "value"),
  size: toRef(props, "size"),
  color: toRef(props, "color"),
  bgColor: toRef(props, "bgColor"),
  errorCorrectionLevel: toRef(props, "errorCorrectionLevel"),
  margin: toRef(props, "margin"),
  mode: toRef(props, "mode"),
  logo: toRef(props, "logo"),
});

watch(error, (e) => {
  if (e) emit("error", e);
});

onMounted(() => render());

defineExpose<QRCodeExpose>({
  toDataURL: (type?: ExportType, quality?: number) => toDataURL(type, quality),
  download: (filename?: string, type?: ExportType) => download(filename, type),
  refresh: () => render(),
});
</script>

<style lang="scss" scoped>
@use "./index.scss";
</style>
