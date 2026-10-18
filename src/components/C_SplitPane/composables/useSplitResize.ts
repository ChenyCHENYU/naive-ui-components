import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'
import {
  clampSplitSize,
  finiteSize,
  getSplitBounds,
  normalizeGutterSize,
} from '../constraints'
import type { CollapseTarget, SplitDirection } from '../types'
import { isPrimarySplitInput, startSplitPointer } from './splitPointer'

interface UseSplitResizeOptions {
  containerRef: Ref<HTMLElement | null>
  direction: Ref<SplitDirection>
  size?: MaybeRefOrGetter<number | undefined>
  defaultSize: MaybeRefOrGetter<number>
  minSize: MaybeRefOrGetter<number>
  maxSize: MaybeRefOrGetter<number>
  minFirstSize?: MaybeRefOrGetter<number>
  minSecondSize?: MaybeRefOrGetter<number>
  gutterSize?: MaybeRefOrGetter<number>
  disabled: Ref<boolean>
  collapsible: Ref<boolean>
  step: MaybeRefOrGetter<number>
  onUpdateSize?: (size: number) => void
  onResize?: (firstSize: number, secondSize: number) => void
  onCollapse?: (target: CollapseTarget) => void
  onExpand?: (target: CollapseTarget) => void
  onDragStart?: (size: number) => void
  onDragEnd?: (size: number) => void
}

function collapsedPanel(size: number): CollapseTarget | null {
  if (size === 0) return 'first'
  return size === 100 ? 'second' : null
}

function keySize(
  key: string,
  direction: SplitDirection,
  step: number,
  current: number,
  bounds: { min: number; max: number }
) {
  if (key === 'Home') return bounds.min
  if (key === 'End') return bounds.max
  const decrease = direction === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
  const increase = direction === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
  if (key === decrease) return current - step
  if (key === increase) return current + step
  return undefined
}

