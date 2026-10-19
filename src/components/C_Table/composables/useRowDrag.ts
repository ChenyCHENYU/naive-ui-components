/*
 * @Description: 行拖拽排序 — 表格行体 sortablejs 集成
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import {
  ref,
  onBeforeUnmount,
  toValue,
  type MaybeRefOrGetter,
  type Ref,
  type ComputedRef,
} from 'vue'
import type { DataTableRowKey } from 'naive-ui'
import type Sortable from 'sortablejs'
import type { SortableEvent } from 'sortablejs'
import type { DataRecord } from '../types'
import { getTableRowDragKey } from '../helpers'

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

export interface UseRowDragOptions<T extends object = DataRecord> {
  /** 数据源（只读即可） */
  data: Ref<T[]> | ComputedRef<T[]>
  /** 获取行键 */
  rowKey: (row: T) => DataTableRowKey
  /** 配置 */
  config: MaybeRefOrGetter<RowDragConfig | undefined>
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

/** 行拖拽排序组合式函数 */
export function useRowDrag<T extends object = DataRecord>(
  options: UseRowDragOptions<T>
): UseRowDragReturn {
  const { data, onReorder, onSort } = options
  const isDragging = ref(false)
  let sortableInstance: Sortable | null = null
  let initVersion = 0
  let disposed = false
  let bodyObserver: MutationObserver | undefined
  let boundBody: HTMLElement | null = null
  let dragSnapshot: T[] | undefined
  let dragSnapshotKeys: (string | undefined)[] | undefined
  let originalNextSibling: ChildNode | null = null
  let draggedElement: HTMLElement | undefined

  const getRowKeys = (rows: readonly T[]) =>
    rows.map(row => getTableRowDragKey(row, options.rowKey))

  const restoreDraggedElement = () => {
    if (draggedElement?.parentNode !== boundBody || !boundBody) return
    if (originalNextSibling && originalNextSibling.parentNode !== boundBody)
      return
    boundBody.insertBefore(draggedElement, originalNextSibling)
  }

  const destroyInstance = () => {
    sortableInstance?.destroy()
    sortableInstance = null
    boundBody = null
    dragSnapshot = undefined
    dragSnapshotKeys = undefined
    draggedElement = undefined
    originalNextSibling = null
    isDragging.value = false
  }

  const canReorder = (
    rows: readonly T[],
    keys: (string | undefined)[],
    domKeys: string[]
  ) => {
    if (!dragSnapshot || dragSnapshot.length !== rows.length) return false
    if (dragSnapshot.some((row, index) => row !== rows[index])) return false
    if (
      keys.some(
        (key, index) => key === undefined || key !== dragSnapshotKeys?.[index]
      )
    )
      return false
    if (domKeys.length !== keys.length || new Set(domKeys).size !== keys.length)
      return false
    const keySet = new Set(keys)
    return domKeys.every(value => keySet.has(value))
  }

  const handleDragEnd = (evt: SortableEvent) => {
    isDragging.value = false
    const { item } = evt
    const key = item.getAttribute('data-c-table-row-key')
    const rows = [...data.value]
    const keys = getRowKeys(rows)
    const domKeys = boundBody
      ? [...boundBody.children]
          .map(row => row.getAttribute('data-c-table-row-key'))
          .filter((value): value is string => value !== null)
      : []
    const valid = item === draggedElement && canReorder(rows, keys, domKeys)
    // Sortable 先改 DOM，Vue 仍持有原来的节点顺序，必须先还原再提交状态。
    restoreDraggedElement()
    dragSnapshot = undefined
    dragSnapshotKeys = undefined
    draggedElement = undefined
    originalNextSibling = null
    if (!valid || !key) return
    const from = keys.indexOf(key)
    const to = domKeys.indexOf(key)
    if (from < 0 || to < 0 || from === to) return
    const [moved] = rows.splice(from, 1)
    rows.splice(to, 0, moved)
    onReorder?.(rows)
    onSort?.(moved, from, to)
  }

  const initRowDrag = async (wrapperEl: HTMLElement) => {
    const version = ++initVersion
    bodyObserver?.disconnect()
    bodyObserver = undefined
    destroyInstance()
    const config = toValue(options.config)
    if (!config || config.enabled === false || !wrapperEl || disposed) return

    try {
      const { default: Sortable } = await import('sortablejs')
      if (disposed || version !== initVersion) return
      const connectBody = () => {
        if (disposed || version !== initVersion) return
        const tbody = wrapperEl.querySelector<HTMLElement>(
          '.n-data-table-tbody'
        )
        if (tbody === boundBody) return
        destroyInstance()
        if (!tbody) return
        boundBody = tbody
        sortableInstance = new Sortable(tbody, {
          animation: config.animationDuration ?? 150,
          handle: config.handleSelector,
          // 仅顶层数据行有身份标记，树子行、详情展开和合计行不参与排序。
          draggable: '> tr[data-c-table-row-key]',
          ghostClass: config.ghostClass ?? 'row-drag-ghost',
          chosenClass: config.chosenClass ?? 'row-drag-chosen',
          onMove: evt => evt.related.hasAttribute('data-c-table-row-key'),
          onStart: evt => {
            dragSnapshot = [...data.value]
            dragSnapshotKeys = getRowKeys(dragSnapshot)
            draggedElement = evt.item
            originalNextSibling = evt.item.nextSibling
            isDragging.value = true
          },
          onEnd: handleDragEnd,
        })
      }
      // 空表首次载入、错误视图恢复或原生表体延迟挂载时自动重新连接。
      bodyObserver = new MutationObserver(connectBody)
      bodyObserver.observe(wrapperEl, { childList: true, subtree: true })
      connectBody()
    } catch {
      // sortablejs 未安装时静默降级
    }
  }

  const destroyRowDrag = () => {
    initVersion += 1
    bodyObserver?.disconnect()
    bodyObserver = undefined
    destroyInstance()
  }

  onBeforeUnmount(() => {
    disposed = true
    destroyRowDrag()
  })

  return { initRowDrag, destroyRowDrag, isDragging }
}
