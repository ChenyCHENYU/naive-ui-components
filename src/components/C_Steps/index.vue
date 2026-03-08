<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 步骤条组件
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <div
    class="c-steps"
    :class="[`steps-${direction}`, { 'steps-connected': connected }]"
  >
    <div
      v-for="(step, index) in steps"
      :key="index"
      class="step-item"
      :class="[
        `step-${getStatus(index)}`,
        { 'step-clickable': clickable && !step.disabled },
      ]"
      @click="handleClick(index)"
    >
      <div class="step-indicator">
        <div class="step-icon">
          <i
            v-if="step.icon"
            :class="step.icon"
          ></i>
          <i
            v-else-if="getStatus(index) === 'finish'"
            class="i-mdi:check"
          ></i>
          <span
            v-else
            class="step-index"
            >{{ index + 1 }}</span
          >
        </div>
        <div
          v-if="index < steps.length - 1"
          class="step-line"
        />
      </div>
      <div class="step-content">
        <div class="step-title">{{ step.title }}</div>
        <div
          v-if="step.time"
          class="step-time"
          >{{ step.time }}</div
        >
        <div
          v-if="step.description"
          class="step-description"
        >
          {{ step.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'C_Steps' })

  export interface StepItem {
    title: string
    description?: string
    time?: string
    icon?: string
    status?: 'wait' | 'process' | 'finish' | 'error'
    disabled?: boolean
    detail?: string
  }

  const props = withDefaults(
    defineProps<{
      steps: StepItem[]
      current?: number
      direction?: 'horizontal' | 'vertical'
      clickable?: boolean
      /** 水平模式下线条是否与图标紧密相连，默认 false（两端留有对称间距）*/
      connected?: boolean
    }>(),
    {
      current: 0,
      direction: 'horizontal',
      clickable: false,
      connected: false,
    }
  )

  const emit = defineEmits<{
    'update:current': [number]
    change: [number]
  }>()

  const getStatus = (index: number) => {
    if (props.steps[index].status) {
      return props.steps[index].status
    }
    if (index < props.current) return 'finish'
    if (index === props.current) return 'process'
    return 'wait'
  }

  const handleClick = (index: number) => {
    if (!props.clickable || props.steps[index].disabled) return
    emit('update:current', index)
    emit('change', index)
  }
</script>

<style scoped lang="scss">
  @use './index.scss';
</style>
