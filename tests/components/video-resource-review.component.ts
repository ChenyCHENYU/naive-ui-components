import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, shallowRef } from 'vue'
import C_VideoPlayer from '../../src/components/C_VideoPlayer/index.vue'
import { useQualitySwitch } from '../../src/components/C_VideoPlayer/composables/useQualitySwitch'
import { XGPLAYER_EVENTS as Events } from '../../src/components/C_VideoPlayer/constants'
import type {
  IPlayerOptions,
  PlayerInstance,
} from '../../src/components/C_VideoPlayer/types'

const state = vi.hoisted(() => ({
  player: null as any,
  config: undefined as IPlayerOptions | undefined,
}))
vi.mock('xgplayer', () => ({
  default: class {
    currentTime = 0
    duration = 100
    paused = true
    volume = 0.75
    playbackRate = 1
    definitionList = []
    listeners = new Map<string, Array<(...args: any[]) => void>>()
    constructor(config: IPlayerOptions) {
      state.player = this
      state.config = config
    }
    on(event: string, callback: (...args: any[]) => void) {
      this.listeners.set(event, [
        ...(this.listeners.get(event) ?? []),
        callback,
      ])
    }
    off() {}
    destroy() {
      this.listeners.clear()
    }
    pause() {}
    play() {
      return Promise.resolve()
    }
    trigger(event: string, payload: unknown) {
      this.listeners.get(event)?.forEach(callback => callback(payload))
    }
  },
}))

afterEach(() => {
  state.player = null
  state.config = undefined
  vi.unstubAllGlobals()
})

test.each([false, true])(
  'fluid=%s respects the fixed-size or width-fit SDK contract',
  async fluid => {
    const wrapper = mount(C_VideoPlayer, {
      props: { url: '/a.mp4', keyboard: false, height: 360, fluid },
    })
    await flushPromises()
    expect(state.config?.height).toBe(360)
    expect(state.config?.fitVideoSize).toBe(fluid ? 'fixWidth' : 'fixed')
    wrapper.unmount()
  }
)

test('an omitted qualityList preserves the native playerOptions definition list', async () => {
  const nativeList = [
    { url: '/native-hd.mp4', definition: 'native-HD', text: '原生高清' },
  ]
  const player = {
    definitionList: nativeList,
    on: vi.fn(),
    changeDefinition: vi.fn(),
  } as unknown as PlayerInstance
  const playerRef = shallowRef<PlayerInstance | null>(null)
  mount(
    defineComponent({
      setup() {
        useQualitySwitch(playerRef, () => undefined)
        return () => null
      },
    })
  )
  playerRef.value = player
  await flushPromises()
  expect(player.definitionList).toEqual(nativeList)
})

test('rateChange retains its public numeric payload with the actual xgplayer event envelope', async () => {
  const wrapper = mount(C_VideoPlayer, {
    props: { url: '/a.mp4', keyboard: false },
    global: {
      stubs: {
        ControlBar: true,
        SubtitleOverlay: true,
        ChapterMarkers: true,
        BookmarkPanel: true,
        QuizOverlay: true,
        WatermarkOverlay: true,
      },
    },
  })
  await flushPromises()
  const { player } = state
  player.playbackRate = 1.5
  // xgplayer 3 mediaProxy 将媒体事件转为对象；倍速从当前实例读取。
  player.trigger(Events.RATE_CHANGE, {
    player,
    eventName: 'ratechange',
    originalEvent: new Event('ratechange'),
  })
  expect(wrapper.emitted('rateChange')).toEqual([[1.5]])
})

test('mini mode observes a stable flow anchor, reserves its original height and returns to that anchor', async () => {
  let visibility!: IntersectionObserverCallback
  const observe = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = observe
      disconnect = disconnect
      constructor(callback: IntersectionObserverCallback) {
        visibility = callback
      }
    }
  )
  const wrapper = mount(C_VideoPlayer, {
    props: { url: '/mini.mp4', keyboard: false, miniPlayer: true },
    global: {
      stubs: {
        ControlBar: true,
        SubtitleOverlay: true,
        ChapterMarkers: true,
        BookmarkPanel: true,
        QuizOverlay: true,
        WatermarkOverlay: true,
      },
    },
  })
  await flushPromises()
  const anchor = wrapper.get('.c-video-player-anchor')
  const viewport = wrapper.get('.c-video-player')
  expect(observe).toHaveBeenCalledExactlyOnceWith(anchor.element)
  expect(anchor.element.contains(viewport.element)).toBe(true)
  vi.spyOn(anchor.element, 'getBoundingClientRect').mockReturnValue({
    height: 360,
  } as DOMRect)
  const scroll = vi.fn()
  anchor.element.scrollIntoView = scroll
  const notify = (isIntersecting: boolean) =>
    visibility(
      [{ isIntersecting }] as IntersectionObserverEntry[],
      {} as IntersectionObserver
    )
  notify(false)
  await flushPromises()
  expect(viewport.classes()).toContain('is-mini')
  expect(anchor.classes()).not.toContain('is-mini')
  expect((anchor.element as HTMLElement).style.height).toBe('360px')
  // 尺寸通知期间维持原占位，不把小窗180px的高度写回原始位置。
  vi.spyOn(anchor.element, 'getBoundingClientRect').mockReturnValue({
    height: 180,
  } as DOMRect)
  notify(false)
  await flushPromises()
  expect((anchor.element as HTMLElement).style.height).toBe('360px')
  const back = wrapper
    .findAll('button')
    .find(button => button.text() === '回到原位')!
  await back.trigger('click')
  expect(scroll).toHaveBeenCalledExactlyOnceWith({
    behavior: 'smooth',
    block: 'center',
  })
  notify(true)
  await flushPromises()
  expect(viewport.classes()).not.toContain('is-mini')
  expect((anchor.element as HTMLElement).style.height).toBe('')
  await wrapper.setProps({ miniPlayer: false })
  notify(false)
  await flushPromises()
  expect(viewport.classes()).not.toContain('is-mini')
  wrapper.unmount()
  expect(disconnect).toHaveBeenCalledTimes(1)
})
