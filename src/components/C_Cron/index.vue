<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: Cron 计划工作区，状态编排由 useCronEditor 管理
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <section
    class="c-cron"
    :style="{
      height:
        typeof options.height === 'number'
          ? `${options.height}px`
          : options.height,
    }"
    aria-label="Cron 计划编辑器"
  >
    <header class="c-cron__header">
      <div class="c-cron__title-row">
        <div
          ><span class="c-cron__eyebrow">SCHEDULE BUILDER</span><h2>执行计划</h2
          ><p>选择一个计划，再按需要调整时间。</p></div
        >
        <NTag
          :type="validation.valid ? 'success' : 'error'"
          size="small"
          >{{
            pending && validation.valid
              ? '待应用'
              : validation.valid
                ? '规则有效'
                : '请修正规则'
          }}</NTag
        >
      </div>
      <CronTemplates
        v-if="options.showTemplates"
        :templates="options.templates"
        :current-value="expression"
        :disabled="options.disabled"
        @select="apply"
      />
    </header>
    <div
      class="c-cron__workspace"
      :class="{ 'c-cron__workspace--compact': !options.showPreview }"
    >
      <div class="c-cron__editor">
        <div class="c-cron__section-heading"
          ><span class="c-cron__step">01</span
          ><div
            ><h3>配置执行时间</h3
            ><p>先选时间字段，再设置规则。日与星期自动互斥。</p></div
          ></div
        >
        <div
          class="c-cron__segments"
          aria-label="时间字段"
        >
          <button
            v-for="meta in visibleFields"
            :key="meta.type"
            type="button"
            class="c-cron__segment"
            :aria-label="`编辑${meta.label}字段`"
            :aria-pressed="activeField === meta.type"
            :class="{ 'c-cron__segment--active': activeField === meta.type }"
            @click="activeField = meta.type"
          >
            <span class="c-cron__segment-label">{{ meta.label }}</span
            ><code>{{
              segments[CRON_FIELD_META.indexOf(meta)] || '未选择'
            }}</code>
          </button>
        </div>
        <CronFieldEditor
          :model-value="activeValue"
          :meta="activeMeta"
          :disabled="options.disabled"
          @update:model-value="updateField"
        />
        <div class="c-cron__expression">
          <label :for="inputId">Cron 表达式 · 秒 分 时 日 月 周</label>
          <div class="c-cron__expr-row">
            <NInput
              v-model:value="draft"
              :input-props="{ id: inputId, 'aria-label': 'Cron 表达式' }"
              :status="validation.valid ? undefined : 'error'"
              :disabled="options.disabled"
              placeholder="0 30 8 * * ?"
              @keydown.enter="apply()"
            />
            <NButton
              :disabled="options.disabled || !validation.valid || !pending"
              @click="apply()"
              >应用</NButton
            >
            <NButton
              :disabled="options.disabled"
              @click="reset"
              >重置</NButton
            >
          </div>
          <p
            class="c-cron__feedback"
            :class="{ 'c-cron__feedback--error': !validation.valid }"
            role="status"
            >{{
              !validation.valid
                ? validation.message
                : pending
                  ? '表达式尚未应用，按 Enter 或点击应用更新计划。'
                  : description
            }}</p
          >
        </div>
      </div>
      <CronPreview
        v-if="options.showPreview"
        :next-executions="preview.nextExecutions.value"
        :computing="preview.computing.value"
        :count="options.previewCount"
        :validation="validation"
        :pending="pending"
        :format-date="preview.formatDate"
        :format-week-day="preview.formatWeekDay"
      />
    </div>
  </section>
</template>
<script setup lang="ts">
  import { useId, watch } from 'vue'
  import { NInput, NButton, NTag } from 'naive-ui'
  import type { CronProps, CronEmits, CronExpose } from './types'
  import { CRON_FIELD_META } from './constants'
  import { useCronEditor } from './composables/useCronEditor'
  import CronFieldEditor from './components/CronFieldEditor.vue'
  import CronTemplates from './components/CronTemplates.vue'
  import CronPreview from './components/CronPreview.vue'
  defineOptions({ name: 'C_Cron' })
  const props = withDefaults(defineProps<CronProps>(), {
    disabled: false,
    showSecond: true,
    showTemplates: true,
    showPreview: true,
  })
  const emit = defineEmits<CronEmits>()
  const inputId = `cron-expression-${useId()}`
  const {
    options,
    expression,
    draft,
    validation,
    pending,
    description,
    activeField,
    activeMeta,
    activeValue,
    visibleFields,
    segments,
    preview,
    apply,
    updateField,
    reset,
  } = useCronEditor(props)
  watch(expression, value => {
    emit('update:modelValue', value)
    emit('change', value)
  })
  watch(validation, value => emit('validation-change', value), {
    immediate: true,
  })
  defineExpose<CronExpose>({
    getValue: () => expression.value,
    setValue: apply,
    reset,
    validate: () => validation.value,
  })
</script>
<style lang="scss" scoped>
  @use './index.scss';
</style>
