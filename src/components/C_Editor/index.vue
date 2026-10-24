<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 富文本编辑器组件（简化主题版）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    :id="editorId"
    class="c-editor w-full"
    :class="{
      'editor-dark': isDark,
      'is-disabled': isDisabled,
      'editor-focused': isFocused,
    }"
    @focusin="handleEditorFocus"
    @focusout="handleEditorBlur"
  >
    <Toolbar
      :editor="editorInstance"
      :default-config="toolbarConfig"
      mode="default"
      class="c-editor__toolbar"
    />
    <div
      ref="editorContainer"
      :style="editorStyle"
    />
  </div>
</template>

<script setup lang="ts">
  import {
    ref,
    computed,
    defineAsyncComponent,
    watch,
    onMounted,
    onBeforeUnmount,
    readonly as readonlyRef,
    shallowRef,
    type Component,
    type CSSProperties,
  } from 'vue'
  import { sanitizeRichHtml } from '../../utils/html'

  defineOptions({ name: 'C_Editor' })

  interface EditorInstance {
    getHtml(): string
    setHtml(html: string): void
    disable(): void
    enable(): void
    destroy(): void
    isDestroyed: boolean
  }

  interface Props {
    editorId: string
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    readonly?: boolean
    height?: number
    theme?: 'light' | 'dark'
  }

  interface Emits {
    (e: 'update:modelValue', value: string): void
    (e: 'editor-mounted', editor: EditorInstance): void
    (e: 'editor-change', html: string): void
    (e: 'error', error: Error): void
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    placeholder: '',
    disabled: false,
    readonly: false,
    height: 240,
    theme: 'light',
  })

  const emit = defineEmits<Emits>()
  let disposed = false
  let creationVersion = 0
  const destroyedEditors = new WeakSet<EditorInstance>()
  const creatingEditors = new WeakSet<EditorInstance>()

  const isFocused = ref(false)
  const editorInstance = shallowRef<EditorInstance | null>(null)
  const isInitialized = ref<boolean>(false)
  const editorHtml = ref(props.modelValue)
  const editorContainer = ref<HTMLElement>()

  const isDark = computed(() => props.theme === 'dark')
  const isDisabled = computed(() => props.disabled || props.readonly)
  const editorStyle = computed<CSSProperties>(() => ({
    height: `${Math.max(80, props.height - 42)}px`,
    overflowY: 'hidden',
  }))
  const toolbarConfig: Record<string, unknown> = {}
  const editorConfig = computed<Record<string, unknown>>(() => ({
    placeholder: props.placeholder,
    readOnly: isDisabled.value,
    autoFocus: false,
    sanitizeHtml: sanitizeRichHtml,
  }))

  const reportError = (error: unknown): void => {
    if (!disposed)
      emit('error', error instanceof Error ? error : new Error(String(error)))
  }

  const createToolbarRuntime = (): Component => {
    if (typeof window === 'undefined') return (() => null) as Component
    return defineAsyncComponent({
      loader: () =>
        import('@wangeditor-next/editor-for-vue').then(
          module => module.Toolbar
        ),
      onError(error, _retry, fail) {
        reportError(error)
        fail()
      },
    }) as Component
  }
  const Toolbar = createToolbarRuntime()

  const handleCreated = (editor: EditorInstance): void => {
    if (disposed) {
      disposeInstance(editor)
      return
    }
    if (editorInstance.value !== editor) disposeInstance(editorInstance.value)
    editorInstance.value = editor
    isInitialized.value = true
    if (isDisabled.value) editor.disable()
    emit('editor-mounted', editor)
  }

  const handleChange = (editor: EditorInstance): void => {
    if (disposed || editor !== editorInstance.value || editor.isDestroyed)
      return
    const html = editor.getHtml()
    editorHtml.value = html
    emit('update:modelValue', html)
    emit('editor-change', html)
  }

  const initializeEditor = (): void => {
    if (disposed || isInitialized.value) return
    const version = ++creationVersion
    editorHtml.value = props.modelValue
    void import('@wangeditor-next/editor')
      .then(({ createEditor }) => {
        if (disposed || version !== creationVersion || !editorContainer.value)
          return
        // Own the synchronous return value; the Vue adapter only reports CREATED
        // in a later microtask, which can be dropped after the child unmounts.
        const editor = createEditor({
          selector: editorContainer.value,
          mode: 'default',
          html: editorHtml.value,
          config: {
            ...editorConfig.value,
            onChange: handleChange,
            onCreated: readyEditor => {
              creatingEditors.delete(readyEditor)
              if (disposed || version !== creationVersion) {
                if (editorInstance.value === readyEditor)
                  editorInstance.value = null
                disposeInstance(readyEditor)
              } else handleCreated(readyEditor)
            },
          },
        })
        creatingEditors.add(editor)
        editorInstance.value = editor
        if (disposed || version !== creationVersion) {
          editorInstance.value = null
          disposeInstance(editor)
        }
      })
      .catch(error => {
        if (version === creationVersion) reportError(error)
      })
  }

  const destroyEditor = (): void => {
    creationVersion++
    const editor = editorInstance.value
    editorInstance.value = null
    isInitialized.value = false
    disposeInstance(editor)
  }

  function disposeInstance(editor: EditorInstance | null): void {
    if (!editor || editor.isDestroyed || destroyedEditors.has(editor)) return
    if (creatingEditors.delete(editor)) {
      // Core initializes its text area in already queued microtasks. Let those
      // finish before destroy removes the SDK's internal DOM-to-editor maps.
      queueMicrotask(() => disposeInstance(editor))
      return
    }
    destroyedEditors.add(editor)
    try {
      editor.destroy()
    } catch (error) {
      reportError(error)
    }
  }

  const setContent = (html: string): void => {
    const safeHtml = sanitizeRichHtml(html)
    editorHtml.value = safeHtml
    try {
      if (editorInstance.value?.getHtml() !== safeHtml) {
        editorInstance.value?.setHtml(safeHtml)
      }
    } catch (error) {
      reportError(error)
    }
  }

  const getContent = (): string => {
    try {
      return editorInstance.value?.getHtml() ?? editorHtml.value
    } catch (error) {
      reportError(error)
      return editorHtml.value
    }
  }

  watch(
    () => props.modelValue,
    newValue => {
      if (newValue !== getContent()) {
        setContent(newValue || '')
      }
    }
  )

  watch(isDisabled, disabled => {
    const editor = editorInstance.value
    if (!editor) return
    try {
      if (disabled) editor.disable()
      else editor.enable()
    } catch (error) {
      reportError(error)
    }
  })

  const handleEditorFocus = (): void => {
    isFocused.value = true
  }

  const handleEditorBlur = (): void => {
    isFocused.value = false
  }

  onMounted(initializeEditor)
  onBeforeUnmount(() => {
    disposed = true
    destroyEditor()
  })

  defineExpose({
    initializeEditor,
    destroyEditor,
    setContent,
    getContent,
    handleEditorFocus,
    handleEditorBlur,
    editorInstance: readonlyRef(editorInstance),
    isInitialized: readonlyRef(isInitialized),
  })
