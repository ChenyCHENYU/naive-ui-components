/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-26
 * @Description: 小窗播放（滚动时自动浮动）
 * @Migration: naive-ui-components 组件库迁移版本
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import { ref, watch, onBeforeUnmount, type Ref } from 'vue'

/**
 * 小窗播放 composable
 * - 当播放器滚出可视区域时自动切换为小窗浮动
 * - 使用文档流锚点判断可见性并保留原位高度
 * - 点击小窗可滚回原位
 * @param containerRef 保持在文档流中的原位锚点，不能随小窗自身切换 fixed。
 */
export function useMiniPlayer(
  containerRef: Ref<HTMLElement | null>,
  enabled: Ref<boolean>
) {
  /** 是否处于小窗模式 */
  const isMiniMode = ref(false)
  const placeholderHeight = ref(0)

  /** IntersectionObserver 实例 */
  let observer: IntersectionObserver | null = null

  /** 初始化观察器 */
  function initObserver() {
    if (
      observer ||
      !containerRef.value ||
      !enabled.value ||
      typeof IntersectionObserver === 'undefined'
    )
      return

    const currentObserver = new IntersectionObserver(
      ([entry]) => {
        // disconnect 之前已排队的通知仍可能到达，只有当前观察器可提交。
        if (observer !== currentObserver || !enabled.value || !entry) return
        /* 播放器离开视口 → 开启小窗 */
        if (!entry.isIntersecting && !isMiniMode.value) {
          placeholderHeight.value =
            containerRef.value?.getBoundingClientRect().height ?? 0
        }
        isMiniMode.value = !entry.isIntersecting
      },
      {
        threshold: 0.3 /* 30% 可见度阈值 */,
      }
    )

    observer = currentObserver
    currentObserver.observe(containerRef.value)
  }

  /** 销毁观察器 */
  function destroyObserver() {
    const currentObserver = observer
    observer = null
    currentObserver?.disconnect()
    isMiniMode.value = false
    placeholderHeight.value = 0
  }

  /** 滚动回原始位置 */
  function scrollToPlayer() {
    containerRef.value?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  /** 关闭小窗 */
  function closeMiniPlayer() {
    isMiniMode.value = false
    destroyObserver()
  }

  watch(enabled, value => {
    if (value) initObserver()
    else destroyObserver()
  })

  onBeforeUnmount(() => {
    destroyObserver()
  })

  return {
    isMiniMode,
    placeholderHeight,
    initObserver,
    destroyObserver,
    scrollToPlayer,
    closeMiniPlayer,
  }
}
