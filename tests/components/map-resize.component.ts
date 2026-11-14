import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MapView from '../../src/components/C_Map/index.vue'

interface ResizeRecord extends ResizeObserver {
  callback: ResizeObserverCallback
  targets: Set<Element>
}

const state = vi.hoisted(() => {
  const createMap = () => ({
    invalidateSize: vi.fn(),
    resize: vi.fn(),
    stop: vi.fn(),
    remove: vi.fn(),
    destroy: vi.fn(),
  })
  return {
    maps: [] as ReturnType<typeof createMap>[],
    createMap,
    observers: [] as ResizeRecord[],
    frames: [] as FrameRequestCallback[],
  }
})

vi.mock('../../src/components/C_Map/leafletLoader', () => ({
  loadLeafletApi: async () => ({
    map: () => {
      const map = state.createMap()
      state.maps.push(map)
      return map
    },
    tileLayer: () => ({ addTo: vi.fn() }),
    icon: () => ({}),
  }),
}))
vi.mock('../../src/components/C_Map/amapLoader', () => ({
  loadAMapApi: async () => ({
    Map: class {
      constructor() {
        const map = state.createMap()
        state.maps.push(map)
        return map
      }
    },
  }),
}))

beforeEach(() => {
  state.maps.length = 0
  state.observers.length = 0
  state.frames.length = 0
  vi.stubGlobal(
    'ResizeObserver',
    class implements ResizeRecord {
      targets = new Set<Element>()
      constructor(public callback: ResizeObserverCallback) {
        state.observers.push(this)
      }
      observe = vi.fn((target: Element) => {
        this.targets.add(target)
      })
      unobserve = vi.fn((target: Element) => {
        this.targets.delete(target)
      })
      disconnect = vi.fn(() => {
        this.targets.clear()
      })
    }
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    state.frames.push(callback)
    return state.frames.length
  })
})
afterEach(() => vi.unstubAllGlobals())

function resize(
  observer: ResizeRecord,
  target: Element,
  width: number,
  height: number
) {
  const entry: ResizeObserverEntry = {
    target,
    contentRect: new DOMRectReadOnly(0, 0, width, height),
    borderBoxSize: [],
    contentBoxSize: [],
    devicePixelContentBoxSize: [],
  }
  observer.callback([entry], observer)
}

test.each(['osm', 'amap'] as const)(
  '%s observes its real container, refreshes changed visible sizes, and ignores hidden/repeated/disposed deliveries',
  async mapType => {
    const wrapper = mount(MapView, { props: { mapType, amapKey: 'test-key' } })
    await flushPromises()
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(state.observers).toHaveLength(1)
    const [observer] = state.observers
    const target = wrapper.get('.map-container').element
    expect(observer.targets.has(target)).toBe(true)
    const [sdk] = state.maps
    for (const callback of state.frames.splice(0)) callback(0)
    sdk.invalidateSize.mockClear()
    sdk.resize.mockClear()
    const refresh = mapType === 'osm' ? sdk.invalidateSize : sdk.resize
    resize(observer, target, 400, 300)
    expect(refresh).toHaveBeenCalledTimes(1)
    if (mapType === 'osm')
      expect(refresh).toHaveBeenLastCalledWith({ pan: false })
    resize(observer, target, 400, 300)
    resize(observer, target, 0, 0)
    expect(refresh).toHaveBeenCalledTimes(1)
    resize(observer, target, 400, 300)
    expect(refresh).toHaveBeenCalledTimes(2)
    resize(observer, target, 500, 300)
    resize(observer, target, 500, 0)
    expect(refresh).toHaveBeenCalledTimes(3)
    resize(observer, target, 500, 300)
    expect(refresh).toHaveBeenCalledTimes(4)
    wrapper.unmount()
    expect(observer.disconnect).toHaveBeenCalledTimes(1)
    resize(observer, target, 600, 400)
    for (const callback of state.frames.splice(0)) callback(0)
    expect(refresh).toHaveBeenCalledTimes(4)
    expect(mapType === 'osm' ? sdk.remove : sdk.destroy).toHaveBeenCalledTimes(
      1
    )
  }
)

test('maps remain usable without ResizeObserver and keep their explicit public refresh API', async () => {
  vi.stubGlobal('ResizeObserver', undefined)
  const wrapper = mount(MapView, { props: { mapType: 'osm' } })
  await flushPromises()
  expect(wrapper.emitted('ready')).toHaveLength(1)
  expect(state.observers).toHaveLength(0)
  const [sdk] = state.maps
  wrapper.vm.refresh()
  expect(sdk.invalidateSize).toHaveBeenCalledWith({ pan: false })
  wrapper.unmount()
})
