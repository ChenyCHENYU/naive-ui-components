<template>
  <div class="c-code-wrapper">
    <!-- 代码标题栏 -->
    <div v-if="showHeader" class="c-code-header">
      <div class="c-code-title">
        <C_Icon
          v-if="languageIcon"
          :name="languageIcon"
          :size="16"
          class="mr-2"
        />
        <span>{{ title || getLanguageTitle(language) }}</span>
      </div>
      <div class="c-code-actions">
        <NTooltip trigger="hover">
          <template #trigger>
            <NButton
              size="tiny"
              quaternary
              @click="copyCode"
              :loading="copying"
            >
              <template #icon>
                <C_Icon
                  :name="copying ? 'mdi:loading' : 'mdi:content-copy'"
                  :loading="copying"
                />
              </template>
            </NButton>
          </template>
          复制代码
        </NTooltip>

        <NTooltip v-if="showFullscreen" trigger="hover">
          <template #trigger>
            <NButton size="tiny" quaternary @click="toggleFullscreen">
              <template #icon>
                <C_Icon
                  :name="
                    isFullscreen ? 'mdi:fullscreen-exit' : 'mdi:fullscreen'
                  "
                />
              </template>
            </NButton>
          </template>
          {{ isFullscreen ? "退出全屏" : "全屏查看" }}
        </NTooltip>
      </div>
    </div>

    <!-- 代码内容区域 -->
    <div class="c-code-content">
      <div
        class="code-wrapper"
        @mouseenter="showFloatingCopy = true"
        @mouseleave="showFloatingCopy = false"
      >
        <NCode
          :key="`code-${language}-${code.length}`"
          :code="code"
          :language="language"
          :hljs="hljs"
          :show-line-numbers="showLineNumbers"
          :word-wrap="wordWrap"
          :trim="trim"
          :style="codeStyle"
          @click="emit('click', $event)"
        />

        <!-- 悬浮复制按钮 -->
        <Transition name="fade">
          <div v-if="showFloatingCopy && !showHeader" class="floating-copy-btn">
            <NTooltip trigger="hover">
              <template #trigger>
                <NButton
                  size="small"
                  quaternary
                  @click="copyCode"
                  :loading="copying"
                  class="copy-floating"
                >
                  <template #icon>
                    <C_Icon
                      :name="copying ? 'mdi:loading' : 'mdi:content-copy'"
                      :loading="copying"
                    />
                  </template>
                </NButton>
              </template>
              复制代码
            </NTooltip>
          </div>
        </Transition>
      </div>

      <!-- 语言加载状态 -->
      <div v-if="languageLoading" class="c-code-loading">
        <NSpin size="small" />
        <span class="ml-2">正在加载 {{ language }} 语言包...</span>
      </div>
    </div>

    <!-- 全屏模态框 -->
    <NModal
      v-model:show="isFullscreen"
      :mask-closable="false"
      :show-icon="false"
      :bordered="false"
      style="width: 100vw; height: 100vh; margin: 0; padding: 0"
    >
      <div class="fullscreen-content">
        <div class="fullscreen-header">
          <div class="fullscreen-title">
            <C_Icon
              v-if="languageIcon"
              :name="languageIcon"
              :size="16"
              class="mr-2"
            />
            <span>{{ title || getLanguageTitle(language) }}</span>
          </div>
          <NButton size="small" quaternary @click="toggleFullscreen">
            <template #icon>
              <C_Icon name="mdi:close" />
            </template>
          </NButton>
        </div>
        <div class="fullscreen-body">
          <NCode
            :key="`fullscreen-code-${language}-${code.length}`"
            :code="code"
            :language="language"
            :hljs="hljs"
            :show-line-numbers="showLineNumbers"
            :word-wrap="wordWrap"
            :trim="trim"
          />
        </div>
      </div>
    </NModal>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  inject,
} from "vue";
import C_Icon from "../C_Icon/index.vue";

// 直接在组件内定义 HighlightManager 接口，避免导入错误
interface HighlightManager {
  getHljs?: () => any;
  loadLanguage?: (language: string) => Promise<void>;
  getLoadedLanguages?: () => string[];
}

// 组件名称定义
defineOptions({
  name: "CCode",
});

interface Props {
  code: string;
  language?: string;
  title?: string;
  showHeader?: boolean;
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  trim?: boolean;
  showFullscreen?: boolean;
  maxHeight?: string | number;
  autoLoadLanguage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  code: "",
  language: "text",
  showHeader: true,
  showLineNumbers: true,
  wordWrap: false,
  trim: true,
  showFullscreen: false,
  autoLoadLanguage: true,
});

