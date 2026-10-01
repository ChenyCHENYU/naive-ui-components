import { describe, expect, test } from 'bun:test'
import { createRenderer, h } from 'vue'
import { usePlayerCore } from '../src/components/C_VideoPlayer/composables/usePlayerCore'

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

describe('C_VideoPlayer initialization lifecycle', () => {
  test('an unmounted instance does not create a player after the chunk loads', async () => {
    let core!: ReturnType<typeof usePlayerCore>
    const app = renderer.createApp({
      setup() {
        core = usePlayerCore({ url: '/sample.mp4' })
        return () => h('div')
      },
    })
    app.mount({})
    core.containerRef.value = {} as HTMLElement
    const pending = core.initPlayer()
    expect(core.playerState.value).toBe('loading')
    app.unmount()
    await pending
    expect(core.playerRef.value).toBeNull()
    expect(core.playerState.value).toBe('idle')
  })

  test('a manual destroy also cancels pending initialization', async () => {
    let core!: ReturnType<typeof usePlayerCore>
    const app = renderer.createApp({
      setup() {
        core = usePlayerCore({ url: '/sample.mp4' })
        return () => h('div')
      },
    })
    app.mount({})
    core.containerRef.value = {} as HTMLElement
    const pending = core.initPlayer()
    core.destroyPlayer()
    await pending
    expect(core.playerRef.value).toBeNull()
    expect(core.playerState.value).toBe('idle')
    app.unmount()
  })
})
