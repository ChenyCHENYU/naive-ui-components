<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 时间字段的模式、参数与点选预览统一编辑
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
-->
<template>
  <div class="cron-field-editor">
    <div class="cron-field-editor__heading"
      ><strong>{{ meta.label }}的执行规则</strong
      ><span>可选 {{ meta.min }}–{{ meta.max }}</span></div
    >
    <div
      class="cron-field-editor__modes"
      aria-label="执行规则模式"
    >
      <button
        v-for="option in modes"
        :key="option.value"
        type="button"
        :disabled="disabled"
        :aria-pressed="modelValue.mode === option.value"
        @click="update({ mode: option.value })"
        >{{ option.label }}</button
      >
    </div>
    <div class="cron-field-editor__parameters">
      <template v-if="modelValue.mode === 'step'">
        <span>从</span
        ><NInputNumber
          :value="modelValue.stepStart"
          :min="meta.min"
          :max="meta.max"
          :disabled="disabled"
          :input-props="{ 'aria-label': '起始值' }"
          @update:value="value => update({ stepStart: value ?? meta.min })"
        /><span>{{ meta.label }}开始，每隔</span
        ><NInputNumber
          :value="modelValue.stepInterval"
          :min="1"
          :max="meta.max - meta.min + 1"
          :disabled="disabled"
          :input-props="{ 'aria-label': '间隔值' }"
          @update:value="value => update({ stepInterval: value ?? 1 })"
        /><span>{{ meta.label }}执行</span>
      </template>
      <template v-else-if="modelValue.mode === 'range'">
        <span>从</span
        ><NInputNumber
          :value="modelValue.rangeStart"
          :min="meta.min"
          :max="modelValue.rangeEnd"
          :disabled="disabled"
          :input-props="{ 'aria-label': '范围起点' }"
          @update:value="value => update({ rangeStart: value ?? meta.min })"
        /><span>到</span
        ><NInputNumber
          :value="modelValue.rangeEnd"
          :min="modelValue.rangeStart"
          :max="meta.max"
          :disabled="disabled"
          :input-props="{ 'aria-label': '范围终点' }"
          @update:value="value => update({ rangeEnd: value ?? meta.max })"
        />
      </template>
      <template v-else-if="modelValue.mode === 'specific'"
        ><span>已选 {{ modelValue.specificValues.length }} 个值</span
        ><button
          type="button"
          :disabled="disabled"
          @click="update({ specificValues: [] })"
          >清空选择</button
        ></template
      >
      <span v-else>{{
        modelValue.mode === 'none'
          ? '该字段不参与匹配，由另一个日期字段决定执行日。'
          : `匹配每一个${meta.label}值，下面高亮的是当前规则覆盖的值。`
      }}</span>
    </div>
    <div
      class="cron-field-editor__grid"
      :class="{ 'cron-field-editor__grid--week': meta.type === 'week' }"
    >
      <button
        v-for="item in values"
        :key="item.value"
        type="button"
        class="cron-field-editor__cell"
        :disabled="disabled || modelValue.mode === 'none'"
        :aria-label="`选择${meta.label}值 ${item.label}`"
        :aria-pressed="highlighted.has(item.value)"
        :class="{ 'cron-field-editor__cell--on': highlighted.has(item.value) }"
        @click="pick(item.value)"
        >{{ item.label }}</button
      >
    </div>
    <p class="cron-field-editor__hint">{{
      modelValue.mode === 'none'
        ? '日与星期只指定一个，另一个使用 ?。'
        : '点选数值会切换到「指定值」模式，支持多选。'
    }}</p>
  </div>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { NInputNumber } from 'naive-ui'
  import type { CronFieldMeta, CronFieldValue, CronFieldMode } from '../types'
  defineOptions({ name: 'CronFieldEditor' })
  const props = defineProps<{
    modelValue: CronFieldValue
    meta: CronFieldMeta
    disabled?: boolean
  }>()
  const emit = defineEmits<{ 'update:modelValue': [value: CronFieldValue] }>()
  const modes = computed<{ value: CronFieldMode; label: string }[]>(() => [
    { value: 'every', label: '每个值' },
    { value: 'step', label: '固定间隔' },
    { value: 'range', label: '连续范围' },
    { value: 'specific', label: '指定值' },
    ...(props.meta.type === 'day' || props.meta.type === 'week'
      ? [{ value: 'none' as const, label: '不指定' }]
      : []),
  ])
  const values = computed(() =>
    Array.from({ length: props.meta.max - props.meta.min + 1 }, (_, index) => {
      const value = props.meta.min + index
      return {
        value,
        label:
          props.meta.valueLabels?.[value] ?? String(value).padStart(2, '0'),
      }
    })
  )
  const highlighted = computed(
    () =>
      new Set(
        values.value
          .filter(({ value }) => {
            const field = props.modelValue
            if (field.mode === 'every') return true
            if (field.mode === 'range')
              return value >= field.rangeStart && value <= field.rangeEnd
            if (field.mode === 'step')
              return (
                value >= field.stepStart &&
                (value - field.stepStart) % Math.max(1, field.stepInterval) ===
                  0
              )
            return (
              field.mode === 'specific' && field.specificValues.includes(value)
            )
          })
          .map(item => item.value)
      )
  )
  /** 参数与模式修改始终复制数组，避免直接修改受控属性。 */
  function update(partial: Partial<CronFieldValue>): void {
    if (!props.disabled)
      emit('update:modelValue', {
        ...props.modelValue,
        specificValues: [...props.modelValue.specificValues],
        ...partial,
      })
  }
  /** 任意值可直接开始点选，清空后保持无效状态以免意外变为每秒执行。 */
  function pick(value: number): void {
    const selected =
      props.modelValue.mode === 'specific'
        ? [...props.modelValue.specificValues]
        : []
    const index = selected.indexOf(value)
    if (index < 0) selected.push(value)
    else selected.splice(index, 1)
    update({ mode: 'specific', specificValues: selected })
  }
</script>
<style lang="scss" scoped>
  @use './CronFieldEditor.scss';
</style>