const emit = defineEmits<{
  copy: [code: string];
  click: [event: MouseEvent];
  fullscreen: [isFullscreen: boolean];
}>();

// 尝试获取 highlight 实例（如果用户安装了插件）
const highlightManager = inject<HighlightManager | null>(
  "highlightManager",
  null
);

const copying = ref(false);
const isFullscreen = ref(false);
const languageLoading = ref(false);
const showFloatingCopy = ref(false);

// 安全地获取 hljs 实例
const hljs = computed(() => {
  try {
    return highlightManager?.getHljs?.() || null;
  } catch (error) {
    console.warn("Highlight.js not available:", error);
    return null;
  }
});

// 语言图标映射（使用标准的 MDI 图标名称）
const languageIcon = computed(() => {
  const iconMap: Record<string, string> = {
    javascript: "mdi:language-javascript",
    typescript: "mdi:language-typescript",
    python: "mdi:language-python",
    html: "mdi:language-html5",
    css: "mdi:language-css3",
    vue: "mdi:vuejs",
    react: "mdi:react",
    json: "mdi:code-json",
    java: "mdi:language-java",
    cpp: "mdi:language-cpp",
    go: "mdi:language-go",
    rust: "mdi:language-rust",
    php: "mdi:language-php",
    csharp: "mdi:language-csharp",
    sql: "mdi:database",
    yaml: "mdi:file-code",
    xml: "mdi:xml",
    markdown: "mdi:language-markdown",
    bash: "mdi:bash",
    shell: "mdi:console",
    powershell: "mdi:powershell",
    swift: "mdi:language-swift",
    kotlin: "mdi:language-kotlin",
    ruby: "mdi:language-ruby",
  };
  return iconMap[props.language.toLowerCase()] || "mdi:code-braces";
});

// 代码样式
const codeStyle = computed(() => {
  if (!props.maxHeight) return {};
  return {
    maxHeight:
      typeof props.maxHeight === "number"
        ? `${props.maxHeight}px`
        : props.maxHeight,
  };
});

// 自动加载语言包
watch(
  () => props.language,
  async (newLanguage) => {
    if (!props.autoLoadLanguage || newLanguage === "text" || !highlightManager)
      return;

    const loadedLanguages = highlightManager.getLoadedLanguages?.() || [];
    if (loadedLanguages.includes(newLanguage)) return;

    languageLoading.value = true;
    try {
      await highlightManager.loadLanguage?.(newLanguage);
      await nextTick();
    } catch (error) {
      console.warn(`Failed to load language: ${newLanguage}`, error);
    } finally {
      languageLoading.value = false;
    }
  },
  { immediate: true }
);

/**
 * 复制代码到剪贴板
 */
async function copyCode() {
  if (copying.value) return;
  copying.value = true;

  try {
    await navigator.clipboard.writeText(props.code);
    emit("copy", props.code);
  } catch (error) {
    console.error("Copy failed:", error);
  } finally {
    copying.value = false;
  }
}

/**
 * 切换全屏显示状态
 */
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  emit("fullscreen", isFullscreen.value);
}

/**
 * 获取编程语言的显示标题
 */
function getLanguageTitle(lang: string): string {
  const titleMap: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    python: "Python",
    java: "Java",
    cpp: "C++",
    csharp: "C#",
    php: "PHP",
    go: "Go",
    rust: "Rust",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    bash: "Bash",
    shell: "Shell",
    yaml: "YAML",
    xml: "XML",
    markdown: "Markdown",
    sql: "SQL",
    powershell: "PowerShell",
    swift: "Swift",
    kotlin: "Kotlin",
    ruby: "Ruby",
    vue: "Vue",
    react: "React",
  };
  return titleMap[lang.toLowerCase()] || lang.toUpperCase();
}

/**
 * 处理ESC键退出全屏
 */
function handleEscapeKey(event: KeyboardEvent) {
  if (event.key === "Escape" && isFullscreen.value) {
    toggleFullscreen();
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleEscapeKey);
});

defineExpose({
  copyCode,
  toggleFullscreen,
});
</script>

<style lang="scss" scoped>
.mr-2 {
  margin-right: 0.5rem;
}

.ml-2 {
  margin-left: 0.5rem;
}
</style>