/** Manage percentage state, physical panel limits and accessible resizing without table coupling. */
export function useSplitResize(options: UseSplitResizeOptions) {
  const { containerRef, direction, disabled, collapsible } = options
  const containerLength = ref(0)
  const gutterSize = computed(() =>
    normalizeGutterSize(toValue(options.gutterSize))
  )
  const availableLength = computed(() =>
    Math.max(0, containerLength.value - gutterSize.value)
  )
  const bounds = computed(() =>
    getSplitBounds({
      minSize: toValue(options.minSize),
      maxSize: toValue(options.maxSize),
      minFirstSize: toValue(options.minFirstSize) ?? 0,
      minSecondSize: toValue(options.minSecondSize) ?? 0,
      availableLength: availableLength.value,
    })
  )
  const internalSize = ref(
    clampSplitSize(
      toValue(options.defaultSize),
      bounds.value.min,
      bounds.value.max
    )
  )
  const controlled = computed(() => toValue(options.size) !== undefined)
  const rawSize = computed(() =>
    controlled.value
      ? finiteSize(toValue(options.size), 50)
      : internalSize.value
  )
  const collapsedTarget = computed<CollapseTarget | null>(() => {
    if (!collapsible.value) return null
    return rawSize.value === 0
      ? 'first'
      : rawSize.value === 100
        ? 'second'
        : null
  })
  const panelSize = computed(() =>
    collapsedTarget.value
      ? collapsedTarget.value === 'first'
        ? 0
        : 100
      : clampSplitSize(rawSize.value, bounds.value.min, bounds.value.max)
  )
  const isDragging = ref(false)
  const isFirstCollapsed = computed(() => collapsedTarget.value === 'first')
  const isSecondCollapsed = computed(() => collapsedTarget.value === 'second')
  const defaultRestoreSize = finiteSize(toValue(options.defaultSize), 50)
  let sizeBeforeCollapse = collapsedTarget.value
    ? clampSplitSize(
        defaultRestoreSize > 0 && defaultRestoreSize < 100
          ? defaultRestoreSize
          : 50,
        bounds.value.min,
        bounds.value.max
      )
    : panelSize.value
  let stopGesture: (() => void) | undefined
  let observer: ResizeObserver | undefined

  const requestSize = (size: number, allowCollapse = false) => {
    if (!Number.isFinite(size)) return
    const next = allowCollapse
      ? size
      : clampSplitSize(size, bounds.value.min, bounds.value.max)
    if (next === rawSize.value) return
    if (!controlled.value) internalSize.value = next
    options.onUpdateSize?.(next)
  }

  watch(
    panelSize,
    (size, previous) => {
      const before = collapsedPanel(previous)
      const target = collapsedTarget.value
      if (!before && target) sizeBeforeCollapse = previous
      if (before && before !== target) options.onExpand?.(before)
      if (target && target !== before) options.onCollapse?.(target)
      options.onResize?.(size, 100 - size)
    },
    { flush: 'sync' }
  )

  watch(
    bounds,
    () => {
      if (!collapsedTarget.value) requestSize(panelSize.value)
    },
    { flush: 'sync' }
  )
  watch([disabled, direction], () => stopGesture?.(), { flush: 'sync' })
  watch(
    collapsible,
    () => {
      if (!collapsedTarget.value) requestSize(panelSize.value)
    },
    { flush: 'sync' }
  )

  const measure = () => {
    const element = containerRef.value
    if (!element) return
    const rect = element.getBoundingClientRect()
    containerLength.value =
      direction.value === 'horizontal' ? rect.width : rect.height
  }
  watch(direction, measure, { flush: 'post' })
  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
      observer = new ResizeObserver(measure)
      observer.observe(containerRef.value)
    }
  })

  const collapse = (target: CollapseTarget = 'first') => {
    if (!collapsible.value || collapsedTarget.value === target) return
    if (!collapsedTarget.value) sizeBeforeCollapse = panelSize.value
    requestSize(target === 'first' ? 0 : 100, true)
  }
  const expand = () => {
    if (collapsedTarget.value) requestSize(sizeBeforeCollapse)
  }
  const toggle = (target: CollapseTarget = 'first') => {
    if (collapsedTarget.value === target) expand()
    else collapse(target)
  }
  const resetSize = () =>
    requestSize(finiteSize(toValue(options.defaultSize), 50))
  const setSize = (size: number) => requestSize(size)

  const handleMouseDown = (event: MouseEvent | TouchEvent | PointerEvent) => {
    if (disabled.value || isDragging.value) return
    if (!isPrimarySplitInput(event)) return
    const element = containerRef.value
    if (!element) return
    measure()
    if (!availableLength.value) return
    const startSize = panelSize.value
    stopGesture = startSplitPointer(event, {
      element,
      direction: direction.value,
      onDelta: delta =>
        requestSize(startSize + (delta / availableLength.value) * 100),
      onEnd: () => {
        isDragging.value = false
        stopGesture = undefined
        options.onDragEnd?.(panelSize.value)
      },
    })
    if (!stopGesture) return
    isDragging.value = true
    options.onDragStart?.(panelSize.value)
  }

  const handleDoubleClick = () => {
    if (!disabled.value) toggle('first')
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    // A button inside the separator owns its Enter/Space keys.
    if (disabled.value || event.target !== event.currentTarget) return
    if (event.key === 'Enter') {
      if (collapsible.value) {
        event.preventDefault()
        if (collapsedTarget.value) expand()
        else collapse('first')
      }
      return
    }
    const step = Math.max(0, finiteSize(toValue(options.step), 2)) || 2
    const scale = event.shiftKey ? 10 : 1
    const next = keySize(
      event.key,
      direction.value,
      step * scale,
      panelSize.value,
      bounds.value
    )
    if (next === undefined) return
    event.preventDefault()
    requestSize(next)
  }
  const getPanelInfo = () => ({
    first: { size: panelSize.value, collapsed: isFirstCollapsed.value },
    second: { size: 100 - panelSize.value, collapsed: isSecondCollapsed.value },
  })
  onUnmounted(() => {
    stopGesture?.()
    observer?.disconnect()
  })

  return {
    panelSize,
    isDragging,
    collapsedTarget,
    isFirstCollapsed,
    isSecondCollapsed,
    bounds,
    gutterSize,
    handleMouseDown,
    handleDoubleClick,
    handleKeyDown,
    collapse,
    expand,
    toggle,
    resetSize,
    setSize,
    getPanelInfo,
  }
}
