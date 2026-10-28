/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-28
 * @FilePath: \naive-ui-components\src\components\C_Form\layouts\Grid\useGridWidth.ts
 * @Description: 响应式网格容器尺寸与观测生命周期，保留 Naive UI 的数值布局协议
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import {
  ref,
  watch,
  onMounted,
  onActivated,
  onDeactivated,
  onScopeDispose,
  type Ref,
} from 'vue'

/** 只在网格可用时观测容器，向 Naive 传数值间距以保留原生 span/offset 计算。 */
export function useGridWidth(
  root: Ref<HTMLElement | null>,
  enabled: () => boolean
) {
  const width = ref(0)
  let observer: ResizeObserver | undefined
  let active = false
  let suspended = false
  let disposed = false
  const update = (value: number): void => {
    if (
      active &&
      !disposed &&
      Number.isFinite(value) &&
      value > 0 &&
      width.value !== value
    )
      width.value = value
  }
  const stop = (): void => {
    active = false
    observer?.disconnect()
    observer = undefined
  }
  const start = (): void => {
    const element = root.value
    if (active || suspended || disposed || !element || !enabled()) return
    active = true
    update(element.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const owner = new ResizeObserver(([entry]) => {
      if (observer === owner) update(entry?.contentRect.width ?? 0)
    })
    observer = owner
    owner.observe(element)
  }
  onMounted(start)
  onActivated(() => {
    suspended = false
    start()
  })
  onDeactivated(() => {
    suspended = true
    stop()
  })
  onScopeDispose(() => {
    disposed = true
    stop()
  })
  watch(enabled, value => (value ? start() : stop()))
  return width
}
