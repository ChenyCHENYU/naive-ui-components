import {
  ref,
  readonly,
  watch,
  nextTick,
  onMounted,
  onBeforeUnmount,
  type Ref,
} from 'vue'
import type { InfiniteScrollStatus } from '../types'
import { INFINITE_SCROLL_THRESHOLD } from '../constants'

/** 每次连续可见最多补五页，防止空响应或未更新 noMore 的接口形成请求循环。 */
const MAX_VISIBLE_REQUESTS = 5

/** 使用交叉状态与加载完成信号补满首屏，同时保持单次在途请求。 */
export function useInfiniteScroll(
  sentinelRef: Ref<HTMLElement | undefined>,
  enabled: Ref<boolean>,
  loading: Ref<boolean>,
  noMore: Ref<boolean>,
  onLoadMore: () => void
) {
  const status = ref<InfiniteScrollStatus>('idle')
  const paused = ref(false)
  let observer: IntersectionObserver | null = null
  let requested = false
  let visible = false
  let visibleRequests = 0
  let disposed = false
  let observerVersion = 0

  function requestMore() {
    if (
      disposed ||
      !visible ||
      !enabled.value ||
      loading.value ||
      noMore.value ||
      requested ||
      visibleRequests >= MAX_VISIBLE_REQUESTS
    )
      return
    requested = true
    visibleRequests += 1
    paused.value = visibleRequests >= MAX_VISIBLE_REQUESTS
    status.value = 'loading'
    onLoadMore()
  }

  function startObserving() {
    const el = sentinelRef.value
    if (!el || !enabled.value || typeof IntersectionObserver === 'undefined')
      return
    const version = ++observerVersion
    observer = new IntersectionObserver(
      entries => {
        if (disposed || version !== observerVersion) return
        visible = Boolean(entries[0]?.isIntersecting)
        if (!visible) {
          requested = false
          visibleRequests = 0
          paused.value = false
          return
        }
        requestMore()
      },
      { rootMargin: `${INFINITE_SCROLL_THRESHOLD}px 0px` }
    )
    observer.observe(el)
  }

  function stopObserving() {
    observerVersion += 1
    observer?.disconnect()
    observer = null
    requested = false
    visible = false
    visibleRequests = 0
    paused.value = false
  }

  watch([loading, noMore], ([isLoading, ended], [wasLoading]) => {
    status.value = ended ? 'no-more' : isLoading ? 'loading' : 'idle'
    if (!isLoading && !ended) {
      requested = false
      // 页面渲染提交后再复查；哨兵仍在视口时不依赖新的交叉阈值事件。
      if (wasLoading) void nextTick(requestMore)
    }
  })
  onMounted(startObserving)
  onBeforeUnmount(() => {
    disposed = true
    stopObserving()
  })
  watch([sentinelRef, enabled], () => {
    stopObserving()
    startObserving()
  })
  const resume = () => {
    if (loading.value || noMore.value || disposed) return
    visibleRequests = 0
    requested = false
    paused.value = false
    requestMore()
  }
  return { status: readonly(status), paused: readonly(paused), resume }
}
