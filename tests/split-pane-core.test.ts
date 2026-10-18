import { describe, expect, test } from 'bun:test'
import { createRenderer, h, ref } from 'vue'
import { useSplitResize } from '../src/components/C_SplitPane/composables/useSplitResize'

const renderer = createRenderer({
  patchProp: () => {},
  insert: () => {},
  remove: () => {},
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  setText: () => {},
  setElementText: () => {},
  parentNode: () => null,
  nextSibling: () => null,
})

describe('C_SplitPane state boundaries', () => {
  test('clamps invalid sizes and switches directly between collapsed targets', () => {
    const previousDocument = globalThis.document
    Object.assign(globalThis, {
      document: { removeEventListener: () => {} },
    })
    let split!: ReturnType<typeof useSplitResize>
    const app = renderer.createApp({
      setup() {
        split = useSplitResize({
          containerRef: ref(null),
          direction: ref('horizontal'),
          defaultSize: 150,
          minSize: 20,
          maxSize: 80,
          disabled: ref(false),
          collapsible: ref(true),
          step: 2,
        })
        return () => h('div')
      },
    })
    try {
      app.mount({})
      expect(split.panelSize.value).toBe(80)
      split.setSize(Number.NaN)
      expect(split.panelSize.value).toBe(80)
      split.setSize(50)
      split.collapse('first')
      expect(split.isFirstCollapsed.value).toBe(true)
      split.toggle('second')
      expect(split.isSecondCollapsed.value).toBe(true)
      split.toggle('second')
      expect(split.panelSize.value).toBe(50)
    } finally {
      app.unmount()
      Object.assign(globalThis, { document: previousDocument })
    }
  })
})

import {
  clampSplitSize,
  getSplitBounds,
  normalizeGutterSize,
} from '../src/components/C_SplitPane/constraints'

describe('split panel geometry', () => {
  test('normalizes invalid, reversed and out-of-range percentage bounds', () => {
    expect(
      getSplitBounds({
        minSize: 90,
        maxSize: 10,
        minFirstSize: 0,
        minSecondSize: 0,
        availableLength: 0,
      })
    ).toEqual({ min: 10, max: 90 })
    expect(
      getSplitBounds({
        minSize: NaN,
        maxSize: Infinity,
        minFirstSize: -5,
        minSecondSize: NaN,
        availableLength: 400,
      })
    ).toEqual({ min: 0, max: 100 })
    expect(clampSplitSize(NaN, 20, 80)).toBe(50)
    expect(normalizeGutterSize(-1)).toBe(4)
  })
  test('expresses each pixel minimum in the same available space used by flex panels', () => {
    expect(
      getSplitBounds({
        minSize: 10,
        maxSize: 90,
        minFirstSize: 200,
        minSecondSize: 300,
        availableLength: 1000,
      })
    ).toEqual({ min: 20, max: 70 })
    expect(
      getSplitBounds({
        minSize: 10,
        maxSize: 90,
        minFirstSize: 200,
        minSecondSize: 300,
        availableLength: 250,
      })
    ).toEqual({ min: 40, max: 40 })
  })
})
