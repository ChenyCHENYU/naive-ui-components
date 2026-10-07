<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 原生公式输入与独立高亮预览，保留输入法、文本选择与键盘体验
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="formula-input"
    :class="{
      'formula-input--disabled': disabled,
      'formula-input--error': !validation.valid && formula.trim(),
    }"
  >
    <div class="formula-input__header"
      ><span class="formula-input__label">01 / 编辑公式</span
      ><button
        v-if="formula.trim() && !disabled"
        type="button"
        class="formula-input__clear"
        @click="clear"
        >清空公式</button
      ></div
    >
    <textarea
      ref="editorRef"
      v-model="draft"
      class="formula-input__editor"
      :readonly="disabled"
      aria-label="公式输入"
      :aria-invalid="!validation.valid && !!formula.trim()"
      :aria-describedby="feedbackId"
      :placeholder="placeholder"
      spellcheck="false"
      @select="saveSelection"
      @click="saveSelection"
      @keyup="saveSelection"
      @blur="saveSelection"
    />
    <div
      v-if="tokens.length"
      class="formula-input__tokens"
      aria-label="公式结构预览"
    >
      <span class="formula-input__tokens-label">结构预览</span
      ><span
        v-for="(token, index) in tokens"
        :key="index"
        :class="`formula-token formula-token--${token.type}`"
        >{{
          token.type === 'variable' ? `[${token.value}]` : token.value
        }}</span
      >
    </div>
    <div
      :id="feedbackId"
      class="formula-input__validation"
      role="status"
    >
      <span
        :class="
          !formula.trim()
            ? 'formula-input__validation-hint'
            : validation.valid
              ? 'formula-input__validation-success'
              : 'formula-input__validation-error'
        "
        >{{
          !formula.trim()
            ? '点击左侧变量开始，也可以直接输入 [变量名]。'
            : validation.valid
              ? '语法校验通过，可在右侧调整数据试算。'
              : validation.message
        }}</span
      >
      <button
        v-if="validation.position !== undefined"
        type="button"
        class="formula-input__locate"
        @click="locateError"
        >定位错误</button
      >
    </div>
  </div>
</template>
<script setup lang="ts">
  import { ref, watch, nextTick, useId } from 'vue'
  import type { FormulaToken, FormulaValidation } from '../types'
  defineOptions({ name: 'FormulaInput' })
  const props = withDefaults(
    defineProps<{
      formula: string
      tokens: FormulaToken[]
      validation: FormulaValidation
      variableNames?: Set<string>
      disabled?: boolean
      placeholder?: string
    }>(),
    { disabled: false, placeholder: '例如：[完成值] / [目标值] * 100' }
  )
  const emit = defineEmits<{ 'update:formula': [value: string] }>()
  const editorRef = ref<HTMLTextAreaElement>()
  const draft = ref(props.formula)
  const feedbackId = `formula-feedback-${useId()}`
  let start = draft.value.length
  let end = start
  watch(draft, value => emit('update:formula', value), { flush: 'sync' })
  watch(
    () => props.formula,
    value => {
      if (value === draft.value) return
      draft.value = value
      start = end = value.length
    }
  )
  /** 记录原生字符索引，不把高亮标签的长度误当作公式长度。 */
  function saveSelection(): void {
    if (!editorRef.value) return
    start = editorRef.value.selectionStart
    end = editorRef.value.selectionEnd
  }
  /** 插入与退格都使用同一个文本替换流程，变量名称可以包含中文。 */
  function replaceSelection(text: string, from = start, to = end): void {
    if (props.disabled) return
    const position = Math.max(0, Math.min(from, draft.value.length))
    draft.value =
      draft.value.slice(0, position) +
      text +
      draft.value.slice(Math.max(position, to))
    start = end = position + text.length
    nextTick(() => {
      editorRef.value?.focus({ preventScroll: true })
      editorRef.value?.setSelectionRange(start, end)
    })
  }
  /** 在保存的选择区插入纯文本，无 HTML、Range 或 execCommand。 */
  function insertAtCursor(text: string): void {
    replaceSelection(text)
  }
  /** 变量作为一个整体删除，普通文本按完整 Unicode 字符删除。 */
  function backspace(): void {
    if (start !== end) {
      replaceSelection('')
      return
    }
    if (start === 0) return
    const variable = props.tokens.find(
      token => token.type === 'variable' && token.end === start
    )
    const width = Array.from(draft.value.slice(0, start)).pop()?.length ?? 1
    replaceSelection('', variable?.start ?? start - width, end)
  }
  /** 清空公式后继续输入。 */
  function clear(): void {
    replaceSelection('', 0, draft.value.length)
  }
  /** 将光标移到末尾，兼容现有公开实例方法。 */
  function moveCursorToEnd(): void {
    start = end = draft.value.length
    editorRef.value?.setSelectionRange(start, end)
  }
  /** 显式聚焦保持自然的末尾位置。 */
  function focus(): void {
    editorRef.value?.focus({ preventScroll: true })
    moveCursorToEnd()
  }
  /** 精确选中解析器报告的字符，方便修正问题。 */
  function locateError(): void {
    const position = props.validation.position ?? 0
    editorRef.value?.focus({ preventScroll: true })
    editorRef.value?.setSelectionRange(
      position,
      Math.min(position + 1, draft.value.length)
    )
    saveSelection()
  }
  defineExpose({ insertAtCursor, backspace, clear, focus, moveCursorToEnd })
</script>
<style lang="scss" scoped>
  @use './FormulaInput.scss';
</style>
