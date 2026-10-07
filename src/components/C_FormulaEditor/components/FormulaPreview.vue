<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 可编辑试算值与明确的计算结果，输入为空不会被当作零
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <aside
    class="formula-preview"
    aria-label="公式试算"
  >
    <header
      ><span class="formula-preview__step">02</span
      ><div
        ><h3>验证计算结果</h3><p>调整试算值，观察规则是否符合预期。</p></div
      ></header
    >
    <div
      class="formula-preview__result"
      :class="{ 'formula-preview__result--error': !!evalResult.error }"
      role="status"
      aria-live="polite"
    >
      <span class="formula-preview__result-label">{{
        evalResult.error ? '暂时无法计算' : '试算结果'
      }}</span>
      <output
        v-if="evalResult.success && evalResult.result !== undefined"
        class="formula-preview__result-value"
        >{{ formatResult(evalResult.result) }}</output
      >
      <span
        v-else
        class="formula-preview__result-empty"
        >{{
          !formula.trim()
            ? '输入公式后展示结果'
            : evalResult.error || '等待数据'
        }}</span
      >
    </div>
    <div class="formula-preview__vars"
      ><div class="formula-preview__vars-title"
        >本次使用的试算值 <span>{{ usedVariables.length }} 项</span></div
      >
      <div
        v-for="item in usedVariables"
        :key="item.field"
        class="formula-preview__var-row"
        ><div class="formula-preview__var-heading"
          ><label :for="`${inputId}-${item.field}`">{{ item.name }}</label
          ><code>{{ item.field }}</code></div
        >
        <NInputNumber
          v-if="editable && item.type === 'number'"
          :value="typeof item.value === 'number' ? item.value : null"
          :input-props="{
            id: `${inputId}-${item.field}`,
            'aria-label': `试算值：${item.name}`,
          }"
          placeholder="请输入数值"
          @update:value="value => emit('update-value', item.field, value)"
        />
        <NSwitch
          v-else-if="editable && item.type === 'boolean'"
          :value="item.value === true"
          :aria-label="`试算值：${item.name}`"
          @update:value="value => emit('update-value', item.field, value)"
        />
        <NInput
          v-else-if="editable && item.type === 'text'"
          :value="typeof item.value === 'string' ? item.value : ''"
          :input-props="{
            id: `${inputId}-${item.field}`,
            'aria-label': `试算值：${item.name}`,
          }"
          @update:value="value => emit('update-value', item.field, value)"
        />
        <span
          v-else
          class="formula-preview__var-value"
          >{{ item.value ?? '未提供' }}</span
        ><p v-if="item.description">{{ item.description }}</p>
      </div>
      <p
        v-if="!usedVariables.length"
        class="formula-preview__empty"
        >{{
          formula.trim()
            ? '当前公式没有引用变量。'
            : '引用变量后，对应数据会出现在这里。'
        }}</p
      >
    </div>
    <p class="formula-preview__note"
      >试算值仅用于本次验证，修改不会写入业务数据。</p
    >
  </aside>
</template>
<script setup lang="ts">
  import { useId } from 'vue'
  import { NInput, NInputNumber, NSwitch } from 'naive-ui'
  import type { FormulaVariable } from '../types'
  defineOptions({ name: 'FormulaPreview' })
  defineProps<{
    formula: string
    evalResult: { success: boolean; result: unknown; error?: string }
    usedVariables: (FormulaVariable & { value?: number | string | boolean })[]
    editable: boolean
  }>()
  const emit = defineEmits<{
    'update-value': [field: string, value: number | string | boolean | null]
  }>()
  const inputId = `formula-sample-${useId()}`
  /** 保留布尔和文本结果；数值最多保留六位小数，不伪装成业务单位。 */
  function formatResult(value: unknown): string {
    if (typeof value === 'number')
      return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 6,
      }).format(value)
    if (typeof value === 'boolean') return value ? '真 · true' : '假 · false'
    return String(value)
  }
</script>
<style lang="scss" scoped>
  @use './FormulaPreview.scss';
</style>
