import {
  shallowRef,
  watch,
  nextTick,
  onMounted,
  onActivated,
  onDeactivated,
  onScopeDispose,
  type Ref,
} from 'vue'

/** 观察一个可视容器；记录外宽和实际可用宽，滚动条变化不当成重新排版。 */
export function useTableWidth(
  root: Ref<HTMLElement | undefined>,
  revision: () => unknown
) {
  const viewport = shallowRef({ width: 0, outerWidth: 0 })
  let observer: ResizeObserver | undefined
  let suspended = false
  let disposed = false
  const stop = () => {
    observer?.disconnect()
    observer = undefined
  }
  const start = () => {
    stop()
    if (suspended || disposed) return
    const body = root.value?.querySelector<HTMLElement>(
      '.n-data-table-base-table-body'
    )
    const target =
      body?.querySelector<HTMLElement>('.n-scrollbar-container,.v-vl') ?? body
    if (!target) return
    const measure = () => {
      const width = target.clientWidth
      const outerWidth = target.getBoundingClientRect().width
      if (
        width > 0 &&
        outerWidth > 0 &&
        (viewport.value.width !== width ||
          viewport.value.outerWidth !== outerWidth)
      )
        viewport.value = { width, outerWidth }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const owner = new ResizeObserver(() => {
      if (observer === owner) measure()
    })
    observer = owner
    owner.observe(target)
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
  watch(
    revision,
    async () => {
      await nextTick()
      start()
    },
    { flush: 'post' }
  )
  return viewport
}
