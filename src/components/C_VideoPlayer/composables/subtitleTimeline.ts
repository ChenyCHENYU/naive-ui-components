import type { SubtitleCue } from './useSubtitle'

interface SubtitleSegment {
  start: number
  end: number
  text: string
}

/** Disjoint intervals preserve the first matching cue in source order. */
export type SubtitleTimeline = readonly SubtitleSegment[]

/** Compile overlapping cues once; source order remains the tie-breaking rule. */
export function buildSubtitleTimeline(
  cues: readonly SubtitleCue[]
): SubtitleTimeline {
  const events: { time: number; index: number; active: boolean }[] = []
  cues.forEach((cue, index) => {
    if (
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.end <= cue.start
    )
      return
    events.push(
      { time: cue.start, index, active: true },
      { time: cue.end, index, active: false }
    )
  })
  events.sort((left, right) => left.time - right.time)
  const active = new Uint8Array(cues.length)
  const heap: number[] = []
  const segments: SubtitleSegment[] = []
  const push = (index: number) => {
    let position = heap.length
    heap.push(index)
    while (position > 0) {
      const parent = (position - 1) >>> 1
      if (heap[parent] <= index) break
      heap[position] = heap[parent]
      position = parent
    }
    heap[position] = index
  }
  const discardInactive = () => {
    while (heap.length && !active[heap[0]]) {
      const last = heap.pop()!
      if (!heap.length) break
      let position = 0
      while (position * 2 + 1 < heap.length) {
        let child = position * 2 + 1
        if (child + 1 < heap.length && heap[child + 1] < heap[child]) child++
        if (heap[child] >= last) break
        heap[position] = heap[child]
        position = child
      }
      heap[position] = last
    }
  }
  let offset = 0
  while (offset < events.length) {
    const start = events[offset].time
    // Process the complete boundary before selecting a cue: ends are exclusive.
    while (offset < events.length && events[offset].time === start) {
      const event = events[offset++]
      active[event.index] = Number(event.active)
      if (event.active) push(event.index)
    }
    discardInactive()
    if (!heap.length || offset === events.length) continue
    const end = events[offset].time
    const { text } = cues[heap[0]]
    const previous = segments[segments.length - 1]
    if (previous?.end === start && previous.text === text) previous.end = end
    else segments.push({ start, end, text })
  }
  return segments
}

/** O(log N) lookup, including backward seeks and gaps between captions. */
export function findSubtitleText(
  timeline: SubtitleTimeline,
  time: number
): string {
  if (!Number.isFinite(time)) return ''
  let low = 0
  let high = timeline.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (timeline[middle].start <= time) low = middle + 1
    else high = middle
  }
  const segment = timeline[low - 1]
  return segment && time < segment.end ? segment.text : ''
}
