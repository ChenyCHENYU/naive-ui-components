/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 延迟页面加载控制器，旧导航完成不会关闭新导航的反馈
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */
import { ref, readonly } from 'vue'
import type { PageLoadingOptions } from './types'

/** 创建独立状态；不依赖路由、Store、DOM 或项目配置。 */
export function createPageLoading(options: PageLoadingOptions = {}) {
  const visible = ref(false)
  const configuredDelay = options.delay ?? 160
  const delay = Number.isFinite(configuredDelay)
    ? Math.max(0, configuredDelay)
    : 160
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  /** 清理尚未执行的显示任务。 */
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  /** 开始新任务并返回编号；连续跳转保留已经显示的加载态。 */
  const start = (): number => {
    clearTimer()
    const id = ++generation
    if (!visible.value) {
      timer = setTimeout(() => {
        timer = undefined
        if (id === generation) visible.value = true
      }, delay)
    }
    return id
  }

  /** 完成当前任务；过期任务不会影响最新任务。 */
  const finish = (id: number): void => {
    if (id !== generation) return
    clearTimer()
    visible.value = false
  }

  /** 销毁或重置时释放任务，迟到回调也无法重新显示。 */
  const reset = (): void => {
    generation++
    clearTimer()
    visible.value = false
  }

  return { visible: readonly(visible), start, finish, reset }
}
