<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-06-01
 * @Description: 用户引导组件（基于 driver.js）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
-->
<template>
  <NTooltip
    placement="bottom"
    trigger="hover"
  >
    <template #trigger>
      <NButton
        text
        @click="startGuide"
      >
        <C_Icon
          name="mdi:sign-routes"
          :size="18"
        />
      </NButton>
    </template>
    <span>功能引导</span>
  </NTooltip>
</template>

<script setup lang="ts">
  import { NTooltip, NButton } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import { driver } from 'driver.js'
  import 'driver.js/dist/driver.css'

  defineOptions({ name: 'C_Guide' })

  export interface GuideStep {
    element: string
    popover: {
      title: string
      description: string
      side?: 'top' | 'right' | 'bottom' | 'left'
    }
  }

  const props = withDefaults(
    defineProps<{
      steps?: GuideStep[]
      doneBtnText?: string
      nextBtnText?: string
      prevBtnText?: string
    }>(),
    {
      steps: () => [],
      doneBtnText: '完成',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
    }
  )

  const startGuide = () => {
    if (!props.steps.length) {
      console.warn(
        '[C_Guide] 未提供引导步骤（steps），请通过 :steps prop 传入。'
      )
      return
    }

    const driverObj = driver({
      popoverClass: 'driverjs-theme',
      animate: true,
      showProgress: true,
      doneBtnText: props.doneBtnText,
      nextBtnText: props.nextBtnText,
      prevBtnText: props.prevBtnText,
      steps: props.steps,
    })

    driverObj.drive()
  }

  defineExpose({ startGuide })
</script>
