<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-19
 * @Description: 使用浏览器原生 PDF 阅读能力，避免伪造页数和无效翻页控件
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
-->
<template>
  <div class="file-container pdf-container">
    <div class="file-toolbar"
      ><span>PDF 阅读器 · 翻页、缩放与打印由浏览器提供</span
      ><NButton
        v-if="pdfUrl"
        tag="a"
        :href="pdfUrl"
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        >在新标签页打开</NButton
      ></div
    >
    <div class="file-viewer"
      ><iframe
        v-if="pdfUrl"
        :src="pdfUrl"
        title="PDF预览"
        class="pdf-frame"
    /></div>
  </div>
</template>
<script setup lang="ts">
  import { NButton } from 'naive-ui'
  defineOptions({ name: 'FilePreviewPdfViewer' })
  defineProps<{ pdfUrl: string; totalPages: number }>()
</script>
<style lang="scss" scoped>
  @use './index.scss';
</style>
