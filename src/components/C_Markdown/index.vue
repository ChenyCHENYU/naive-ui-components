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
    :class="{ 'is-dark': isDark, 'toc-left': tocNavPosition === 'left' }"
  >
    <MdEditor
      :id="editorId"
      ref="editorRef"
      :model-value="modelValue"
      :height="height"
      :placeholder="placeholder"
      :theme="isDark ? 'dark' : 'light'"
      :preview="effectiveMode !== 'edit'"
      :preview-only="effectiveMode === 'preview'"
      :read-only="disabled"
      :auto-focus="autofocus"
      :max-length="maxLength"
      :toolbars="resolvedToolbars"
      :footers="showWordCount ? ['markdownTotal', '=', 'scrollSwitch'] : []"
      catalog-layout="flat"
      :catalog-max-depth="catalogMaxDepth"
      :no-upload-img="!hasUploadHandler"
      :sanitize="sanitizeRichHtml"
      :format-copied-text="handleCopiedText"
      @update:model-value="handleInput"
      @on-html-changed="handleHtmlChanged"
      @on-save="handleSave"
      @on-upload-img="handleUploadImage"
    />
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    watch,
    onMounted,
    onBeforeUnmount,
    getCurrentInstance,
    type Component,
  } from 'vue'
  import { MdEditor as MdEditorRuntime } from 'md-editor-v3'
  import { sanitizeRichHtml } from '../../utils/html'

  defineOptions({ name: 'C_Markdown' })

  type ToolbarName = string | number
  interface MarkdownEditorExpose {
    on(eventName: 'fullscreen', callback: (status: boolean) => void): void
    toggleFullscreen(status?: boolean): void
    insert(
      generate: (selectedText: string) => {
        targetValue: string
        select?: boolean
        deviationStart?: number
        deviationEnd?: number
      }
    ): void
    focus(): void
  }

  const MdEditor = MdEditorRuntime as unknown as Component

  export type InsertImageFunction = (config: {
    url: string
    desc?: string
    width?: string | number
    height?: string | number
  }) => void

  interface Props {
    modelValue?: string
    /** SSR 或同页多实例时建议显式传入稳定 ID */
    editorId?: string
    height?: string | number
    disabled?: boolean
    placeholder?: string
    mode?: 'edit' | 'editable' | 'preview'
    toolbar?: object | ToolbarName[]
    uploadImageConfig?: {
      accept?: string
      multiple?: boolean
      [key: string]: unknown
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
  const currentInstance = getCurrentInstance()

  const editorRef = ref<MarkdownEditorExpose>()
  const cachedHtml = ref('')
  const latestText = ref(props.modelValue)
  const instanceUid = currentInstance?.uid ?? 0

  const editorId = computed(
    () => props.editorId || `c-markdown-editor-${instanceUid}`
  )

  const wordCount = computed(() => {
    return props.modelValue?.length || 0
  })
  const effectiveMode = computed(() =>
    props.disabled ? 'preview' : props.mode
  )
  const catalogMaxDepth = computed(() => {
    const levels = props.includeLevel.filter(
      level => Number.isInteger(level) && level >= 1 && level <= 6
    )
    return levels.length > 0 ? Math.max(...levels) : 6
  })

  const hasUploadHandler = computed(
    () => typeof currentInstance?.vnode.props?.onUploadImage === 'function'
  )

  const TOOLBAR_NAME_MAP: Readonly<Record<string, ToolbarName | undefined>> = {
    undo: 'revoke',
    redo: 'next',
    h: 'title',
    bold: 'bold',
    italic: 'italic',
    strikethrough: 'strikeThrough',
    quote: 'quote',
    ul: 'unorderedList',
    ol: 'orderedList',
    table: 'table',
    hr: 'horizontalLine',
    link: 'link',
    image: 'image',
    code: 'code',
    save: 'save',
    preview: 'preview',
    toc: 'catalog',
    fullscreen: 'fullscreen',
  }

  const resolvedToolbars = computed<ToolbarName[]>(() => {
    if (Array.isArray(props.toolbar)) return [...props.toolbar]
    const names = `${props.leftToolbar} ${props.rightToolbar}`
      .split(/[\s|]+/)
      .map(name => TOOLBAR_NAME_MAP[name])
      .filter((name): name is ToolbarName => name !== undefined)
    return [...new Set(names)]
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
    latestText.value = value
    emit('update:modelValue', value)
    if (props.showWordCount) {
      emit('word-count-change', value.length)
    }
  }

  const handleHtmlChanged = (html: string) => {
    cachedHtml.value = html
    emit('change', latestText.value, html)
    if (props.autoSave) {
      autoSave(latestText.value)
    }
  }

  const handleSave = async (text: string, html: Promise<string>) => {
    emit('save', text, await html)
  }

  const handleUploadImage = (
    files: File[],
    insertImages: (
      urls: Array<{ url: string; alt: string; title: string }>
    ) => void
  ) => {
    const filteredFiles = files.filter(file =>
      matchesAccept(file, props.uploadImageConfig?.accept)
    )
    const acceptedFiles = props.uploadImageConfig?.multiple
      ? filteredFiles
      : filteredFiles.slice(0, 1)
    if (acceptedFiles.length === 0) return
    const transfer = new DataTransfer()
    acceptedFiles.forEach(file => transfer.items.add(file))
    const insertImage: InsertImageFunction = config => {
      insertImages([
        {
          url: config.url,
          alt: config.desc ?? '',
          title: config.desc ?? '',
        },
      ])
    }
    emit('upload-image', new Event('upload-image'), insertImage, transfer.files)
  }

  const handleCopiedText = (text: string): string => {
    emit('copy-code-success', text)
    return text
  }

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

  const autoSave = (text: string) => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    autoSaveTimer = setTimeout(() => {
      emit('auto-save', text)
    }, props.autoSaveInterval)
  }

  onBeforeUnmount(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
  })

  const focus = () => {
    editorRef.value?.focus()
  }

  const getHtml = (): string => {
    return cachedHtml.value
  }

  const insertText = (text: string) => {
    editorRef.value?.insert((selected: string) => ({
      targetValue: `${selected}${text}`,
      select: true,
      deviationStart: -text.length,
      deviationEnd: 0,
    }))
  }

  onMounted(() => {
    editorRef.value?.on('fullscreen', isFullscreen => {
      emit('fullscreen-change', isFullscreen)
    })
    if (props.defaultFullscreen) editorRef.value?.toggleFullscreen(true)
  })

  defineExpose({
    focus,
    getHtml,
    insertText,
    wordCount,
  })

  function matchesAccept(file: File, accept?: string): boolean {
    if (!accept?.trim()) return true
    return accept
      .split(',')
      .map(rule => rule.trim().toLowerCase())
      .filter(Boolean)
      .some(rule => {
        if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule)
        if (rule.endsWith('/*')) {
          return file.type.toLowerCase().startsWith(rule.slice(0, -1))
        }
        return file.type.toLowerCase() === rule
      })
  }
</script>

<style lang="scss" scoped>
  @use './index.scss';
</style>
