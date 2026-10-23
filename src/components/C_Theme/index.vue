<!--
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-05-13
 * @Description: 主题组件
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
        :aria-label="themeTooltip"
        @click="cycleThemeMode"
      >
        <C_Icon
          :name="currentIconName"
          :size="18"
        />
      </NButton>
    </template>
    <span>{{ themeTooltip }}</span>
  </NTooltip>
</template>

<script setup lang="ts">
  import { useComponentLocale } from '../../config'
  import { computed } from 'vue'
  import { NTooltip, NButton } from 'naive-ui'
  import C_Icon from '../C_Icon/index.vue'
  import type { ThemeMode } from './types'

  defineOptions({ name: 'C_Theme' })

  const { t } = useComponentLocale()
  const props = withDefaults(
    defineProps<{
      modelValue?: ThemeMode
    }>(),
    { modelValue: 'system' }
  )

  const emit = defineEmits<{
    'update:modelValue': [mode: ThemeMode]
  }>()

  const currentIconName = computed(() => {
    switch (props.modelValue) {
      case 'light':
        return 'mdi:white-balance-sunny'
      case 'dark':
        return 'mdi:moon-and-stars'
      default:
        return 'mdi:sun-moon-stars'
    }
  })

  const themeTooltip = computed(() => {
    switch (props.modelValue) {
      case 'light':
        return t('theme.light')
      case 'dark':
        return t('theme.dark')
      default:
        return t('theme.system')
    }
  })

  const cycleThemeMode = () => {
    const modes: ThemeMode[] = ['system', 'light', 'dark']
    const currentIndex = modes.indexOf(props.modelValue)
    const nextIndex = (currentIndex + 1) % modes.length
    emit('update:modelValue', modes[nextIndex])
  }
</script>
