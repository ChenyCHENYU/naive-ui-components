/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-19
 * @Description: 视频资源切换、持久化与迟到回调的真实组件回归
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { afterEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, shallowRef } from 'vue'
import C_VideoPlayer from '../../src/components/C_VideoPlayer/index.vue'
import { useBookmarks } from '../../src/components/C_VideoPlayer/composables/useBookmarks'
import { useProgressTracker } from '../../src/components/C_VideoPlayer/composables/useProgressTracker'
import { useSubtitle } from '../../src/components/C_VideoPlayer/composables/useSubtitle'
import {
  STORAGE_KEYS,
  XGPLAYER_EVENTS as Events,
} from '../../src/components/C_VideoPlayer/constants'

const engine = vi.hoisted(() => ({ instances: [] as any[] }))
vi.mock('xgplayer', () => ({
  default: class {
    url: string
    currentTime = 0
    duration = 100
    paused = true
    volume = 0.7
    playbackRate = 1
    definitionList: any[] = []
    destroyed = false
    listeners = new Map<string, Array<(...args: any[]) => void>>()
    changeDefinition = vi.fn()
    constructor(options: any) {
      this.url = options.url
      engine.instances.push(this)
    }
    on(event: string, callback: (...args: any[]) => void) {
      this.listeners.set(event, [
        ...(this.listeners.get(event) ?? []),
        callback,
      ])
    }
    off() {}
    trigger(event: string, ...args: any[]) {
      for (const callback of this.listeners.get(event) ?? []) callback(...args)
    }
    destroy() {
      this.destroyed = true
    }
    pause() {
      this.paused = true
    }
    play() {
      this.paused = false
      return Promise.resolve()
    }
  },
}))
vi.mock('xgplayer-hls', async () => ({
  default: (await import('xgplayer')).default,
}))
const stubs = {
  ControlBar: { template: '<div><slot name="right" /></div>' },
  SubtitleOverlay: true,
  ChapterMarkers: true,
  BookmarkPanel: true,
  QuizOverlay: true,
  WatermarkOverlay: true,
}
const progressKey = (url: string) =>
  STORAGE_KEYS.PROGRESS + encodeURIComponent(url)
const bookmarkKey = (url: string) =>
  STORAGE_KEYS.BOOKMARKS + encodeURIComponent(url)
const bookmark = (id: string) => ({ id, time: 4, note: id, createdAt: 1 })
afterEach(() => {
  engine.instances.length = 0
  vi.unstubAllGlobals()
})

test('switching resources persists the previous time and restores only the next resource data', async () => {
  localStorage.setItem(
    progressKey('/b.mp4'),
    JSON.stringify({
      currentTime: 7,
      duration: 100,
      watchedDuration: 3,
      completionPercent: 3,
    })
  )
  localStorage.setItem(
    bookmarkKey('/a.mp4'),
    JSON.stringify([bookmark('A-only')])
  )
  localStorage.setItem(
    bookmarkKey('/b.mp4'),
    JSON.stringify([bookmark('B-only')])
  )
  const wrapper = mount(C_VideoPlayer, {
    props: { url: '/a.mp4', keyboard: false },
    global: { stubs },
  })
  await flushPromises()
  const first = engine.instances[0]
  first.currentTime = 35
  first.trigger(Events.TIME_UPDATE)
  await flushPromises()
  await wrapper.setProps({ url: '/b.mp4' })
  await flushPromises()
  expect(first.destroyed).toBe(true)
  expect(
    JSON.parse(localStorage.getItem(progressKey('/a.mp4'))!).currentTime
  ).toBe(35)
  expect(wrapper.vm.getPlayerInstance()).toBe(engine.instances[1])
  expect(engine.instances[1].url).toBe('/b.mp4')
  expect(engine.instances[1].currentTime).toBe(7)
  const panel = wrapper.findComponent({ name: 'BookmarkPanel' })
  expect(panel.attributes()).toBeTruthy()
  panel.vm.$emit('add', 'New B note')
  await flushPromises()
  const notes = JSON.parse(localStorage.getItem(bookmarkKey('/b.mp4'))!)
  expect(notes.map((item: any) => item.note)).toEqual(['B-only', 'New B note'])
  expect(wrapper.vm.getProgressData().watchedDuration).toBe(3)
  first.currentTime = 90
  first.trigger(Events.TIME_UPDATE)
  first.trigger(Events.ERROR)
  await flushPromises()
  expect(wrapper.vm.getProgressData().currentTime).toBe(7)
  expect(wrapper.emitted('error')).toBeUndefined()
  wrapper.unmount()
})

