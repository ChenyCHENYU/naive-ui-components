<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 富文本编辑器组件（简化主题版）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    ref="editorContainer"
    :id="editorId"
    v-show="isInitialized"
    class="w-full"
    :class="{ 'editor-dark': isDark }"
    @focusin="handleEditorFocus"
    @focusout="handleEditorBlur"
  ></div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  readonly,
} from "vue";
import E from "wangeditor";

defineOptions({ name: "C_Editor" });

interface Props {
  editorId: string;
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  height?: number;
  theme?: "light" | "dark";
}

interface Emits {
  (e: "update:modelValue", value: string): void;
  (e: "editor-mounted", editor: any): void;
  (e: "editor-change", html: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  placeholder: "",
  disabled: false,
  readonly: false,
  height: 240,
  theme: "light",
});

const emit = defineEmits<Emits>();

const editorContainer = ref<HTMLElement | null>(null);
const editorInstance = ref<any>(null);
const isInitialized = ref<boolean>(false);

const isDark = computed(() => props.theme === "dark");

const initializeEditor = (): void => {
  if (!editorContainer.value || isInitialized.value) return;

  try {
    const editor = new E(editorContainer.value);
    const editorConfig = editor.config as any;
    editorConfig.placeholder = props.placeholder;
    editorConfig.height = props.height - 50;

    editorConfig.onchange = (html: string) => {
      emit("update:modelValue", html);
      emit("editor-change", html);
    };

    editor.create();

    nextTick(() => {
      if (props.modelValue) {
        editor.txt.html(props.modelValue);
      }
      if (props.readonly) {
        editor.disable();
      }
      editorInstance.value = editor;
      isInitialized.value = true;
      emit("editor-mounted", editor);
    });
  } catch (error) {
    console.error(`[C_Editor] 编辑器初始化失败: ${props.editorId}`, error);
  }
};

const destroyEditor = (): void => {
  if (editorInstance.value && isInitialized.value) {
    try {
      editorInstance.value.destroy();
      editorInstance.value = null;
      isInitialized.value = false;
    } catch (error) {
      console.error(`[C_Editor] 编辑器销毁失败: ${props.editorId}`, error);
    }
  }
};

const setContent = (html: string): void => {
  if (editorInstance.value && isInitialized.value) {
    try {
      editorInstance.value.txt.html(html);
    } catch (error) {
      console.warn(`[C_Editor] 设置编辑器内容失败: ${props.editorId}`, error);
    }
  }
};

const getContent = (): string => {
  if (editorInstance.value && isInitialized.value) {
    try {
      return editorInstance.value.txt.html();
    } catch (error) {
      console.warn(`[C_Editor] 获取编辑器内容失败: ${props.editorId}`, error);
      return "";
    }
  }
  return "";
};

watch(
  () => props.modelValue,
  (newValue) => {
    if (editorInstance.value && isInitialized.value) {
      const currentContent = editorInstance.value.txt.html();
      if (currentContent !== newValue) {
        editorInstance.value.txt.html(newValue || "");
      }
    }
  },
);

watch(
  () => props.disabled,
  (disabled) => {
    if (editorInstance.value && isInitialized.value) {
      try {
        if (disabled) editorInstance.value.disable();
        else editorInstance.value.enable();
      } catch (error) {
        console.warn(`[C_Editor] 设置编辑器状态失败`, error);
      }
    }
  },
);

watch(
  () => props.readonly,
  (readonlyVal) => {
    if (editorInstance.value && isInitialized.value) {
      try {
        if (readonlyVal) editorInstance.value.disable();
        else editorInstance.value.enable();
      } catch (error) {
        console.warn(`[C_Editor] 设置编辑器只读状态失败`, error);
      }
    }
  },
);

const handleEditorFocus = (): void => {
  if (!editorContainer.value) return;
  const container = editorContainer.value.closest(
    ".form-demo",
  ) as HTMLElement | null;
  if (container) {
    container.classList.add("editor-focused");
    const containerWidth = container.scrollWidth;
    container.style.maxWidth = `${containerWidth}px`;
  }
};

const handleEditorBlur = (): void => {
  if (!editorContainer.value) return;
  const container = editorContainer.value.closest(
    ".form-demo",
  ) as HTMLElement | null;
  if (container) {
    container.classList.remove("editor-focused");
    container.style.maxWidth = "";
  }
};

onMounted(() => {
  nextTick(() => {
    initializeEditor();
  });
});

onBeforeUnmount(() => {
  destroyEditor();
});

defineExpose({
  initializeEditor,
  destroyEditor,
  setContent,
  getContent,
  handleEditorFocus,
  handleEditorBlur,
  editorInstance: readonly(editorInstance),
  isInitialized: readonly(isInitialized),
});
</script>

<style scoped>
/* CSS 变量 — 支持外部主题覆盖 */
:root {
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
  overflow: hidden !important;
  max-width: 100% !important;
}
</style>
