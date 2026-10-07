<!-- 真实消费者验证新扁平配置与旧独立属性的类型兼容。 -->
<script setup lang="ts">
  import { ref } from 'vue'
  import { C_Cron, type CronConfig } from '../../dist/C_Cron'
  import {
    C_FormulaEditor,
    type FormulaEditorConfig,
  } from '../../dist/C_FormulaEditor'
  const cron = ref('0 30 8 * * ?')
  const formula = ref('[完成值] * 2')
  const cronConfig: CronConfig = { previewCount: 3, templates: [] }
  const formulaConfig: FormulaEditorConfig = {
    variables: [{ name: '完成值', field: 'completed', type: 'number' }],
    sampleData: { completed: 3 },
    editableSampleData: true,
  }
</script>
<template>
  <C_Cron
    v-model="cron"
    :config="cronConfig"
  />
  <C_Cron
    v-model="cron"
    :show-preview="false"
  />
  <C_FormulaEditor
    v-model="formula"
    :config="formulaConfig"
  />
  <C_FormulaEditor
    v-model="formula"
    :variables="formulaConfig.variables"
    :show-keyboard="false"
  />
</template>
