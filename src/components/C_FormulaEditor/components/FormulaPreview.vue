<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-25
 * @Description: 公式计算结果预览
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->

<template>
  <div class="formula-preview">
    <div class="formula-preview__header">
      <C_Icon name="mdi:calculator-variant-outline" :size="15" />
      <span>计算预览</span>
    </div>

    <!-- 当没有公式时 -->
    <div v-if="!formula.trim()" class="formula-preview__empty">
      输入公式后可预览计算结果
    </div>

    <!-- 没有样例数据时 -->
    <div v-else-if="!hasSampleData" class="formula-preview__empty">
      传入 sampleData 后可预览计算结果
    </div>

    <!-- 有结果 -->
    <template v-else>
      <!-- 使用到的变量值 -->
      <div v-if="usedVariables.length > 0" class="formula-preview__vars">
        <div class="formula-preview__vars-title">变量值</div>
        <div
          v-for="item in usedVariables"
          :key="item.name"
          class="formula-preview__var-row"
        >
          <span class="formula-preview__var-name">{{ item.name }}</span>
          <span class="formula-preview__var-eq">=</span>
          <span class="formula-preview__var-value">{{ item.value }}</span>
        </div>
      </div>

      <NDivider style="margin: 8px 0" />

      <!-- 计算结果 -->
      <div class="formula-preview__result">
        <span class="formula-preview__result-label">结果</span>
        <span
          v-if="evalResult.success && evalResult.result !== undefined"
          class="formula-preview__result-value"
        >
          {{ formatResult(evalResult.result) }}
        </span>
        <span
          v-else-if="evalResult.error"
          class="formula-preview__result-error"
        >
          <C_Icon name="mdi:alert-circle-outline" :size="14" />
          {{ evalResult.error }}
        </span>
        <span v-else class="formula-preview__result-empty"> — </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { NDivider } from "naive-ui";
import C_Icon from "../../C_Icon/index.vue";

interface EvalResult {
  success: boolean;
  result: unknown;
  error?: string;
}

interface UsedVariable {
  name: string;
  value: unknown;
}

interface Props {
  formula: string;
  evalResult: EvalResult;
  usedVariables: UsedVariable[];
  hasSampleData: boolean;
}

defineProps<Props>();

/** 格式化计算结果 */
function formatResult(value: unknown): string {
  if (typeof value === "number") {
    /* 数字保留合理精度 */
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(6)).toString();
  }
  if (typeof value === "boolean") {
    return value ? "真 (true)" : "假 (false)";
  }
  return String(value);
}
</script>

<style lang="scss" scoped>
@use "./FormulaPreview.scss";
</style>
