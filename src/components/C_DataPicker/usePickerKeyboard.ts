import {
  nextTick,
  onScopeDispose,
  shallowRef,
  watch,
  type ComponentPublicInstance,
} from 'vue'
import type { DataPickerValue } from './types'

/** 候选焦点归当前面板拥有；行节点来自公开 rowProps，虚拟滚动使用公开 scrollTo。 */
export function usePickerKeyboard<T extends object>(options: {
  rows: () => readonly T[]
  loading: () => boolean
  enabled: () => boolean
  key: (row: T) => DataPickerValue
  selectable: (row: T) => boolean
  selected: (row: T) => boolean
  choose: (row: T) => void
  reveal: (row: T) => void
  immediate: () => boolean
}) {
  const active = shallowRef<DataPickerValue>()
  const nodes = new Map<DataPickerValue, HTMLElement>()
  let disposed = false
  let pending: DataPickerValue | undefined
  let pendingDirection: 1 | -1 | undefined
  const focus = (key: DataPickerValue, node: HTMLElement) => {
    if (disposed || pending !== key || !node.isConnected || !options.enabled())
      return
    pending = undefined
    node.focus({ preventScroll: true })
    node.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
  }
  function navigate(direction: 1 | -1): boolean {
    if (disposed || !options.enabled()) return false
    const candidates = options.rows().filter(options.selectable)
    if (!candidates.length) {
      pendingDirection = options.loading() ? direction : undefined
      return pendingDirection !== undefined
    }
    pendingDirection = undefined
    const current = candidates.findIndex(
      row => options.key(row) === active.value
    )
    const index =
      current < 0
        ? direction > 0
          ? 0
          : candidates.length - 1
        : Math.max(0, Math.min(candidates.length - 1, current + direction))
    const row = candidates[index]
    const key = options.key(row)
    active.value = key
    pending = key
    // 已挂载行只做 nearest 可见性调整；跨虚拟窗口才按身份请求挂载。
    if (!nodes.get(key)?.isConnected) options.reveal(row)
    void nextTick(() => {
      const node = nodes.get(key)
      if (node) focus(key, node)
    })
    return true
  }
  watch(
    [options.rows, options.enabled],
    () => {
      active.value = undefined
      pending = undefined
      nodes.clear()
      if (!options.enabled()) pendingDirection = undefined
      if (pendingDirection && options.rows().length) {
        const direction = pendingDirection
        void nextTick(() => navigate(direction))
      }
    },
    { flush: 'pre' }
  )
  onScopeDispose(() => {
    disposed = true
    pending = undefined
    nodes.clear()
  })
  function rowProps(row: T) {
    if (!options.enabled()) return {}
    const key = options.key(row)
    return {
      tabindex: -1,
      'data-picker-active': active.value === key ? '' : undefined,
      'aria-selected': options.selected(row),
      'aria-disabled': !options.selectable(row),
      ref: (instance: Element | ComponentPublicInstance | null) => {
        if (!(instance instanceof HTMLElement)) {
          nodes.delete(key)
          return
        }
        nodes.set(key, instance)
        if (pending === key) void nextTick(() => focus(key, instance))
      },
      onFocus: (event: FocusEvent) => {
        if (event.target === event.currentTarget) active.value = key
      },
      onClick: (event: MouseEvent) => {
        if (
          !options.immediate() ||
          event.defaultPrevented ||
          !(event.target instanceof Element)
        )
          return
        // 单元格里的链接、按钮、单选框拥有自己的事件，不能触发第二次提交。
        if (
          event.target.closest(
            'a,button,input,select,textarea,label,[role="button"],[role="radio"],[role="checkbox"],[contenteditable="true"]'
          )
        )
          return
        options.choose(row)
      },
      onKeydown: (event: KeyboardEvent) => {
        if (
          event.target !== event.currentTarget ||
          event.isComposing ||
          event.defaultPrevented
        )
          return
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault()
          event.stopPropagation()
          navigate(event.key === 'ArrowDown' ? 1 : -1)
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          event.stopPropagation()
          options.choose(row)
        }
      },
    }
  }
  return { rowProps, navigate }
}
