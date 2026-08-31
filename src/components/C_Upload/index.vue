<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27
 * @Description: 增强型上传组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div class="c-upload">
    <!-- 上传区域 -->
    <UploadArea
      ref="uploadAreaRef"
      :accept="props.accept"
      :multiple="props.multiple"
      :directory="props.directory"
      :disabled="props.disabled"
      :draggable="props.draggable"
      :pasteable="props.pasteable"
      :tip="props.tip"
      @files="handleFiles"
    >
      <slot name="area" />
    </UploadArea>

    <!-- 总进度条 -->
    <div
      v-if="showTotalProgress"
      class="c-upload__total-progress"
    >
      <div class="c-upload__total-label">
        <span>总进度</span>
        <span>{{ totalPercent }}%</span>
      </div>
      <NProgress
        :percentage="totalPercent"
        :height="6"
        :border-radius="3"
        :show-indicator="false"
        status="success"
      />
    </div>

    <!-- 图片预览模式 -->
    <ImagePreview
      v-if="props.listType === 'image'"
      :file-list="fileList"
      @remove="handleRemove"
      @retry="handleRetry"
    />

    <!-- 文件列表模式 -->
    <FileList
      v-else-if="props.showFileList && fileList.length > 0"
      :file-list="fileList"
      :show-thumbnail="props.showThumbnail"
      :hash-progress="hashProgress"
      @remove="handleRemove"
      @retry="handleRetry"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import { NProgress } from 'naive-ui'
  import type { UploadProps, UploadExpose, UploadFileItem } from './types'
  import { DEFAULT_CHUNK_SIZE, DEFAULT_CONCURRENCY } from './constants'
  import { useUploadCore } from './composables/useUploadCore'
  import UploadArea from './components/UploadArea.vue'
  import FileList from './components/FileList.vue'
  import ImagePreview from './components/ImagePreview.vue'

  const props = withDefaults(defineProps<UploadProps>(), {
    action: '',
    headers: () => ({}),
    data: () => ({}),
    multiple: false,
    directory: false,
    accept: '',
    maxSize: 0,
    maxCount: 0,
    disabled: false,
    draggable: true,
    pasteable: false,
    chunked: false,
    chunkSize: DEFAULT_CHUNK_SIZE,
    concurrency: DEFAULT_CONCURRENCY,
    showFileList: true,
    listType: 'text',
    showThumbnail: true,
    tip: '',
    defaultFileList: () => [],
  })

  const emit = defineEmits<{
    change: [fileList: UploadFileItem[]]
    success: [file: UploadFileItem, response: unknown]
    error: [file: UploadFileItem, error: Error]
    progress: [file: UploadFileItem, percent: number]
    remove: [file: UploadFileItem]
    finish: [fileList: UploadFileItem[]]
    exceed: [files: File[], fileList: UploadFileItem[]]
  }>()

  const uploadAreaRef = ref<InstanceType<typeof UploadArea>>()

  const {
    fileList,
    totalPercent,
    hashProgress,
    addFiles,
    removeFile,
    clearAll,
    startUpload,
    pauseAll,
    resumeAll,
    retryFile,
    processFile,
    getSuccessList,
  } = useUploadCore(props)

  // ─── 是否显示总进度 ──────────────────────────

  const showTotalProgress = computed(() => {
    return fileList.value.some(
      f =>
        f.status === 'uploading' ||
        f.status === 'hashing' ||
        f.status === 'validating'
    )
  })

  const snapshotFile = (file: UploadFileItem): UploadFileItem => ({ ...file })
  const snapshotList = (): UploadFileItem[] => fileList.value.map(snapshotFile)

  // ─── 文件接收处理 ─────────────────────────────

  /** 处理接收到的文件 */
  function handleFiles(files: File[]) {
    // 数量超限
    const maxCount = Math.max(0, Math.trunc(Number(props.maxCount) || 0))
    if (maxCount > 0 && fileList.value.length + files.length > maxCount) {
      emit('exceed', files, snapshotList())
      const available = maxCount - fileList.value.length
      if (available <= 0) return
      files = files.slice(0, available)
    }

    const items = addFiles(files)
    emit('change', snapshotList())

    // 自动上传
    items.forEach(file => void processFile(file))
  }

  // ─── 移除 & 重试 ─────────────────────────────

  /** 移除文件 */
  function handleRemove(uid: string) {
    const file = fileList.value.find(f => f.uid === uid)
    if (file) {
      emit('remove', snapshotFile(file))
      removeFile(uid)
      emit('change', snapshotList())
    }
  }

  /** 重试上传 */
  function handleRetry(uid: string) {
    retryFile(uid)
  }

  // ─── 监听文件状态变化触发事件 ─────────────────

  const previousStates = new Map<
    string,
    { status: UploadFileItem['status']; percent: number }
  >()
  let finishEmitted = false

  watch(
    fileList,
    list => {
      const currentUids = new Set(list.map(file => file.uid))
      previousStates.forEach((_state, uid) => {
        if (!currentUids.has(uid)) previousStates.delete(uid)
      })

      // eslint-disable-next-line complexity -- 单次遍历精确派发所有状态跃迁事件。
      list.forEach(file => {
        const previous = previousStates.get(file.uid)
        if (previous && previous.percent !== file.percent) {
          emit('progress', snapshotFile(file), file.percent)
        }
        if (
          previous &&
          previous.status !== file.status &&
          (file.status === 'success' || file.status === 'instant')
        ) {
          emit('success', snapshotFile(file), file.response)
        }
        if (
          previous &&
          previous.status !== 'error' &&
          file.status === 'error'
        ) {
          emit('error', snapshotFile(file), new Error(file.error || '上传失败'))
        }
        previousStates.set(file.uid, {
          status: file.status,
          percent: file.percent,
        })
      })

      // 检查是否全部完成
      const allDone =
        list.length > 0 &&
        list.every(
          f =>
            f.status === 'success' ||
            f.status === 'instant' ||
            f.status === 'error'
        )
      if (allDone) {
        if (!finishEmitted) emit('finish', snapshotList())
        finishEmitted = true
      } else {
        finishEmitted = false
      }
    },
    { deep: true }
  )

  // ─── Expose ──────────────────────────────────

  defineExpose<UploadExpose>({
    selectFiles: () => uploadAreaRef.value?.triggerSelect(),
    startUpload,
    pauseAll,
    resumeAll,
    clearAll: () => {
      clearAll()
      emit('change', snapshotList())
    },
    removeFile: (uid: string) => {
      handleRemove(uid)
    },
    retryFile,
    getFileList: snapshotList,
    getSuccessList: () => getSuccessList().map(snapshotFile),
    /** 总体进度 */
    get totalPercent() {
      return totalPercent.value
    },
  })
</script>

<style scoped lang="scss">
  .c-upload {
    --c-upload-progress-bg: var(--body-color, #fff);
    --c-upload-progress-border: var(--border-color, #e5e7eb);
    --c-upload-progress-radius: 8px;
    --c-upload-label-color: var(--text-color-3, #999);
    --c-upload-label-size: 12px;

    width: 100%;

    &__total-progress {
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: var(--c-upload-progress-radius);
      background: var(--c-upload-progress-bg);
      border: 1px solid var(--c-upload-progress-border);
    }

    &__total-label {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: var(--c-upload-label-size);
      color: var(--c-upload-label-color);
    }
  }
</style>
