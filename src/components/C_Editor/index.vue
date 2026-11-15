<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 富文本编辑器组件（简化主题版）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    :id="editorId ?? defaultEditorId"
    class="c-editor w-full"
    :style="themeStyle"
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
    useComponentTheme,
    useComponentColorMode,
  } from '../../composables/useComponentTheme'
  import {
    ref,
    computed,
    defineAsyncComponent,
    watch,
    onMounted,
    onBeforeUnmount,
    readonly as readonlyRef,
    shallowRef,
    useId,
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

  import type { EditorProps } from './types'

  interface Emits {
    (e: 'update:modelValue', value: string): void
    (e: 'editor-mounted', editor: EditorInstance): void
    (e: 'editor-change', html: string): void
    (e: 'error', error: Error): void
  }

  const props = withDefaults(defineProps<EditorProps>(), {
    modelValue: '',
    placeholder: '',
    disabled: false,
    readonly: false,
    height: 240,
  })

  const emit = defineEmits<Emits>()
  const defaultEditorId = `editor-${useId()}`
  let disposed = false
  let creationVersion = 0
  const destroyedEditors = new WeakSet<EditorInstance>()
  const creatingEditors = new WeakSet<EditorInstance>()

  const isFocused = ref(false)
  const editorInstance = shallowRef<EditorInstance | null>(null)
  const isInitialized = ref<boolean>(false)
  const editorHtml = ref(props.modelValue)
  const editorContainer = ref<HTMLElement>()

  const colorMode = useComponentColorMode(() => props.theme)
  const themeStyle = useComponentTheme(() => props.theme)
  const isDark = computed(() => colorMode.value === 'dark')
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
  .c-editor {
    /* 使用当前 SDK 的公开变量，菜单、图标、编辑内容及浮动工具共享同一主题。 */
    --w-e-textarea-bg-color: var(--c-bg-card, var(--c-theme-bg-card));
    --w-e-textarea-color: var(--c-text-1, var(--c-theme-text-1));
    --w-e-textarea-border-color: var(--c-border, var(--c-theme-border));
    --w-e-textarea-slight-border-color: var(--c-border, var(--c-theme-border));
    --w-e-textarea-slight-color: var(--c-text-3, var(--c-theme-text-3));
    --w-e-textarea-slight-bg-color: var(--c-bg-muted, var(--c-theme-bg-muted));
    --w-e-textarea-selected-border-color: var(
      --c-primary,
      var(--c-theme-primary)
    );
    --w-e-textarea-handler-bg-color: var(--c-primary, var(--c-theme-primary));
    --w-e-toolbar-color: var(--c-text-2, var(--c-theme-text-2));
    --w-e-toolbar-bg-color: var(--c-bg-card, var(--c-theme-bg-card));
    --w-e-toolbar-active-color: var(--c-primary, var(--c-theme-primary));
    --w-e-toolbar-active-bg-color: var(--c-bg-active, var(--c-theme-bg-active));
    --w-e-toolbar-disabled-color: var(--c-text-4, var(--c-theme-text-4));
    --w-e-toolbar-border-color: var(--c-border, var(--c-theme-border));
    --w-e-modal-button-bg-color: var(--c-bg-muted, var(--c-theme-bg-muted));
    --w-e-modal-button-border-color: var(--c-border, var(--c-theme-border));
    width: 100%;
    min-width: 0;
    border: 1px solid var(--c-border, var(--c-theme-border));
    border-radius: var(--c-radius, var(--c-theme-radius));
    color: var(--c-text-1, var(--c-theme-text-1));
    background: var(--c-bg-card, var(--c-theme-bg-card));
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .c-editor__toolbar {
    border-bottom: 1px solid var(--c-border, var(--c-theme-border));
    border-radius: inherit;
  }
  .c-editor :deep(.w-e-toolbar),
  .c-editor :deep(.w-e-text-container) {
    max-width: 100%;
    box-sizing: border-box;
  }
  .c-editor :deep([data-slate-editor]) {
    overflow-wrap: anywhere;
  }
  .editor-focused {
    border-color: var(--c-primary, var(--c-theme-primary));
    box-shadow: 0 0 0 2px var(--c-focus-ring, var(--c-theme-focus-ring));
  }
  @media (prefers-reduced-motion: reduce) {
    .c-editor {
      transition: none;
    }
  }
</style>
