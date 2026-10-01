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
