/*
 * @Description: 行拖拽排序 — 表格行体 sortablejs 集成
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref, onBeforeUnmount, type Ref, type ComputedRef } from 'vue'
import type { DataTableRowKey } from 'naive-ui/es'
import type { DataRecord } from '../types'

/* ================= 类型定义 ================= */

export interface RowDragConfig {
  enabled?: boolean
  /** 拖拽手柄 CSS 选择器（不传则整行可拖） */
  handleSelector?: string
  /** 动画时长（ms） */
  animationDuration?: number
  /** 拖拽时 ghost 样式类 */
  ghostClass?: string
  /** 拖拽中样式类 */
  chosenClass?: string
}

export interface UseRowDragOptions<T extends DataRecord = DataRecord> {
  /** 数据源（只读即可） */
  data: Ref<T[]> | ComputedRef<T[]>
  /** 获取行键 */
  rowKey: (row: T) => DataTableRowKey
  /** 配置 */
  config: RowDragConfig
  /** 数据重排回调（由外部处理数据更新） */
  onReorder?: (newData: T[]) => void
  /** 排序变更回调 */
  onSort?: (row: T, fromIndex: number, toIndex: number) => void
}

export interface UseRowDragReturn {
  /** 初始化拖拽（需在 onMounted 中调用） */
  initRowDrag: (wrapperEl: HTMLElement) => void
  /** 销毁拖拽实例 */
  destroyRowDrag: () => void
  /** 是否正在拖拽 */
  isDragging: Ref<boolean>
}

/* ================= 实现 ================= */

export function useRowDrag<T extends DataRecord = DataRecord>(
  options: UseRowDragOptions<T>
): UseRowDragReturn {
  const { data, config, onReorder, onSort } = options
  const isDragging = ref(false)
  let sortableInstance: any = null

  const initRowDrag = async (wrapperEl: HTMLElement) => {
    if (!config.enabled || !wrapperEl) return

    try {
      const { default: Sortable } = await import('sortablejs')
      const tbody = wrapperEl.querySelector('.n-data-table-tbody')
      if (!tbody) return

      sortableInstance = new Sortable(tbody as HTMLElement, {
        animation: config.animationDuration ?? 150,
        handle: config.handleSelector,
        ghostClass: config.ghostClass ?? 'row-drag-ghost',
        chosenClass: config.chosenClass ?? 'row-drag-chosen',
        onStart: () => {
          isDragging.value = true
        },
        onEnd: (evt: any) => {
          isDragging.value = false
          if (evt.oldIndex == null || evt.newIndex == null) return
          if (evt.oldIndex === evt.newIndex) return

          const newData = [...data.value]
          const [moved] = newData.splice(evt.oldIndex, 1)
          newData.splice(evt.newIndex, 0, moved)
          onReorder?.(newData)
          onSort?.(moved, evt.oldIndex, evt.newIndex)
        },
      })
    } catch {
      // sortablejs 未安装时静默降级
    }
  }

  const destroyRowDrag = () => {
    if (sortableInstance) {
      sortableInstance.destroy()
      sortableInstance = null
    }
  }

  onBeforeUnmount(destroyRowDrag)

  return { initRowDrag, destroyRowDrag, isDragging }
}
