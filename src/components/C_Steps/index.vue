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
    :style="themeStyle"
    :class="[`steps-${direction}`, { 'steps-connected': connected }]"
  >
    <component
      v-for="(step, index) in steps"
      :key="index"
      :is="clickable ? 'button' : 'div'"
      :type="clickable ? 'button' : undefined"
      :disabled="clickable && step.disabled"
      :aria-current="getStatus(index) === 'process' ? 'step' : undefined"
      class="step-item"
      :class="[
        `step-${getStatus(index)}`,
        { 'step-clickable': clickable && !step.disabled },
      ]"
      @click="handleClick(index)"
    >
      <div class="step-indicator">
        <div class="step-icon">
          <C_Icon
            v-if="iconNames[index]"
            :name="iconNames[index]"
            :size="16"
            aria-hidden="true"
          />
          <i
            v-else-if="step.icon"
            :class="step.icon"
            aria-hidden="true"
          ></i>
          <i
            v-else-if="getStatus(index) === 'finish'"
            class="i-mdi:check"
            aria-hidden="true"
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
    </component>
  </div>
</template>

<script setup lang="ts">
  import { computed, defineAsyncComponent } from 'vue'
  import { useComponentTheme } from '../../composables/useComponentTheme'
  import type { StepsProps } from './types'

  defineOptions({ name: 'C_Steps' })
  const themeStyle = useComponentTheme()
  // 默认数字与历史 CSS 图标不加载 Iconify；只有命中的自定义图标才实例化。
  const C_Icon = defineAsyncComponent(() => import('../C_Icon/index.vue'))

  const props = withDefaults(defineProps<StepsProps>(), {
    current: 0,
    direction: 'horizontal',
    clickable: false,
    connected: false,
  })

  const emit = defineEmits<{
    'update:current': [number]
    change: [number]
  }>()

  // 只识别单个 Iconify 标识；旧 CSS 类及组合类继续按原样交给宿主样式。
  const iconNames = computed(() =>
    props.steps.map(step => {
      const name = step.icon?.replace(/^i-/, '') ?? ''
      return /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
        ? name
        : ''
    })
  )

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
