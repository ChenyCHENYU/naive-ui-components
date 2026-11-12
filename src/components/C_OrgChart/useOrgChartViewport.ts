import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type Ref,
} from 'vue'
import type { OrgChartKey, OrgChartProps } from './types'
import type { OrgChartEntry } from './tree'
import {
  clampOrgZoom,
  createOrgConnectorPath,
  type OrgChartRect,
} from './geometry'

interface Connector {
  key: OrgChartKey
  path: string
}

/** 测量与视窗共用缩放坐标系，显式导航会取消未完成的自动适配。 */
export function useOrgChartViewport<T extends object>(
  props: OrgChartProps<T>,
  index: Ref<{ nodes: Map<OrgChartKey, OrgChartEntry<T>> }>,
  expandedKeys: Ref<ReadonlySet<OrgChartKey>>
) {
  const containerRef = shallowRef<HTMLElement | null>(null)
  const contentRef = shallowRef<HTMLElement | null>(null)
  const elements = new Map<OrgChartKey, HTMLElement>()
  const zoom = ref(1)
  const panX = ref(0)
  const panY = ref(0)
  const connectors = shallowRef<Connector[]>([])
  const clampZoom = (value: number) =>
    clampOrgZoom(value, props.minZoom ?? 0.3, props.maxZoom ?? 2)
  zoom.value = clampZoom(props.initialZoom ?? 1)
  let observer: ResizeObserver | undefined
  let disposed = false
  let frame: number | undefined
  let scheduled = false
  let viewOperation = 0
  let autoFitPaused = false
  let drag: { x: number; y: number } | undefined
  const interruptView = () => {
    autoFitPaused = true
    return ++viewOperation
  }
  const isCurrentView = (operation: number) =>
    !disposed && operation === viewOperation

  const viewportStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    transformOrigin: 'center top',
  }))
  const measure = () => {
    const content = contentRef.value
    if (!content) return
    const origin = content.getBoundingClientRect()
    const rects = new Map<OrgChartKey, OrgChartRect>()
    for (const [key, element] of elements) {
      const rect = element.getBoundingClientRect()
      rects.set(key, {
        x: (rect.left - origin.left) / zoom.value,
        y: (rect.top - origin.top) / zoom.value,
        width: rect.width / zoom.value,
        height: rect.height / zoom.value,
      })
    }
    const next: Connector[] = []
    for (const [key, entry] of index.value.nodes) {
      const parent = entry.parent && rects.get(entry.parent.key)
      const child = rects.get(key)
      if (!parent || !child) continue
      const path = createOrgConnectorPath(
        parent,
        child,
        props.direction ?? 'vertical',
        props.lineStyle ?? 'rounded'
      )
      if (path) next.push({ key, path })
    }
    connectors.value = next
  }
  // 卡片/布局变化在同一帧只测量一次；卸载后不再读取 DOM。
  const scheduleMeasure = () => {
    if (disposed || scheduled) return
    scheduled = true
    void nextTick().then(() => {
      if (disposed) return
      frame = requestAnimationFrame(() => {
        frame = undefined
        scheduled = false
        if (!disposed) measure()
      })
    })
  }
  const register = (key: OrgChartKey, element: HTMLElement | null) => {
    const old = elements.get(key)
    if (old) observer?.unobserve(old)
    if (element) {
      elements.set(key, element)
      observer?.observe(element)
    } else elements.delete(key)
    scheduleMeasure()
  }
  const zoomIn = () => {
    interruptView()
    zoom.value = clampZoom(zoom.value + 0.1)
  }
  const zoomOut = () => {
    interruptView()
    zoom.value = clampZoom(zoom.value - 0.1)
  }
  const resetView = () => {
    interruptView()
    zoom.value = clampZoom(props.initialZoom ?? 1)
    panX.value = 0
    panY.value = 0
  }
  const performFit = async () => {
    const operation = ++viewOperation
    const snapshot = index.value
    await nextTick()
    const container = containerRef.value
    const content = contentRef.value
    if (
      !isCurrentView(operation) ||
      snapshot !== index.value ||
      !container ||
      !content ||
      container.clientWidth <= 0 ||
      container.clientHeight <= 0
    )
      return
    const rect = content.getBoundingClientRect()
    const width = Math.max(content.scrollWidth, rect.width / zoom.value, 1)
    const height = Math.max(content.scrollHeight, rect.height / zoom.value, 1)
    zoom.value = clampZoom(
      Math.min(
        1,
        Math.max(1, container.clientWidth - 48) / width,
        Math.max(1, container.clientHeight - 64) / height
      )
    )
    panX.value = 0
    panY.value = 0
    await nextTick()
    if (!isCurrentView(operation) || snapshot !== index.value) return
    const outer = container.getBoundingClientRect()
    const inner = content.getBoundingClientRect()
    panX.value = outer.left + outer.width / 2 - inner.left - inner.width / 2
    panY.value = outer.top + 24 - inner.top
    scheduleMeasure()
  }
  const fitView = () => {
    autoFitPaused = false
    return performFit()
  }
  const autoFit = () => {
    if (props.fitOnInit && !autoFitPaused) void performFit()
  }
  const centerNode = async (key: OrgChartKey, operation: number) => {
    const snapshot = index.value
    await nextTick()
    const container = containerRef.value
    const element = elements.get(key)
    if (
      !isCurrentView(operation) ||
      snapshot !== index.value ||
      !container ||
      !element
    )
      return false
    const outer = container.getBoundingClientRect()
    const inner = element.getBoundingClientRect()
    if (!outer.width || !outer.height || !inner.width || !inner.height)
      return false
    panX.value += outer.left + outer.width / 2 - inner.left - inner.width / 2
    panY.value += outer.top + outer.height / 2 - inner.top - inner.height / 2
    await nextTick()
    return isCurrentView(operation) && snapshot === index.value
  }
  const handleWheel = (event: WheelEvent) => {
    if (!props.zoomable) return
    event.preventDefault()
    interruptView()
    zoom.value = clampZoom(zoom.value + (event.deltaY > 0 ? -0.1 : 0.1))
  }
  const handlePanStart = (event: MouseEvent) => {
    if (!props.pannable || event.button !== 0) return
    if (
      event.target instanceof Element &&
      event.target.closest('.c-orgchart__node, .c-orgchart__controls')
    )
      return
    interruptView()
    drag = { x: event.clientX - panX.value, y: event.clientY - panY.value }
  }
  const handlePanMove = (event: MouseEvent) => {
    if (!drag) return
    panX.value = event.clientX - drag.x
    panY.value = event.clientY - drag.y
  }
  const handlePanEnd = () => {
    drag = undefined
  }
  watch(
    [
      index,
      expandedKeys,
      () => props.direction,
      () => props.lineStyle,
      () => props.nodeSpacing,
      () => props.levelSpacing,
      zoom,
    ],
    scheduleMeasure,
    { flush: 'post' }
  )
  watch([index, expandedKeys], autoFit, { flush: 'post' })
  watch(
    [() => props.data, () => props.direction],
    () => {
      autoFitPaused = false
      autoFit()
    },
    { flush: 'post' }
  )
  watch([() => props.minZoom, () => props.maxZoom], () => {
    zoom.value = clampZoom(zoom.value)
  })
  onMounted(() => {
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(entries => {
        scheduleMeasure()
        if (
          entries.some(
            entry =>
              entry.target === containerRef.value ||
              entry.target === contentRef.value
          )
        )
          autoFit()
      })
      for (const element of elements.values()) observer.observe(element)
      if (containerRef.value) observer.observe(containerRef.value)
      if (contentRef.value) observer.observe(contentRef.value)
    }
    scheduleMeasure()
    autoFit()
  })
  onBeforeUnmount(() => {
    disposed = true
    viewOperation++
    if (frame !== undefined) cancelAnimationFrame(frame)
    observer?.disconnect()
    elements.clear()
  })
  return {
    containerRef,
    contentRef,
    zoom,
    connectors,
    viewportStyle,
    register,
    zoomIn,
    zoomOut,
    resetView,
    fitView,
    centerNode,
    interruptView,
    isCurrentView,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
  }
}
