<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-20
 * @Description: Markdown 编辑器封装组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-markdown-wrapper"
    :class="{ 'is-dark': isDark }"
  >
    <VMdEditor
      ref="editorRef"
      :model-value="modelValue"
      :height="height"
      :placeholder="placeholder"
      :toolbar="toolbar"
      :mode="mode"
      :upload-image-config="computedUploadImageConfig"
      :toc-nav-position="tocNavPosition"
      :default-fullscreen="defaultFullscreen"
      :autofocus="autofocus"
      :include-level="includeLevel"
      :left-toolbar="leftToolbar"
      :right-toolbar="rightToolbar"
      :default-show-toc="true"
      @update:model-value="handleInput"
      @change="handleChange"
      @save="handleSave"
      @upload-image="handleUploadImage"
      @fullscreen-change="handleFullscreenChange"
      @copy-code-success="handleCopyCodeSuccess"
    />
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch, onMounted } from 'vue'
  import VMdEditor from '@kangc/v-md-editor'

  defineOptions({ name: 'C_Markdown' })

  export type InsertImageFunction = (config: {
    url: string
    desc?: string
    width?: string | number
    height?: string | number
  }) => void

  interface Props {
    modelValue?: string
    height?: string | number
    disabled?: boolean
    placeholder?: string
    mode?: 'edit' | 'editable' | 'preview'
    toolbar?: object
    uploadImageConfig?: {
      accept?: string
      multiple?: boolean
      [key: string]: any
    }
    tocNavPosition?: 'left' | 'right'
    defaultFullscreen?: boolean
    autofocus?: boolean
    includeLevel?: number[]
    leftToolbar?: string
    rightToolbar?: string
    maxLength?: number
    showWordCount?: boolean
    autoSave?: boolean
    autoSaveInterval?: number
    /** 是否为暗色主题（外部传入） */
    isDark?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    height: '400px',
    disabled: false,
    placeholder: '请输入 Markdown 内容...',
    mode: 'editable',
    tocNavPosition: 'right',
    defaultFullscreen: false,
    autofocus: false,
    includeLevel: () => [1, 2, 3, 4, 5, 6],
    leftToolbar:
      'undo redo clear | h bold italic strikethrough quote | ul ol table hr | link image code | save',
    rightToolbar: 'preview toc sync-scroll fullscreen',
    maxLength: 50000,
    showWordCount: true,
    autoSave: false,
    autoSaveInterval: 30000,
    isDark: false,
  })

  interface Emits {
    'update:modelValue': [value: string]
    change: [text: string, html: string]
    save: [text: string, html: string]
    'upload-image': [
      event: Event,
      insertImage: InsertImageFunction,
      files: FileList,
    ]
    'fullscreen-change': [isFullscreen: boolean]
    'copy-code-success': [text: string]
    'word-count-change': [count: number]
    'auto-save': [text: string]
    'max-length-exceeded': [currentLength: number, maxLength: number]
  }

  const emit = defineEmits<Emits>()

  const editorRef = ref<any>(null)
  const cachedHtml = ref('')

  const wordCount = computed(() => {
    return props.modelValue?.length || 0
  })

  const computedUploadImageConfig = computed(() => {
    const defaultConfig = {
      accept: 'image/*',
      multiple: false,
    }
    return props.uploadImageConfig
      ? { ...defaultConfig, ...props.uploadImageConfig }
      : defaultConfig
  })

  onMounted(() => {
    if (props.showWordCount && props.modelValue) {
      emit('word-count-change', props.modelValue.length)
    }
  })

  watch(
    () => props.modelValue,
    newValue => {
      if (props.showWordCount) {
        emit('word-count-change', newValue?.length || 0)
      }
    },
    { immediate: true }
  )

  const handleInput = (value: string) => {
    if (value.length > props.maxLength) {
      emit('max-length-exceeded', value.length, props.maxLength)
      return
    }
    emit('update:modelValue', value)
    if (props.showWordCount) {
      emit('word-count-change', value.length)
    }
  }

  const handleChange = (text: string, html: string) => {
    cachedHtml.value = html
    emit('change', text, html)
    if (props.autoSave) {
      autoSave(text)
    }
  }

  const handleSave = (text: string, html: string) => {
    emit('save', text, html)
  }

  const handleUploadImage = (
    event: Event,
    insertImage: InsertImageFunction,
    files: FileList
  ) => {
    emit('upload-image', event, insertImage, files)
  }

  const handleFullscreenChange = (isFullscreen: boolean) => {
    emit('fullscreen-change', isFullscreen)
  }

  const handleCopyCodeSuccess = (text: string) => {
    emit('copy-code-success', text)
  }

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  const autoSave = (text: string) => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      emit('auto-save', text)
    }, props.autoSaveInterval)
  }

  const focus = () => {
    editorRef.value?.focus()
  }

  const getHtml = (): string => {
    return cachedHtml.value
  }

  const insertText = (text: string) => {
    editorRef.value?.insert((selected: string) => ({
      text: `${selected}${text}`,
      selected: text,
    }))
  }

  defineExpose({
    focus,
    getHtml,
    insertText,
    wordCount,
  })
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