test('unmount and manual destroy preserve the last playback position exactly once', async () => {
  const wrapper = mount(C_VideoPlayer, {
    props: { url: '/a.mp4', keyboard: false },
    global: { stubs },
  })
  await flushPromises()
  const player = engine.instances[0]
  player.currentTime = 41
  player.trigger(Events.TIME_UPDATE)
  await flushPromises()
  wrapper.vm.destroy()
  expect(wrapper.vm.getPlayerInstance()).toBeNull()
  expect(
    JSON.parse(localStorage.getItem(progressKey('/a.mp4'))!).currentTime
  ).toBe(41)
  wrapper.unmount()
  expect(
    JSON.parse(localStorage.getItem(progressKey('/a.mp4'))!).currentTime
  ).toBe(41)
})

test('clearing the resource destroys the player without constructing an empty media engine', async () => {
  const wrapper = mount(C_VideoPlayer, {
    props: { url: '/a.mp4', keyboard: false },
    global: { stubs },
  })
  await flushPromises()
  await wrapper.setProps({ url: '' })
  await flushPromises()
  expect(engine.instances).toHaveLength(1)
  expect(engine.instances[0].destroyed).toBe(true)
  expect(wrapper.vm.getPlayerInstance()).toBeNull()
})

test('source type changes rebuild once and the latest quality list reaches the native menu and command', async () => {
  const wrapper = mount(C_VideoPlayer, {
    props: {
      url: '/a.mp4',
      keyboard: false,
      qualityList: [{ label: '360p', url: '/a-low.mp4' }],
    },
    global: { stubs },
  })
  await flushPromises()
  const first = engine.instances[0]
  await wrapper.setProps({ qualityList: [{ label: '720p', url: '/a-hd.mp4' }] })
  await flushPromises()
  expect(engine.instances).toHaveLength(1)
  expect(first.definitionList).toMatchObject([
    { definition: '720p', url: '/a-hd.mp4' },
  ])
  wrapper.vm.switchQuality('720p')
  expect(first.changeDefinition).toHaveBeenCalledWith(
    expect.objectContaining({ url: '/a-hd.mp4' })
  )
  await wrapper.setProps({ sourceType: 'hls' })
  await flushPromises()
  expect(engine.instances).toHaveLength(2)
  expect(first.destroyed).toBe(true)
})

test('public progress and bookmark hooks do not carry state across URL identities', () => {
  const url = ref('/a.mp4'),
    time = ref(35),
    duration = ref(100)
  let tracker!: ReturnType<typeof useProgressTracker>,
    marks!: ReturnType<typeof useBookmarks>
  const w = mount(
    defineComponent({
      setup() {
        tracker = useProgressTracker(shallowRef(null), time, duration, url)
        marks = useBookmarks(url, time, () => {})
        return () => h('div')
      },
    })
  )
  tracker.onPlay()
  marks.addBookmark('A-only')
  url.value = '/b.mp4'
  expect(
    JSON.parse(localStorage.getItem(progressKey('/a.mp4'))!).currentTime
  ).toBe(35)
  expect(time.value).toBe(0)
  marks.addBookmark('B-only')
  tracker.saveProgress()
  expect(
    JSON.parse(localStorage.getItem(bookmarkKey('/b.mp4'))!).map(
      (x: any) => x.note
    )
  ).toEqual(['B-only'])
  expect(
    JSON.parse(localStorage.getItem(progressKey('/b.mp4'))!).currentTime
  ).toBe(0)
  w.unmount()
})

test('replacing a subtitle source aborts the old same-language track and ignores late results', async () => {
  const requests: Array<{
    resolve: (response: Response) => void
    signal: AbortSignal
  }> = []
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, options) =>
        new Promise<Response>(resolve =>
          requests.push({ resolve, signal: options.signal })
        )
    )
  )
  const tracks = ref([{ language: 'zh', label: '中文', src: '/a.vtt' }])
  let subtitle!: ReturnType<typeof useSubtitle>
  const w = mount(
    defineComponent({
      setup() {
        subtitle = useSubtitle(shallowRef(null), tracks, ref(1))
        return () => h('div')
      },
    })
  )
  void subtitle.initSubtitles()
  await flushPromises()
  tracks.value = [{ language: 'zh', label: '中文', src: '/b.vtt' }]
  await flushPromises()
  expect(requests[0].signal.aborted).toBe(true)
  const response = (text: string) =>
    new Response(`WEBVTT\n\n00:00.000 --> 00:02.000\n${text}`)
  requests[0].resolve(response('Old'))
  await flushPromises()
  expect(subtitle.isLoading.value).toBe(true)
  requests[1].resolve(response('New'))
  await flushPromises()
  expect(subtitle.currentText.value).toBe('New')
  w.unmount()
})
