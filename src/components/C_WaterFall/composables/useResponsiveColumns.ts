import {
  ref,
  readonly,
  watch,
  onMounted,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  type Ref,
} from 'vue'
import type { WaterFallBreakpoint } from '../types'
import { DEFAULT_BREAKPOINTS } from '../constants'

/**
 *
 */
export function useResponsiveColumns(
  containerRef: Ref<HTMLElement | undefined>,
  fixedColumns?: Ref<number | undefined>,
  breakpoints?: Ref<WaterFallBreakpoint[] | undefined>
) {
  const columns = ref(4)
  const containerWidth = ref(0)

  function resolveColumns(width: number): number {
    if (fixedColumns?.value && fixedColumns.value > 0) return fixedColumns.value
    const bps = breakpoints?.value?.length
      ? breakpoints.value
      : DEFAULT_BREAKPOINTS
    const sorted = [...bps].sort((a, b) => b.minWidth - a.minWidth)
    for (const bp of sorted) {
      if (width >= bp.minWidth) return bp.columns
    }
    return 1
  }

  let resizeObserver: ResizeObserver | null = null
  let active = false

  function measure() {
    const el = containerRef.value
    if (!active || !el) return
    const { width } = el.getBoundingClientRect()
    containerWidth.value = width
    columns.value = resolveColumns(width)
  }

  function startObserving() {
    stopObserving()
    const el = containerRef.value
    if (!el) return
    active = true
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure)
      resizeObserver.observe(el)
    }
    window.addEventListener('resize', measure, { passive: true })
    measure()
  }

  function stopObserving() {
    resizeObserver?.disconnect()
    resizeObserver = null
    window.removeEventListener('resize', measure)
    active = false
  }

  onMounted(startObserving)
  onActivated(startObserving)
  onDeactivated(stopObserving)
  onBeforeUnmount(stopObserving)

  watch(containerRef, () => {
    if (active) startObserving()
  })

  watch([() => fixedColumns?.value, () => breakpoints?.value], () => {
    if (containerWidth.value > 0) {
      columns.value = resolveColumns(containerWidth.value)
    }
  })

  return {
    columns: readonly(columns),
    containerWidth: readonly(containerWidth),
  }
}
