import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'
import type { VirtualListInst } from 'vueuc'
import type { ChatMessage } from '../types'

interface ChatScrollOptions {
  messages: Readonly<Ref<ChatMessage[]>>
  contactId: Readonly<Ref<string>>
  virtual: Readonly<Ref<boolean>>
  loadingHistory: Readonly<Ref<boolean>>
  normalRef: Ref<HTMLElement | null>
  virtualRef: Ref<VirtualListInst | null>
  onLoadMore: () => void
}
interface MessageAnchor {
  id: string
  offset: number
}

/** 仅用公开滚动接口定位；变高行由 VVirtualList 实测，前插以消息身份保留阅读位置。 */
export function useChatScroll(options: ChatScrollOptions) {
  let disposed = false
  let version = 0
  let frame: number | undefined
  let intentFrame: number | undefined
  let observer: ResizeObserver | undefined
  let followsBottom = true
  let bottomIntent = false
  let scrollIntentPending = false
  let previousHeight = 0
  let previousViewportHeight = 0
  let anchor: MessageAnchor | undefined
  const element = () =>
    options.virtualRef.value?.listElRef ?? options.normalRef.value
  const nearBottom = (list: HTMLElement) =>
    list.scrollHeight - list.scrollTop - list.clientHeight <= 64
  const rows = (list: HTMLElement) =>
    Array.from(list.querySelectorAll<HTMLElement>('[data-message-id]'))

  function cancelFrame() {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
  }
  function scheduleFrame(task: number, callback: () => void) {
    cancelFrame()
    if (typeof requestAnimationFrame === 'undefined') {
      callback()
      return
    }
    frame = requestAnimationFrame(() => {
      frame = undefined
      if (!disposed && task === version) callback()
    })
  }
  function afterUpdate(callback: (task: number) => void) {
    const task = ++version
    cancelFrame()
    void nextTick(() => {
      if (!disposed && task === version) callback(task)
    })
  }
  function setTop(top: number) {
    const virtual = options.virtualRef.value
    if (virtual) virtual.scrollTo({ top, debounce: false })
    else if (options.normalRef.value) options.normalRef.value.scrollTop = top
  }
  function bottomNow() {
    const virtual = options.virtualRef.value
    if (virtual) virtual.scrollTo({ position: 'bottom' })
    else if (options.normalRef.value)
      options.normalRef.value.scrollTop = options.normalRef.value.scrollHeight
  }
  function scrollToBottom() {
    followsBottom = true
    scrollIntentPending = false
    bottomIntent = true
    anchor = undefined
    afterUpdate(task => {
      bottomNow()
      // 首批可见行的实测高度会改变总高，再跟随一帧；后续图片变化由内容观察继续跟随。
      scheduleFrame(task, () => {
        bottomNow()
        bottomIntent = false
      })
    })
  }
  function captureAnchor(list: HTMLElement): MessageAnchor | undefined {
    const { top } = list.getBoundingClientRect()
    const row = rows(list).find(
      item => item.getBoundingClientRect().bottom > top
    )
    return row?.dataset.messageId
      ? {
          id: row.dataset.messageId,
          offset: row.getBoundingClientRect().top - top,
        }
      : undefined
  }
  function adjustAnchor(task: number, attempts: number) {
    const list = element()
    if (!list || !anchor) return
    const row = rows(list).find(item => item.dataset.messageId === anchor?.id)
    if (row) {
      const offset =
        row.getBoundingClientRect().top - list.getBoundingClientRect().top
      setTop(Math.max(0, list.scrollTop + offset - anchor.offset))
    }
    if (attempts > 0)
      scheduleFrame(task, () => adjustAnchor(task, attempts - 1))
    else anchor = undefined
  }
  function restoreAnchor(saved: MessageAnchor) {
    anchor = saved
    followsBottom = false
    bottomIntent = false
    afterUpdate(task => {
      options.virtualRef.value?.scrollTo({ key: saved.id, debounce: false })
      adjustAnchor(task, 3)
    })
  }
  function preserveHeight(top: number, height: number) {
    followsBottom = false
    bottomIntent = false
    anchor = undefined
    afterUpdate(() => {
      const updated = element()
      if (updated) setTop(Math.max(0, top + updated.scrollHeight - height))
    })
  }
  /** 用户意图优先，不能由 ResizeObserver 把正在阅读历史的人拉回末尾。 */
  function stopFollowing() {
    followsBottom = false
    bottomIntent = false
    version++
    cancelFrame()
  }
  function handleScrollIntent() {
    scrollIntentPending = true
    anchor = undefined
    stopFollowing()
    if (intentFrame !== undefined) cancelAnimationFrame(intentFrame)
    intentFrame = requestAnimationFrame(() => {
      intentFrame = undefined
      if (disposed || !scrollIntentPending) return
      scrollIntentPending = false
      const list = element()
      if (list && !anchor) followsBottom = nearBottom(list)
    })
  }
  function geometryChanged(list: HTMLElement) {
    return (
      previousHeight > 0 &&
      (previousHeight !== list.scrollHeight ||
        previousViewportHeight !== list.clientHeight)
    )
  }
  function syncScrollOwnership(list: HTMLElement) {
    const changed = geometryChanged(list)
    previousHeight = list.scrollHeight
    previousViewportHeight = list.clientHeight
    if (bottomIntent || anchor) return
    // 引擎实测变高可能先发 scroll、后发内容 resize，不能把这次几何变化误认成用户离开底部。
    if (followsBottom && changed && !scrollIntentPending) {
      scrollToBottom()
      return
    }
    scrollIntentPending = false
    followsBottom = nearBottom(list)
  }
  function handleMessagesScroll() {
    const list = element()
    if (!list) return
    syncScrollOwnership(list)
    if (list.scrollTop === 0 && !options.loadingHistory.value)
      options.onLoadMore()
  }
  function handleContentResize() {
    if (disposed) return
    if (anchor) {
      const task = version
      scheduleFrame(task, () => adjustAnchor(task, 1))
    } else if (followsBottom) scrollToBottom()
  }
  watch(
    () =>
      options.virtualRef.value?.itemsElRef ??
      options.normalRef.value?.firstElementChild,
    content => {
      observer?.disconnect()
      observer = undefined
      if (content && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(handleContentResize)
        observer.observe(content)
        const list = element()
        if (list && list !== content) observer.observe(list)
      }
    },
    { flush: 'post' }
  )
  const summary = () => {
    const messages = options.messages.value
    return [
      options.contactId.value,
      messages.length,
      messages[0]?.id,
      messages[messages.length - 1]?.id,
      messages[messages.length - 1]?.content,
      options.loadingHistory.value,
      options.virtual.value,
    ] as const
  }
  type Summary = ReturnType<typeof summary>
  const prepended = (next: Summary, previous: Summary) =>
    next[1] > previous[1] &&
    previous[1] > 0 &&
    next[2] !== previous[2] &&
    (next[3] === previous[3] ||
      options.messages.value.some(message => message.id === previous[2]))
  const replaced = (next: Summary, previous: Summary) =>
    next[1] > 0 &&
    previous[1] > 0 &&
    next[2] !== previous[2] &&
    next[3] !== previous[3]
  function preserveViewport(
    next: Summary,
    previous: Summary,
    list: HTMLElement
  ) {
    const saved = next[6] || previous[6] ? captureAnchor(list) : undefined
    if (saved) restoreAnchor(saved)
    else preserveHeight(list.scrollTop, list.scrollHeight)
  }
  const shouldFollowBottom = (
    next: Summary,
    previous: Summary,
    list: HTMLElement
  ) =>
    replaced(next, previous) ||
    previous[1] === 0 ||
    (!scrollIntentPending &&
      (nearBottom(list) || (followsBottom && geometryChanged(list))))
  function handleModeChange(
    next: Summary,
    previous: Summary,
    list: HTMLElement
  ) {
    if (shouldFollowBottom(next, previous, list)) scrollToBottom()
    else preserveViewport(next, previous, list)
  }
  watch(
    summary,
    (next, previous) => {
      const list = element()
      if (!previous || next[0] !== previous[0] || !list) {
        scrollToBottom()
        return
      }
      if (prepended(next, previous) || next[5] !== previous[5]) {
        preserveViewport(next, previous, list)
      } else if (next[6] !== previous[6]) {
        handleModeChange(next, previous, list)
      } else if (shouldFollowBottom(next, previous, list)) {
        scrollToBottom()
      } else if (!anchor) stopFollowing()
    },
    { immediate: true, flush: 'pre' }
  )
  onBeforeUnmount(() => {
    disposed = true
    version++
    cancelFrame()
    if (intentFrame !== undefined) cancelAnimationFrame(intentFrame)
    observer?.disconnect()
  })
  return { scrollToBottom, handleMessagesScroll, handleScrollIntent }
}
