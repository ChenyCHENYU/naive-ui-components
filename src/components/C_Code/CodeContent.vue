<template>
  <div class="c-code-renderer">
    <NCode
      v-if="hljs || nativeProvider"
      :code="text"
      :language="language"
      :hljs="hljs"
      :show-line-numbers="showLineNumbers"
      :word-wrap="wordWrap"
      :trim="false"
    />
    <div
      v-else
      class="c-code-plain"
      :class="{ 'c-code-plain--wrap': wordWrap }"
    >
      <pre
        v-if="showLineNumbers && !wordWrap"
        class="c-code-plain__numbers"
        aria-hidden="true"
        >{{ lineNumbers }}</pre>
      <pre class="c-code-plain__source"><code>{{ text }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { NCode } from 'naive-ui'
  import type { HLJSApi } from 'highlight.js'

  const props = defineProps<{
    code: string
    language: string
    hljs?: Pick<HLJSApi, 'highlight' | 'getLanguage'>
    nativeProvider: boolean
    showLineNumbers: boolean
    wordWrap: boolean
    trim: boolean
  }>()
  const text = computed(() => (props.trim ? props.code.trim() : props.code))
  // 原生纯文本回退不启动 Naive 高亮 hook，也不把外部代码转成 HTML。
  const lineNumbers = computed(() =>
    Array.from(
      {
        length: text.value.replace(/(?:\r\n|\r|\n)$/, '').split(/\r\n|\r|\n/)
          .length,
      },
      (_, index) => index + 1
    ).join('\n')
  )
</script>

<style scoped>
  .c-code-renderer {
    box-sizing: border-box;
    min-width: 0;
    padding: 16px;
    overflow: auto;
    line-height: 1.5;
  }
  .c-code-plain {
    display: flex;
    align-items: flex-start;
    color: var(--c-text-1, var(--c-theme-text-1));
    font:
      14px / 1.5 ui-monospace,
      SFMono-Regular,
      Menlo,
      Consolas,
      monospace;
  }
  .c-code-plain pre,
  .c-code-plain code {
    margin: 0;
    font: inherit;
    white-space: pre;
  }
  .c-code-plain__numbers {
    flex: none;
    padding-inline-end: 12px;
    color: var(--c-text-3, var(--c-theme-text-3));
    text-align: end;
    user-select: none;
  }
  .c-code-plain__source {
    min-width: 0;
  }
  .c-code-plain--wrap .c-code-plain__source,
  .c-code-plain--wrap code {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-all;
  }
</style>
