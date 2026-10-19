import { afterEach, expect, test, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, shallowRef } from 'vue'
import C_VideoPlayer from '../../src/components/C_VideoPlayer/index.vue'
import { useQualitySwitch } from '../../src/components/C_VideoPlayer/composables/useQualitySwitch'
import { XGPLAYER_EVENTS as Events } from '../../src/components/C_VideoPlayer/constants'
import type { PlayerInstance } from '../../src/components/C_VideoPlayer/types'

const state = vi.hoisted(() => ({ player: null as any }))
vi.mock('xgplayer', () => ({
  default: class {
    currentTime = 0
    duration = 100
    paused = true
    volume = 0.75
    playbackRate = 1
    definitionList = []
    listeners = new Map<string, Array<(...args: any[]) => void>>()
    constructor() {
      state.player = this
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
})

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