</script>

<style scoped>
  /* CSS 变量 — 支持外部主题覆盖 */
  .c-editor {
    --c-editor-toolbar-bg: #ffffff;
    --c-editor-toolbar-border: #e5e7eb;
    --c-editor-menu-color: #333333;
    --c-editor-menu-hover-bg: #f3f4f6;
    --c-editor-menu-hover-color: #333333;
    --c-editor-menu-active-bg: var(--c-primary, #2080f0);
    --c-editor-menu-active-color: #ffffff;
    --c-editor-container-bg: #ffffff;
    --c-editor-container-border: #e5e7eb;
    --c-editor-text-bg: #ffffff;
    --c-editor-text-color: #333333;
    --c-editor-text-focus-bg: #ffffff;
    --c-editor-text-focus-color: #333333;
    --c-editor-transition-duration: 0.3s;
  }

  /* 暗色主题 — 覆盖 CSS 变量 */
  .editor-dark {
    --c-editor-toolbar-bg: #1f2937;
    --c-editor-toolbar-border: #374151;
    --c-editor-menu-color: #e5e7eb;
    --c-editor-menu-hover-bg: #374151;
    --c-editor-menu-hover-color: #ffffff;
    --c-editor-container-bg: #111827;
    --c-editor-container-border: #374151;
    --c-editor-text-bg: #303033;
    --c-editor-text-color: #e5e7eb;
    --c-editor-text-focus-bg: #111827;
    --c-editor-text-focus-color: #e5e7eb;
  }

  .editor-dark :deep(.w-e-toolbar) {
    background-color: var(--c-editor-toolbar-bg) !important;
    border-color: var(--c-editor-toolbar-border) !important;
  }

  .editor-dark :deep(.w-e-toolbar .w-e-menu .w-e-menu-item) {
    color: var(--c-editor-menu-color) !important;
  }

  .editor-dark :deep(.w-e-toolbar .w-e-menu .w-e-menu-item:hover) {
    background-color: var(--c-editor-menu-hover-bg) !important;
    color: var(--c-editor-menu-hover-color) !important;
  }

  .editor-dark :deep(.w-e-toolbar .w-e-menu .w-e-menu-item.w-e-active) {
    background-color: var(--c-editor-menu-active-bg) !important;
    color: var(--c-editor-menu-active-color) !important;
  }

  .editor-dark :deep(.w-e-text-container) {
    background-color: var(--c-editor-container-bg) !important;
    border-color: var(--c-editor-container-border) !important;
  }

  .editor-dark :deep(.w-e-text-container .w-e-text) {
    background-color: var(--c-editor-text-bg) !important;
    color: var(--c-editor-text-color) !important;
  }

  .editor-dark :deep(.w-e-text-container .w-e-text:focus) {
    background-color: var(--c-editor-text-focus-bg) !important;
    color: var(--c-editor-text-focus-color) !important;
  }

  :deep(.w-e-toolbar),
  :deep(.w-e-text-container) {
    max-width: 100% !important;
    overflow-x: auto !important;
    box-sizing: border-box !important;
  }

  :deep(.w-e-text) {
    max-width: 100% !important;
    word-wrap: break-word !important;
    overflow-wrap: break-word !important;
  }

  :deep(.w-e-toolbar),
  :deep(.w-e-text-container),
  :deep(.w-e-text) {
    transition:
      background-color var(--c-editor-transition-duration) ease,
      border-color var(--c-editor-transition-duration) ease,
      color var(--c-editor-transition-duration) ease !important;
  }

  .editor-focused {
    max-width: 100% !important;
  }
</style>
