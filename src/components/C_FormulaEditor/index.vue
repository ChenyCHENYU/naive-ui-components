<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 公式工作区，项目只需要 v-model 与扁平配置
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <section
    class="c-formula"
    :style="{
      height:
        typeof options.height === 'number'
          ? `${options.height}px`
          : options.height,
    }"
    aria-label="公式编辑器"
  >
    <header class="c-formula__title-row">
      <div
        ><span class="c-formula__eyebrow">FORMULA WORKBENCH</span
        ><h2>规则与试算</h2><p>插入变量、编辑公式，再用试算值验证结果。</p></div
      >
      <div class="c-formula__actions"
        ><NTag
          :type="
            !formula.trim()
              ? 'default'
              : analysis.validation.valid
                ? 'success'
                : 'error'
          "
          size="small"
          >{{
            !formula.trim()
              ? '等待输入'
              : analysis.validation.valid
                ? '语法有效'
                : '需要修正'
          }}</NTag
        ><NButton
          size="small"
          :disabled="options.disabled"
          @click="reset"
          >重置</NButton
        ></div
      >
    </header>
    <div
      v-if="options.templates.length"
      class="c-formula__templates"
      aria-label="公式模板"
    >
      <button
        v-for="template in options.templates"
        :key="template.value"
        type="button"
        :disabled="options.disabled"
        :aria-pressed="formula === template.value"
        @click="formula = template.value"
        ><strong>{{ template.label }}</strong
        ><span>{{ template.description }}</span></button
      >
    </div>
    <div
      class="c-formula__body"
      :class="{
        'c-formula__body--no-sidebar': !options.showVariablePanel,
        'c-formula__body--no-preview': !options.showPreview,
      }"
    >
      <aside
        v-if="options.showVariablePanel"
        class="c-formula__sidebar"
        ><VariablePanel
          :variables="options.variables"
          :functions="options.functions"
          :disabled="options.disabled"
          @select-variable="variable => insert(`[${variable.name}]`)"
          @select-function="fn => insert(`${fn.name}(`)"
      /></aside>
      <div class="c-formula__main">
        <FormulaInput
          ref="formulaInputRef"
          :formula="formula"
          :tokens="analysis.tokens"
          :validation="analysis.validation"
          :disabled="options.disabled"
          :placeholder="options.placeholder"
          @update:formula="updateFormula"
        />
        <details
          v-if="options.showKeyboard"
          class="c-formula__keyboard"
          ><summary>辅助键盘 <span>运算符、数字与退格</span></summary
          ><VirtualKeyboard
            :disabled="options.disabled"
            @key-press="key => insert(key.value)"
            @action="handleAction"
        /></details>
        <div class="c-formula__guide"
          ><C_Icon
            name="mdi:information-outline"
            :size="16"
          /><p
            >变量使用
            <code>[变量名]</code
            >，支持括号、比较和条件函数。右侧结果是当前数据的本地试算。</p
          ></div
        >
      </div>
      <FormulaPreview
        v-if="options.showPreview"
        :formula="formula"
        :eval-result="evalResult"
        :used-variables="usedVariables"
        :editable="options.editableSampleData && !options.disabled"
        @update-value="updateSample"
      />
    </div>
  </section>
</template>
<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { NButton, NTag } from 'naive-ui'
  import type {
    FormulaEditorProps,
    FormulaEditorEmits,
    FormulaEditorExpose,
  } from './types'
  import { useFormulaEditor } from './composables/useFormulaEditor'
  import C_Icon from '../C_Icon/index.vue'
  import FormulaInput from './components/FormulaInput.vue'
  import VariablePanel from './components/VariablePanel.vue'
  import VirtualKeyboard from './components/VirtualKeyboard.vue'
  import FormulaPreview from './components/FormulaPreview.vue'
  defineOptions({ name: 'C_FormulaEditor' })
  const props = withDefaults(defineProps<FormulaEditorProps>(), {
    disabled: false,
    showPreview: true,
    showKeyboard: true,
    showVariablePanel: true,
    editableSampleData: true,
  })
  const emit = defineEmits<FormulaEditorEmits>()
  const {
    options,
    formula,
    analysis,
    evalResult,
    usedVariables,
    updateSample,
    reset,
  } = useFormulaEditor(props)
  const formulaInputRef = ref<InstanceType<typeof FormulaInput>>()
  watch(formula, value => {
    emit('update:modelValue', value)
    emit('change', value)
  })
  watch(
    () => analysis.value.validation,
    value => emit('validation-change', value),
    { immediate: true }
  )
  /** 编辑行为全部经过禁用状态检查。 */
  function updateFormula(value: string): void {
    if (!options.value.disabled) formula.value = value
  }
  /** 项目和内部面板共用原生字符索引插入流程。 */
  function insert(text: string): void {
    if (!options.value.disabled) formulaInputRef.value?.insertAtCursor(text)
  }
  /** 辅助键盘只负责编辑，不拥有第二份公式状态。 */
  function handleAction(action: string): void {
    if (options.value.disabled) return
    if (action === 'BACKSPACE') formulaInputRef.value?.backspace()
    if (action === 'CLEAR') formula.value = ''
  }
  defineExpose<FormulaEditorExpose>({
    getValue: () => formula.value,
    setValue: value => {
      formula.value = value
    },
    reset,
    validate: () => analysis.value.validation,
    insertAtCursor: insert,
    focus: () => formulaInputRef.value?.focus(),
  })
</script>
<style lang="scss" scoped>
  @use './index.scss';
</style>
