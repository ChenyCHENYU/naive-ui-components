<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Guide,
    type GuideExpose,
    type GuideStep,
  } from '@robot-admin/naive-ui-components/C_Guide'

  const guideRef = ref<GuideExpose | null>(null)
  const steps: GuideStep[] = [
    {
      element: () => document.querySelector('[data-guide="search"]'),
      popover: {
        title: '搜索',
        description: '快速查找功能入口。',
        illustration: 'search',
      },
    },
    { popover: { title: '准备就绪', description: '开始使用。' } },
  ]

  const replay = async (): Promise<void> => {
    guideRef.value?.stopGuide()
    guideRef.value?.resetCompleted()
    if (!guideRef.value?.isCompleted()) await guideRef.value?.startGuide(true)
  }
  void replay
</script>

<template>
  <C_Guide
    ref="guideRef"
    :steps="steps"
    :persistence="{ enabled: true, keyPrefix: 'workspace-v2' }"
    :theme="{ overlayOpacity: 0.4 }"
    skip-btn-text="暂时跳过"
    show-skip-button
    skip-missing-elements
  />
</template>
