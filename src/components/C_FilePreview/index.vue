<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-07-01
 * @Description: 文件预览组件（PDF/Word/Excel）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->

<template>
  <div class="c-file-preview-wrapper">
    <!-- 文件信息卡片模式 -->
    <div
      v-if="props.show === undefined && !autoPreview && !inline"
      class="file-info-card"
    >
      <div class="file-info">
        <div class="file-icon">
          <C_Icon
            :name="fileConfig.icon"
            :size="40"
            :color="fileConfig.color"
          />
        </div>

        <div class="file-details">
          <div class="file-name">
            <NEllipsis style="max-width: 250px">{{
              displayFileName
            }}</NEllipsis>
            <NTag
              :type="fileConfig.tagType"
              size="small"
            >
              {{ fileType.toUpperCase() }}
            </NTag>
          </div>

          <div class="file-meta">
            <span class="file-size">{{ formatFileSize(fileSize) }}</span>
          </div>
        </div>

        <div class="file-actions">
          <NButton
            type="primary"
            @click="visible = true"
          >
            <template #icon>
              <C_Icon name="ic:outline-visibility" />
            </template>
            预览
          </NButton>

          <NButton
            type="tertiary"
            @click="downloadFile"
          >
            <template #icon>
              <C_Icon name="ic:outline-download" />
            </template>
            下载
          </NButton>
        </div>
      </div>
    </div>

    <div
      v-if="inline"
      class="c-file-preview-inline"
    >
      <NResult
        v-if="!hasSource"
        status="info"
        title="暂无预览文件"
        description="选择文件后即可预览"
      />
      <div
        v-else-if="loading || error"
        class="status-container"
        role="status"
      >
        <NSpin
          v-if="loading"
          size="large"
          ><template #description>正在加载文档…</template></NSpin
        >
        <NResult
          v-else
          status="error"
          title="预览失败"
          :description="error"
          ><template #footer
            ><NButton
              size="small"
              @click="loadFile"
              >重试</NButton
            ></template
          ></NResult
        >
      </div>
      <PdfViewer
        v-else-if="fileType === 'pdf'"
        :pdf-url="pdfUrl"
        :total-pages="pdfTotalPages"
      />
      <WordViewer
        v-else-if="fileType === 'word'"
        :content="wordContent"
        :headings="wordHeadings"
      />
      <ExcelViewer
        v-else-if="fileType === 'excel'"
        :sheets="excelSheets"
        @reload="loadFile"
      />
      <NResult
        v-else
        status="warning"
        title="不支持的文件格式"
        description="支持 PDF、DOCX、XLSX 和 XLS 文件"
      />
    </div>
    <!-- 模态框预览 -->
    <NModal
      v-if="!inline"
      v-model:show="visible"
      :mask-closable="false"
      :closable="false"
      :auto-focus="false"
      transform-origin="center"
    >
      <div
        ref="modalContainer"
        class="modal-container"
      >
        <!-- 自定义头部 -->
        <div class="modal-header">
          <div class="modal-title">
            <C_Icon
              :name="fileConfig.icon"
              :size="20"
              :color="fileConfig.color"
            />
            <span :title="displayFileName">{{ displayFileName }}</span>
          </div>
          <div class="modal-actions">
            <NButton
              size="small"
              type="tertiary"
              @click="downloadFile"
            >
              <template #icon>
                <C_Icon name="ic:outline-download" />
              </template>
              下载
            </NButton>
            <NButton
              size="small"
              type="tertiary"
              aria-label="关闭预览"
              @click="visible = false"
            >
              <template #icon>
                <C_Icon name="ic:outline-close" />
              </template>
            </NButton>
          </div>
        </div>

        <!-- 预览内容 -->
        <div class="modal-content">
          <!-- 文件信息头部 -->
          <div class="preview-header">
            <div class="preview-header-row">
              <div class="preview-meta">
                <NTag
                  :type="fileConfig.tagType as any"
                  size="small"
                >
                  <template #icon>
                    <C_Icon :name="fileConfig.icon" />
                  </template>
                  {{ fileType.toUpperCase() }}
                </NTag>
                <NEllipsis>{{ displayFileName }}</NEllipsis>
                <span class="text-sm text-gray-500">{{
                  formatFileSize(fileSize)
                }}</span>
              </div>

              <div class="flex gap-2">
                <NButton
                  size="small"
                  type="tertiary"
                  :disabled="loading"
                  @click="loadFile"
                >
                  <template #icon>
                    <C_Icon name="ic:outline-refresh" />
                  </template>
                  刷新
                </NButton>
                <NButton
                  size="small"
                  type="primary"
                  @click="toggleFullscreen"
                >
                  <template #icon>
                    <C_Icon
                      :name="
                        isFullscreen
                          ? 'ic:outline-fullscreen-exit'
                          : 'ic:outline-fullscreen'
                      "
                    />
                  </template>
                  {{ isFullscreen ? '退出全屏' : '全屏' }}
                </NButton>
              </div>
            </div>
          </div>

          <!-- 预览内容区域 -->
          <div class="preview-content">
            <!-- 加载和错误状态 -->
            <NResult
              v-if="!hasSource"
              status="info"
              title="暂无预览文件"
              description="选择文件后即可预览"
            />
            <template v-else-if="loading || error">
              <div class="status-container">
                <NSpin
                  v-if="loading"
                  size="large"
                >
                  <template #description>
                    正在加载{{ fileType.toUpperCase() }}文件...
                  </template>
                </NSpin>
                <NResult
                  v-else
                  status="error"
                  title="预览失败"
                  :description="error"
                >
                  <template #footer>
                    <NButton @click="loadFile">重试</NButton>
                  </template>
                </NResult>
              </div>
            </template>

            <!-- 文件预览 — 委托给子组件 -->
            <template v-else>
              <PdfViewer
                v-if="fileType === 'pdf'"
                :pdf-url="pdfUrl"
                :total-pages="pdfTotalPages"
              />

              <WordViewer
                v-else-if="fileType === 'word'"
                :content="wordContent"
                :headings="wordHeadings"
              />

              <ExcelViewer
                v-else-if="fileType === 'excel'"
                :sheets="excelSheets"
                @reload="loadFile"
              />

              <!-- 不支持的文件类型 -->
              <NResult
                v-else
                status="warning"
                title="不支持的文件格式"
                :description="`暂不支持预览 ${fileType.toUpperCase()} 格式文件`"
              />
            </template>
          </div>
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref, toRefs, watch } from 'vue'
  import { NButton, NEllipsis, NTag, NModal, NSpin, NResult } from 'naive-ui'
  import { formatFileSize } from './data'
  import PdfViewer from './components/PdfViewer/index.vue'
  import WordViewer from './components/WordViewer/index.vue'
  import ExcelViewer from './components/ExcelViewer/index.vue'
  import type { FilePreviewProps } from './types'
  import { useFilePreview } from './composables/useFilePreview'
  import { useFullscreen } from './composables/useFullscreen'

  defineOptions({ name: 'C_FilePreview' })

  const props = withDefaults(defineProps<FilePreviewProps>(), {
    fileName: '未知文件',
    autoPreview: false,
    inline: false,
    show: undefined,
  })

  const {
    file,
    url,
    fileName: propFileName,
    autoPreview,
    inline,
    previewLimits,
  } = toRefs(props)

  const emit = defineEmits<{
    preview: [file: File | string]
    download: [file: File | string]
    'update:show': [show: boolean]
  }>()

  /* ==================== Composables ==================== */
  const {
    loading,
    error,
    fileSize,
    showModal,
    hasSource,
    pdfUrl,
    pdfTotalPages,
    wordContent,
    wordHeadings,
    excelSheets,
    displayFileName,
    fileType,
    fileConfig,
    loadFile,
    loadPreview,
    downloadFile,
    clearPreview,
  } = useFilePreview({ file, url, fileName: propFileName, previewLimits }, emit)

  const visible = computed({
    get: () => props.show ?? showModal.value,
    set: show => {
      if (show === visible.value) return
      if (props.show === undefined) showModal.value = show
      emit('update:show', show)
    },
  })
  const modalContainer = ref<HTMLElement>()
  const { isFullscreen, toggleFullscreen, exitFullscreen } =
    useFullscreen(modalContainer)

  const source = computed(() => [
    file.value,
    url.value,
    propFileName.value,
    props.previewLimits?.maxBytes,
    props.previewLimits?.maxCells,
  ])
  const presentation = computed(() =>
    inline.value ? 'inline' : visible.value ? 'modal' : 'hidden'
  )
  const autoOpen = computed(() => props.show === undefined && autoPreview.value)

  watch(
    [source, presentation, autoOpen],
    ([currentSource, mode, auto], [previousSource, previousMode, wasAuto]) => {
      if (typeof window === 'undefined') return
      const sourceChanged = currentSource !== previousSource
      const modeChanged = mode !== previousMode
      if (modeChanged && previousMode === 'modal') exitFullscreen()
      if (mode === 'hidden') {
        syncHiddenPreview(previousMode, sourceChanged, auto !== wasAuto)
        return
      }
      if (!hasSource.value) return
      if (modeChanged && mode === 'modal') void loadPreview()
      else if (modeChanged || sourceChanged) void loadFile()
    },
    { immediate: true }
  )

  function syncHiddenPreview(
    previousMode: typeof presentation.value | undefined,
    sourceChanged: boolean,
    autoChanged: boolean
  ): void {
    if (
      sourceChanged ||
      previousMode === 'modal' ||
      previousMode === 'inline'
    ) {
      releasePreview(sourceChanged)
    }
    // 自动预览只响应新文件或模式变化，关闭后不重新打开同一文件。
    const autoRequested =
      autoChanged || sourceChanged || previousMode === 'inline'
    if (autoOpen.value && autoRequested && hasSource.value) visible.value = true
  }

  // 释放文档资源后，文件卡片仍可显示已知大小。
  function releasePreview(sourceChanged: boolean): void {
    const knownSize = fileSize.value
    clearPreview()
    fileSize.value = file.value?.size ?? (sourceChanged ? 0 : knownSize)
  }
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
