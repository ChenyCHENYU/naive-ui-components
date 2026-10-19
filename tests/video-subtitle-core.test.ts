import { afterEach, describe, expect, test } from 'bun:test'
import { createRenderer, h, ref, shallowRef } from 'vue'
import { useSubtitle } from '../src/components/C_VideoPlayer/composables/useSubtitle'
import type { SubtitleTrack } from '../src/components/C_VideoPlayer/types'

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
const originalFetch = globalThis.fetch
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  globalThis.fetch = originalFetch
})

function mountSubtitles(tracks: SubtitleTrack[]) {
  let subtitle!: ReturnType<typeof useSubtitle>
  const currentTime = ref(1)
  const app = renderer.createApp({
    setup() {
      subtitle = useSubtitle(shallowRef(null), tracks, currentTime)
      return () => h('div')
    },
  })
  app.mount({})
  cleanups.push(() => app.unmount())
  return { subtitle, currentTime, unmount: () => app.unmount() }
}

function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>(done => {
    resolve = done
  })
  return { promise, resolve }
}

const zhTrack: SubtitleTrack = {
  language: 'zh',
  label: '中文',
  src: '/zh.vtt',
  default: true,
}
const enTrack: SubtitleTrack = {
  language: 'en',
  label: 'English',
  src: '/en.vtt',
}

/** 模拟不遵守 abort 的第三方 fetch，确保版本保护也能阻止迟到结果。 */
function mockTrackRequests() {
  const requests = new Map<string, ReturnType<typeof deferredResponse>>()
  const signals: AbortSignal[] = []
  let calls = 0
  globalThis.fetch = ((url: string, options?: RequestInit) => {
    calls++
    if (options?.signal) signals.push(options.signal)
    const pending = deferredResponse()
    requests.set(url, pending)
    return pending.promise
  }) as typeof fetch
  return { requests, signals, calls: () => calls }
}

function vtt(text: string) {
  return new Response(`WEBVTT\n\n00:00.000 --> 00:02.000\n${text}\n`)
}

describe('C_VideoPlayer subtitles', () => {
  test('standard spaced timestamps, cue settings and CRLF render actual captions', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(
          'WEBVTT\r\n\r\nintro\r\n00:00.000 --> 00:02.000 align:start\r\n<b>你好</b>\r\n第二行\r\n\r\n01:02:03.004 --> 01:02:05.000\r\nLater\r\n'
        )
      )) as typeof fetch
    const { subtitle, currentTime } = mountSubtitles([zhTrack])
    await subtitle.initSubtitles()
    expect(subtitle.currentText.value).toBe('你好\n第二行')
    currentTime.value = 2
    expect(subtitle.currentText.value).toBe('')
    currentTime.value = 3723.5
    expect(subtitle.currentText.value).toBe('Later')
  })

  test('invalid intervals and NOTE blocks do not create phantom captions', async () => {
    globalThis.fetch = (() =>
      Promise.resolve(
        new Response(
          'WEBVTT\n\nNOTE ignored\n00:00.000 --> 00:09.000\nComment\n\n00:00.000 --> 00:99.000\nInvalid\n\n00:03.000 --> 00:02.000\nReversed\n\n00:00.000 --> 00:02.000\nValid'
        )
      )) as typeof fetch
    const { subtitle } = mountSubtitles([zhTrack])
    await subtitle.initSubtitles()
    expect(subtitle.currentText.value).toBe('Valid')
  })

  test('the last language selection wins even when requests finish out of order', async () => {
    const mock = mockTrackRequests()
    const { subtitle } = mountSubtitles([zhTrack, enTrack])
    const chinese = subtitle.initSubtitles()
    const english = subtitle.switchSubtitle('en')
    await Promise.resolve()
    mock.requests.get('/en.vtt')!.resolve(vtt('English'))
    await english
    expect(subtitle.activeLanguage.value).toBe('en')
    expect(subtitle.currentText.value).toBe('English')
    expect(subtitle.isLoading.value).toBe(true)
    mock.requests.get('/zh.vtt')!.resolve(vtt('中文'))
    await chinese
    expect(subtitle.activeLanguage.value).toBe('en')
    expect(subtitle.isLoading.value).toBe(false)
  })

  test('closing pending subtitles stays closed and subsequent selections reuse the cache', async () => {
    const mock = mockTrackRequests()
    const { subtitle } = mountSubtitles([zhTrack])
    const first = subtitle.initSubtitles()
    const duplicate = subtitle.switchSubtitle('zh')
    subtitle.closeSubtitle()
    await Promise.resolve()
    expect(mock.calls()).toBe(1)
    mock.requests.get('/zh.vtt')!.resolve(vtt('中文'))
    await Promise.all([first, duplicate])
    expect(subtitle.activeLanguage.value).toBeNull()
    await subtitle.switchSubtitle('zh')
    expect(mock.calls()).toBe(1)
    expect(subtitle.currentText.value).toBe('中文')
  })

  test('unmount aborts requests and ignores late responses', async () => {
    const mock = mockTrackRequests()
    const { subtitle, unmount } = mountSubtitles([zhTrack])
    const pending = subtitle.initSubtitles()
    await Promise.resolve()
    unmount()
    expect(mock.signals[0].aborted).toBe(true)
    expect(subtitle.isLoading.value).toBe(false)
    mock.requests.get('/zh.vtt')!.resolve(vtt('Late'))
    await pending
    expect(subtitle.activeLanguage.value).toBeNull()
    expect(subtitle.currentText.value).toBe('')
  })
})
