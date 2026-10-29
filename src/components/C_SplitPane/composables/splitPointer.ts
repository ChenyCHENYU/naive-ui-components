import type { SplitDirection } from '../types'

type SplitInputEvent = MouseEvent | TouchEvent | PointerEvent
interface SplitPointerOptions {
  element: HTMLElement
  direction: SplitDirection
  onDelta: (delta: number) => void
  onEnd: () => void
}

const activeGestures = new WeakMap<Document, () => void>()

/** Ignore secondary mouse buttons and non-primary touch/pen contacts. */
export function isPrimarySplitInput(event: SplitInputEvent) {
  if ('button' in event && event.button !== 0) return false
  return !('isPrimary' in event) || event.isPrimary
}

function getPosition(
  event: SplitInputEvent,
  direction: SplitDirection,
  touchId?: number
) {
  if (!('touches' in event))
    return direction === 'horizontal' ? event.clientX : event.clientY
  const touch =
    touchId === undefined
      ? event.touches[0]
      : Array.from(event.touches).find(item => item.identifier === touchId)
  if (!touch) return undefined
  return direction === 'horizontal' ? touch.clientX : touch.clientY
}

function samePointer(event: Event, pointerId: number | undefined) {
  if (pointerId === undefined || !('pointerId' in event)) return true
  return event.pointerId === pointerId
}

function captureBodyStyles(document: Document, direction: SplitDirection) {
  const { style } = document.body
  const cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize'
  const entries = ['cursor', 'user-select'].map(name => ({
    name,
    value: style.getPropertyValue(name),
    priority: style.getPropertyPriority(name),
    owned: name === 'cursor' ? cursor : 'none',
  }))
  for (const entry of entries) style.setProperty(entry.name, entry.owned)
  return () => {
    for (const entry of entries) {
      // A host write after drag start belongs to the host, not this gesture.
      if (style.getPropertyValue(entry.name) !== entry.owned) continue
      if (entry.value)
        style.setProperty(entry.name, entry.value, entry.priority)
      else style.removeProperty(entry.name)
    }
  }
}

function eventNames(event: SplitInputEvent) {
  if ('pointerId' in event)
    return { move: ['pointermove'], end: ['pointerup', 'pointercancel'] }
  if ('touches' in event)
    return { move: ['touchmove'], end: ['touchend', 'touchcancel'] }
  return { move: ['mousemove'], end: ['mouseup'] }
}

/** Start an isolated document gesture; return an idempotent disposer for every exit path. */
export function startSplitPointer(
  event: SplitInputEvent,
  options: SplitPointerOptions
) {
  const startPosition = getPosition(event, options.direction)
  if (startPosition === undefined) return undefined
  const document = options.element.ownerDocument
  const window = document.defaultView
  activeGestures.get(document)?.()
  const restore = captureBodyStyles(document, options.direction)
  const pointerId = 'pointerId' in event ? event.pointerId : undefined
  const touchId = 'touches' in event ? event.touches[0]?.identifier : undefined
  let active = true
  event.preventDefault()
  event.stopPropagation()
  // 指针已在可见手柄上；转移键盘焦点时不得把祖先滚动区拉向整条分割线。
  ;(event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true })

  const move = (next: SplitInputEvent) => {
    if (!samePointer(next, pointerId)) return
    const position = getPosition(next, options.direction, touchId)
    if (position === undefined) return
    if (next.cancelable) next.preventDefault()
    options.onDelta(position - startPosition)
  }
  const end = (next?: Event) => {
    if (next && !samePointer(next, pointerId)) return
    if (!active) return
    active = false
    restore()
    for (const [name, listener] of listeners)
      document.removeEventListener(name, listener)
    window?.removeEventListener('blur', end)
    if (activeGestures.get(document) === end) activeGestures.delete(document)
    options.onEnd()
  }
  const onVisibility = () => {
    if (document.hidden) end()
  }
  const names = eventNames(event)
  const listeners: Array<[string, EventListener]> = [
    ...names.move.map(
      name => [name, move as EventListener] as [string, EventListener]
    ),
    ...names.end.map(
      name => [name, end as EventListener] as [string, EventListener]
    ),
    ['visibilitychange', onVisibility],
  ]
  for (const [name, listener] of listeners)
    document.addEventListener(name, listener, { passive: false })
  window?.addEventListener('blur', end)
  activeGestures.set(document, end)
  return end
}
