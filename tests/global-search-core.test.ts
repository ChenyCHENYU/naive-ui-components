import { describe, expect, test } from 'bun:test'
import { createRenderer, h } from 'vue'
import { useGlobalSearch } from '../src/components/C_GlobalSearch/composables/useGlobalSearch'

describe('C_GlobalSearch lifecycle', () => {
  test('removes its document shortcut listener when unmounted', () => {
    const listeners = new Set<EventListenerOrEventListenerObject>()
    const previousDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      'document'
    )
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        addEventListener: (
          _type: string,
          listener: EventListenerOrEventListenerObject
        ) => listeners.add(listener),
        removeEventListener: (
          _type: string,
          listener: EventListenerOrEventListenerObject
        ) => listeners.delete(listener),
      },
    })

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

    try {
      const app = renderer.createApp({
        setup() {
          useGlobalSearch({ menuItems: () => [] })
          return () => h('div')
        },
      })
      app.mount({})
      expect(listeners.size).toBe(1)
      app.unmount()
      expect(listeners.size).toBe(0)
    } finally {
      if (previousDocument) {
        Object.defineProperty(globalThis, 'document', previousDocument)
      } else {
        Reflect.deleteProperty(globalThis, 'document')
      }
    }
  })
})
