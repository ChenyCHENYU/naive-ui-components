import { describe, expect, test } from 'bun:test'
import {
  buildSubtitleTimeline,
  findSubtitleText,
} from '../src/components/C_VideoPlayer/composables/subtitleTimeline'
import type { SubtitleCue } from '../src/components/C_VideoPlayer/composables/useSubtitle'

describe('subtitle time index', () => {
  test('preserves source-order priority across overlaps, unsorted intervals and exact boundaries', () => {
    const cues: SubtitleCue[] = [
      { start: 5, end: 8, text: 'first in file' },
      { start: 0, end: 10, text: 'covering' },
      { start: 7, end: 14, text: 'later overlap' },
      { start: 15, end: 16, text: 'after a gap' },
    ]
    const snapshot = structuredClone(cues)
    const index = buildSubtitleTimeline(cues)
    for (const time of [
      -1, 0, 4.999, 5, 7, 7.999, 8, 9.999, 10, 13.999, 14, 14.999, 15, 16,
    ]) {
      expect(findSubtitleText(index, time)).toBe(
        cues.find(cue => time >= cue.start && time < cue.end)?.text ?? ''
      )
    }
    expect(cues).toEqual(snapshot)
    expect(findSubtitleText(index, Number.NaN)).toBe('')
    expect(findSubtitleText(index, Infinity)).toBe('')
  })

  test('matches a linear reference across deterministic shuffled and nested intervals', () => {
    const cues = Array.from({ length: 600 }, (_, i) => {
      const start = ((i * 71) % 317) / 10
      return {
        start,
        end: start + 0.05 + ((i * 29) % 70) / 10,
        text: `cue-${i}`,
      }
    })
    const index = buildSubtitleTimeline(cues)
    for (let tick = 0; tick < 4000; tick++) {
      const time = tick / 100
      expect(findSubtitleText(index, time)).toBe(
        cues.find(cue => time >= cue.start && time < cue.end)?.text ?? ''
      )
    }
    expect(index.length).toBeLessThanOrEqual(cues.length * 2)
  })

  test('seeking through 100,000 captions uses logarithmic interval probes', () => {
    const cues = Array.from({ length: 100_000 }, (_, i) => ({
      start: i * 2,
      end: i * 2 + 1,
      text: `cue-${i}`,
    }))
    const index = buildSubtitleTimeline(cues)
    let reads = 0
    const measured = new Proxy(index, {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads++
        return Reflect.get(target, key, receiver)
      },
    })
    for (const position of [99_999, 0, 50_000, 100, 90_000]) {
      const before = reads
      expect(findSubtitleText(measured, position * 2 + 0.5)).toBe(
        `cue-${position}`
      )
      expect(reads - before).toBeLessThanOrEqual(19)
    }
    expect(findSubtitleText(index, 3)).toBe('')
    expect(buildSubtitleTimeline([])).toEqual([])
  })
})
