import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  shallowRef,
  watch,
  type Ref,
} from 'vue'
import type { WaterFallLayoutItem } from '../types'
import { findWaterFallWindow, indexWaterFallLayout } from './waterfallWindow'

const WINDOW_THRESHOLD = 100

function clippingAncestors(element: HTMLElement) {
  const ancestors: HTMLElement[] = []
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    const style = getComputedStyle(parent)
    if (
      /(auto|scroll|overlay|hidden|clip)/.test(
        style.overflowY || style.overflow
      )
    )
      ancestors.push(parent)
  }
  return ancestors
}

/** Follow the real clipping viewport without scanning the full layout on scroll. */
export function useWaterFallWindow(
  container: Ref<HTMLElement | undefined>,
  layouts: Readonly<Ref<readonly WaterFallLayoutItem[]>>,
  enabled: Readonly<Ref<boolean>>
) {
  const index = computed(() => indexWaterFallLayout(layouts.value))
  const focusedId = shallowRef<string | number>()
  const viewport = shallowRef({ top: 0, bottom: 600 })
  const virtual = computed(
    () => enabled.value && layouts.value.length >= WINDOW_THRESHOLD
  )
  let ancestors: HTMLElement[] = []
  let observer: ResizeObserver | undefined
  let frame: number | undefined
  let active = false

  const visibleItems = computed(() => {
    if (!virtual.value) return index.value.entries
    const { top, bottom } = viewport.value
    const overscan = Math.max(300, (bottom - top) * 0.75)
    const visible = findWaterFallWindow(
      index.value.columns,
      top - overscan,
      bottom + overscan
    )
    const focused =
      focusedId.value === undefined
        ? undefined
        : index.value.byId.get(focusedId.value)
    if (focused && !visible.includes(focused)) {
      visible.push(focused)
      visible.sort((left, right) => left.index - right.index)
    }
    return visible
  })

  function measureViewport() {
    if (!active || !container.value) return
    const origin = container.value.getBoundingClientRect().top
    let top = 0
    let bottom = window.innerHeight
    for (const ancestor of ancestors) {
      const rect = ancestor.getBoundingClientRect()
      const innerTop = rect.top + ancestor.clientTop
      top = Math.max(top, innerTop)
      bottom = Math.min(bottom, innerTop + ancestor.clientHeight)
    }
    const nextTop = top - origin
    const nextBottom = Math.max(top, bottom) - origin
    if (viewport.value.top !== nextTop || viewport.value.bottom !== nextBottom)
      viewport.value = { top: nextTop, bottom: nextBottom }
  }

  function scheduleMeasure() {
    if (!active || frame !== undefined) return
    frame = requestAnimationFrame(() => {
      frame = undefined
      measureViewport()
    })
  }

  function stop() {
    active = false
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    observer?.disconnect()
    observer = undefined
    window.removeEventListener('scroll', scheduleMeasure)
    window.removeEventListener('resize', scheduleMeasure)
    for (const ancestor of ancestors)
      ancestor.removeEventListener('scroll', scheduleMeasure)
    ancestors = []
  }

  function start() {
    stop()
    if (!container.value) return
    active = true
    ancestors = clippingAncestors(container.value)
    window.addEventListener('scroll', scheduleMeasure, { passive: true })
    window.addEventListener('resize', scheduleMeasure, { passive: true })
    for (const ancestor of ancestors)
      ancestor.addEventListener('scroll', scheduleMeasure, { passive: true })
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleMeasure)
      observer.observe(container.value)
      ancestors.forEach(ancestor => observer?.observe(ancestor))
    }
    measureViewport()
  }

  function scrollToTop() {
    const element = container.value
    if (!active || !element) return
    const ancestor = ancestors.find(
      parent =>
        parent.scrollHeight > parent.clientHeight &&
        /(auto|scroll|overlay)/.test(
          getComputedStyle(parent).overflowY ||
            getComputedStyle(parent).overflow
        )
    )
    const { top } = element.getBoundingClientRect()
    if (ancestor)
      ancestor.scrollTo({
        top:
          ancestor.scrollTop +
          top -
          ancestor.getBoundingClientRect().top -
          ancestor.clientTop,
        behavior: 'smooth',
      })
    else window.scrollTo({ top: window.scrollY + top, behavior: 'smooth' })
  }

  function pinItem(id: string | number) {
    if (focusedId.value !== id) focusedId.value = id
  }
  function releaseItem(event: FocusEvent) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !container.value?.contains(event.relatedTarget)
    )
      focusedId.value = undefined
  }

  watch(
    container,
    () => {
      if (active) start()
    },
    { flush: 'post' }
  )
  watch(index, () => {
    if (focusedId.value !== undefined && !index.value.byId.has(focusedId.value))
      focusedId.value = undefined
    void nextTick(scheduleMeasure)
  })
  onMounted(start)
  onActivated(start)
  onDeactivated(stop)
  onBeforeUnmount(stop)

  return { visibleItems, index, virtual, pinItem, releaseItem, scrollToTop }
}
