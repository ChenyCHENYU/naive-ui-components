import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref, watch } from 'vue'
import { useWaterFallLayout } from '../src/components/C_WaterFall/composables/useWaterFallLayout'

const originalRequest = globalThis.requestAnimationFrame
const originalCancel = globalThis.cancelAnimationFrame
const frames = new Map<number, FrameRequestCallback>()
let nextFrame = 0
beforeEach(() => {
  frames.clear()
  globalThis.requestAnimationFrame = callback => {
    const id = ++nextFrame
    frames.set(id, callback)
    return id
  }
  globalThis.cancelAnimationFrame = id => {
    frames.delete(id)
  }
})
afterEach(() => {
  globalThis.requestAnimationFrame = originalRequest
  globalThis.cancelAnimationFrame = originalCancel
})
const flushFrame = () => {
  const pending = [...frames.values()]
  frames.clear()
  pending.forEach(callback => callback(0))
}

describe('waterfall image-load batching', () => {
  test('100 image measurements publish one layout for a 1,000-item list', () => {
    const scope = effectScope()
    const items = ref(
      Array.from({ length: 1000 }, (_, id) => ({
        id,
        src: `/img-${id}.png`,
        width: 100,
        height: 100,
      }))
    )
    let updates = 0
    const layout = scope.run(() => {
      const value = useWaterFallLayout(items, ref(4), ref(400), ref(0), {
        batchImageLoads: true,
      })
      watch(value.layoutItems, () => updates++, { flush: 'sync' })
      return value
    })!
    for (let id = 0; id < 100; id++)
      layout.cacheImageHeight(id, 200, 100, `/img-${id}.png`)
    expect(updates).toBe(0)
    expect(frames.size).toBe(1)
    flushFrame()
    expect(updates).toBe(1)
    expect(layout.layoutItems.value[0].height).toBe(200)
    expect(layout.layoutItems.value).toHaveLength(1000)
    expect(layout.containerHeight.value).toBe(27_500)
    scope.stop()
  })

  test('an explicit relayout flushes immediately and cancels the queued frame', () => {
    const scope = effectScope()
    const items = ref([{ id: 1, src: '/one.png', width: 100, height: 100 }])
    const layout = scope.run(() =>
      useWaterFallLayout(items, ref(1), ref(100), ref(0), {
        batchImageLoads: true,
      })
    )!
    layout.cacheImageHeight(1, 200, 100, '/one.png')
    layout.relayout()
    expect(frames.size).toBe(0)
    expect(layout.containerHeight.value).toBe(200)
    scope.stop()
  })

  test('stale/removed image sources cannot overwrite a newer valid ratio', async () => {
    const scope = effectScope()
    const items = ref([{ id: 1, src: '/old.png', width: 100, height: 100 }])
    const layout = scope.run(() =>
      useWaterFallLayout(items, ref(1), ref(100), ref(0), {
        batchImageLoads: true,
      })
    )!
    items.value[0].src = '/new.png'
    layout.cacheImageHeight(1, 300, 100, '/new.png')
    layout.cacheImageHeight(1, 900, 100, '/old.png')
    flushFrame()
    expect(layout.containerHeight.value).toBe(300)
    items.value = []
    await nextTick()
    layout.cacheImageHeight(1, 1000, 100, '/new.png')
    expect(frames.size).toBe(0)
    expect(layout.containerHeight.value).toBe(0)
    scope.stop()
  })

  test('configuration changes calculate the latest dimensions without an extra old frame', async () => {
    const scope = effectScope()
    const items = ref([{ id: 1, src: '/one.png', width: 100, height: 100 }])
    const width = ref(100)
    const layout = scope.run(() =>
      useWaterFallLayout(items, ref(1), width, ref(0), {
        batchImageLoads: true,
      })
    )!
    layout.cacheImageHeight(1, 200, 100, '/one.png')
    width.value = 200
    await nextTick()
    expect(frames.size).toBe(0)
    expect(layout.containerHeight.value).toBe(400)
    scope.stop()
  })

  test('scope disposal cancels pending work and ignores late measurements', () => {
    const scope = effectScope()
    const items = ref([{ id: 1, src: '/one.png', width: 100, height: 100 }])
    const layout = scope.run(() =>
      useWaterFallLayout(items, ref(1), ref(100), ref(0), {
        batchImageLoads: true,
      })
    )!
    layout.cacheImageHeight(1, 200, 100, '/one.png')
    scope.stop()
    expect(frames.size).toBe(0)
    layout.cacheImageHeight(1, 400, 100, '/one.png')
    layout.relayout()
    flushFrame()
    expect(layout.containerHeight.value).toBe(100)
  })
})
