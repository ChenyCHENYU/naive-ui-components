import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive, ref, nextTick } from 'vue'
import AudioPlayer from '../../src/components/C_AudioPlayer/index.vue'
import FilePreview from '../../src/components/C_FilePreview/index.vue'
import { useCalendarEvents } from '../../src/components/C_FullCalendar/composables/useCalendarEvents'
import { useFilePreview } from '../../src/components/C_FilePreview/composables/useFilePreview'
import type { CalendarEvent } from '../../src/components/C_FullCalendar/types'
import type { EventApi } from '@fullcalendar/core'

const parsing = vi.hoisted(() => ({ word: vi.fn(), pdf: vi.fn() }))
vi.mock('../../src/components/C_FilePreview/data', async original => ({
  ...(await original<object>()),
  loadWord: parsing.word,
  loadPdf: parsing.pdf,
}))
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}
beforeEach(() => {
  parsing.word
    .mockReset()
    .mockResolvedValue({ content: '<p>Document A</p>', headings: [] })
  parsing.pdf
    .mockReset()
    .mockResolvedValue({ url: 'blob:document-a', totalPages: 1 })
})
afterEach(() => vi.unstubAllGlobals())

function calendar(event: CalendarEvent) {
  let api!: ReturnType<typeof useCalendarEvents>
  const props = reactive({ editable: true, events: [event] })
  mount(
    defineComponent({
      setup() {
        api = useCalendarEvents(props, vi.fn())
        return () => h('div')
      },
    })
  )
  api.selectedEvent.value = {
    ...event,
    start: new Date(event.start),
    end: event.end === undefined ? null : new Date(event.end),
    allDay: event.allDay ?? false,
    backgroundColor: '',
  } as EventApi
  api.openEditModal()
  return { api, props }
}

test('renaming a multi-day event preserves its full date precision and duration', () => {
  const start = new Date(2026, 9, 1, 9, 12, 33, 123)
  const end = new Date(2026, 9, 4, 17, 20, 44, 456)
  const { api } = calendar({ id: 'a', title: 'A', start, end })
  api.editForm.value.title = 'Renamed'
  expect(api.saveEvent()).toBe(true)
  expect(api.expose.getEvents()[0]).toMatchObject({
    title: 'Renamed',
    start,
    end,
  })
})

test('editing an overnight interval uses the independent ending date', () => {
  const { api } = calendar({
    id: 'a',
    title: 'A',
    start: new Date(2026, 9, 1, 23),
    end: new Date(2026, 9, 2, 1),
  })
  api.editForm.value.endTime = '02:30'
  expect(api.saveEvent()).toBe(true)
  expect(api.expose.getEvents()[0].end).toEqual(new Date(2026, 9, 2, 2, 30))
})

test('all-day title edits retain exclusive date-only strings', () => {
  const { api } = calendar({
    id: 'a',
    title: 'A',
    start: '2026-10-01',
    end: '2026-10-04',
    allDay: true,
  })
  expect(new Date(api.editForm.value.endDate!).getDate()).toBe(3)
  api.editForm.value.title = 'Renamed'
  expect(api.saveEvent()).toBe(true)
  expect(api.expose.getEvents()[0]).toMatchObject({
    start: '2026-10-01',
    end: '2026-10-04',
    allDay: true,
  })
})

test('all-day date edits write the day after the inclusive end date', () => {
  const { api } = calendar({
    id: 'a',
    title: 'A',
    start: new Date(2026, 9, 1),
    end: new Date(2026, 9, 4),
    allDay: true,
  })
  api.editForm.value.endDate = new Date(2026, 9, 5).getTime()
  expect(api.saveEvent()).toBe(true)
  expect(api.expose.getEvents()[0]).toMatchObject({
    start: new Date(2026, 9, 1),
    end: new Date(2026, 9, 6),
    allDay: true,
  })
})

test.each([false, true])(
  'title-only editing does not invent a missing end (allDay=%s)',
  allDay => {
    const { api } = calendar({
      id: 'a',
      title: 'A',
      start: '2026-10-01',
      allDay,
    })
    api.editForm.value.title = 'Renamed'
    expect(api.saveEvent()).toBe(true)
    expect(api.expose.getEvents()[0].end).toBeUndefined()
  }
)

test('invalid cross-day ranges and read-only transitions cannot save', () => {
  const { api, props } = calendar({
    id: 'a',
    title: 'A',
    start: new Date(2026, 9, 2, 9),
    end: new Date(2026, 9, 3, 10),
  })
  api.editForm.value.endDate = new Date(2026, 9, 1).getTime()
  expect(api.saveEvent()).toBe(false)
  props.editable = false
  api.editForm.value.title = 'Blocked'
  expect(api.saveEvent()).toBe(false)
  expect(api.expose.getEvents()[0].title).toBe('A')
})

test('clearing inline DOCX removes the old document and shows the empty state', async () => {
  const wrapper = mount(FilePreview, {
    props: {
      inline: true,
      file: new File(['a'], 'a.docx'),
      fileName: 'document.docx',
    },
  })
  await flushPromises()
  expect(wrapper.text()).toContain('Document A')
  await wrapper.setProps({ file: undefined })
  expect(wrapper.text()).not.toContain('Document A')
  expect(wrapper.text()).toContain('暂无预览文件')
})

test('late parsing cannot resurrect a document after its source is cleared', async () => {
  const pending = deferred<{ content: string; headings: [] }>()
  parsing.word.mockReturnValueOnce(pending.promise)
  const wrapper = mount(FilePreview, {
    props: {
      inline: true,
      file: new File(['a'], 'a.docx'),
      fileName: 'document.docx',
    },
  })
  await flushPromises()
  await wrapper.setProps({ file: undefined })
  pending.resolve({ content: '<p>Late document</p>', headings: [] })
  await flushPromises()
  expect(wrapper.text()).not.toContain('Late document')
  expect(wrapper.find('.n-spin').exists()).toBe(false)
})

test('clearing an existing PDF revokes its URL and late PDF URLs are also released', async () => {
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const wrapper = mount(FilePreview, {
    props: { inline: true, file: new File(['a'], 'a.pdf') },
  })
  await flushPromises()
  await wrapper.setProps({ file: undefined })
  expect(revoke).toHaveBeenCalledWith('blob:document-a')
  const pending = deferred<{ url: string; totalPages: number }>()
  parsing.pdf.mockReturnValueOnce(pending.promise)
  await wrapper.setProps({ file: new File(['b'], 'b.pdf') })
  await flushPromises()
  await wrapper.setProps({ file: undefined })
  pending.resolve({ url: 'blob:late-document#view=fit', totalPages: 1 })
  await flushPromises()
  expect(revoke).toHaveBeenCalledWith('blob:late-document')
})

test('source clearing aborts fetch and unmounting cannot emit a stale preview', async () => {
  const pending = deferred<Response>()
  let signal: AbortSignal | undefined
  vi.stubGlobal(
    'fetch',
    vi.fn((_url, { signal: requestSignal }) => {
      signal = requestSignal
      return pending.promise
    })
  )
  const url = ref<string | undefined>('/document.docx')
  const emit = vi.fn()
  let api!: ReturnType<typeof useFilePreview>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useFilePreview(
          { file: ref(undefined), url, fileName: ref('document.docx') },
          emit
        )
        return () => h('div')
      },
    })
  )
  const opening = api.openPreview()
  url.value = undefined
  expect(signal?.aborted).toBe(true)
  wrapper.unmount()
  pending.resolve(new Response('document'))
  await opening
  expect(emit).not.toHaveBeenCalled()
  expect(api.loading.value).toBe(false)
  expect(api.wordContent.value).toBe('')
})

class AudioMock extends EventTarget {
  static instances: AudioMock[] = []
  src: string
  volume = 1
  currentTime = 0
  duration = 100
  paused = true
  error: unknown = null
  playResult: Promise<void> = Promise.resolve()
  load = vi.fn()
  constructor(src: string) {
    super()
    this.src = src
    AudioMock.instances.push(this)
  }
  play() {
    this.paused = false
    return this.playResult
  }
  pause() {
    this.paused = true
  }
  removeAttribute(name: string) {
    if (name === 'src') this.src = ''
  }
}
function audio() {
  AudioMock.instances = []
  vi.stubGlobal('Audio', AudioMock)
  const tracks = reactive([
    { id: 'a', title: 'A', src: '/a.mp3' },
    { id: 'b', title: 'B', src: '/b.mp3' },
  ])
  const wrapper = mount(AudioPlayer, {
    props: { tracks },
    global: { stubs: { C_Icon: true } },
  })
  return { tracks, wrapper }
}

test('clearing the same playlist array stops playback and releases the media resource', async () => {
  const { tracks, wrapper } = audio()
  await wrapper.get('button.is-play').trigger('click')
  await flushPromises()
  const previous = AudioMock.instances[0]
  expect(previous.paused).toBe(false)
  tracks.splice(0)
  await nextTick()
  expect(previous.paused).toBe(true)
  expect(previous.src).toBe('')
  expect(previous.load).toHaveBeenCalledOnce()
  expect(wrapper.text()).toContain('未选择曲目')
  expect(wrapper.get('button.is-play').attributes('disabled')).toBeDefined()
})

test('reordering and adding other tracks preserve the currently playing identity', async () => {
  const { tracks, wrapper } = audio()
  await wrapper.get('button.is-play').trigger('click')
  await flushPromises()
  tracks.reverse()
  tracks.push({ id: 'c', title: 'C', src: '/c.mp3' })
  await nextTick()
  expect(AudioMock.instances).toHaveLength(1)
  expect(AudioMock.instances[0].paused).toBe(false)
  expect(wrapper.get('.c-audio-player__title').text()).toBe('A')
})

test('mutating the current src replaces audio and resumes the requested playback', async () => {
  const { tracks, wrapper } = audio()
  await wrapper.get('button.is-play').trigger('click')
  await flushPromises()
  const previous = AudioMock.instances[0]
  tracks[0].src = '/new-a.mp3'
  await flushPromises()
  expect(previous.paused).toBe(true)
  expect(AudioMock.instances).toHaveLength(2)
  expect(AudioMock.instances[1].src).toBe('/new-a.mp3')
  expect(AudioMock.instances[1].paused).toBe(false)
  expect(wrapper.get('button.is-play').attributes('title')).toBe('暂停')
})

test('removing the active track selects the next available track; clearing never auto-resumes future additions', async () => {
  const { tracks, wrapper } = audio()
  await wrapper.get('button.is-play').trigger('click')
  await flushPromises()
  tracks.splice(0, 1)
  await flushPromises()
  expect(wrapper.get('.c-audio-player__title').text()).toBe('B')
  expect(AudioMock.instances.at(-1)?.src).toBe('/b.mp3')
  tracks.splice(0)
  await flushPromises()
  tracks.push({ id: 'c', title: 'C', src: '/c.mp3' })
  await flushPromises()
  expect(AudioMock.instances.at(-1)?.paused).toBe(true)
  expect(wrapper.get('button.is-play').attributes('title')).toBe('播放')
})

test('media errors reset playback state and expose the error', async () => {
  const { wrapper } = audio()
  await wrapper.get('button.is-play').trigger('click')
  await flushPromises()
  const current = AudioMock.instances[0]
  current.error = new Error('decode failed')
  current.dispatchEvent(new Event('error'))
  await nextTick()
  expect(wrapper.get('button.is-play').attributes('title')).toBe('播放')
  expect(wrapper.emitted('error')?.[0]).toEqual([current.error])
})

test('moving a same-day event start date also moves the end date', () => {
  const { api } = calendar({
    id: 'a',
    title: 'A',
    start: new Date(2026, 9, 1, 9),
    end: new Date(2026, 9, 1, 10),
  })
  api.editForm.value.date = new Date(2026, 9, 5).getTime()
  expect(api.saveEvent()).toBe(true)
  expect(api.expose.getEvents()[0]).toMatchObject({
    start: new Date(2026, 9, 5, 9),
    end: new Date(2026, 9, 5, 10),
  })
})

test('switching selected events does not accidentally move a multi-day ending date', () => {
  const { api } = calendar({
    id: 'a',
    title: 'A',
    start: new Date(2026, 9, 4, 9),
    end: new Date(2026, 9, 4, 10),
  })
  api.selectedEvent.value = {
    id: 'b',
    title: 'B',
    start: new Date(2026, 9, 1, 9),
    end: new Date(2026, 9, 4, 17),
    allDay: false,
    backgroundColor: '',
  } as EventApi
  api.openEditModal()
  expect(new Date(api.editForm.value.endDate!).getDate()).toBe(4)
})

test('clearing during pending play invalidates its late success and does not resume new tracks', async () => {
  const pending = deferred<void>()
  AudioMock.instances = []
  class PendingAudio extends AudioMock {
    override playResult = pending.promise
  }
  vi.stubGlobal('Audio', PendingAudio)
  const tracks = reactive([{ id: 'a', title: 'A', src: '/a.mp3' }])
  const wrapper = mount(AudioPlayer, {
    props: { tracks },
    global: { stubs: { C_Icon: true } },
  })
  await wrapper.get('button.is-play').trigger('click')
  tracks.splice(0)
  await nextTick()
  pending.resolve()
  await flushPromises()
  expect(wrapper.emitted('play')).toBeUndefined()
  expect(AudioMock.instances[0].paused).toBe(true)
  tracks.push({ id: 'b', title: 'B', src: '/b.mp3' })
  await flushPromises()
  expect(AudioMock.instances.at(-1)?.paused).toBe(true)
})

test('read-only transitions close active calendar editors and prevent stale deletion', () => {
  const { api, props } = calendar({
    id: 'a',
    title: 'A',
    start: new Date(2026, 9, 1, 9),
    end: new Date(2026, 9, 1, 10),
  })
  const selected = api.selectedEvent.value
  api.showActionDialog.value = true
  expect(api.showEditModal.value).toBe(true)
  props.editable = false
  expect(api.showActionDialog.value).toBe(false)
  expect(api.showEditModal.value).toBe(false)
  expect(api.selectedEvent.value).toBeNull()
  // 即使旧操作持有了选中项，删除入口仍重新检查最新权限。
  api.selectedEvent.value = selected
  api.deleteEvent()
  expect(api.expose.getEvents()).toHaveLength(1)
  api.openEditModal()
  expect(api.showEditModal.value).toBe(false)
})

test('late drag or resize callbacks revert when calendar becomes read-only', () => {
  const { api, props } = calendar({
    id: 'a',
    title: 'A',
    start: new Date(2026, 9, 1, 9),
    end: new Date(2026, 9, 1, 10),
  })
  const original = api.expose.getEvents()[0]
  props.editable = false
  const revert = vi.fn()
  const info = {
    event: {
      id: 'a',
      title: 'A',
      start: new Date(2026, 9, 2),
      end: new Date(2026, 9, 3),
      allDay: true,
    },
    revert,
  }
  api.calendarOptions.value.eventDrop?.(
    info as unknown as Parameters<
      NonNullable<typeof api.calendarOptions.value.eventDrop>
    >[0]
  )
  api.calendarOptions.value.eventResize?.(
    info as unknown as Parameters<
      NonNullable<typeof api.calendarOptions.value.eventResize>
    >[0]
  )
  expect(revert).toHaveBeenCalledTimes(2)
  expect(api.expose.getEvents()[0]).toEqual(original)
})

test('auto-preview opens the modal and refreshes its document when the source changes', async () => {
  const first = new File(['a'], 'a.docx')
  const wrapper = mount(FilePreview, {
    attachTo: document.body,
    props: { autoPreview: true, file: first },
  })
  await flushPromises()
  expect(document.body.textContent).toContain('Document A')
  expect(wrapper.emitted('preview')?.[0]).toEqual([first])
  parsing.word.mockResolvedValueOnce({
    content: '<p>Document B</p>',
    headings: [],
  })
  await wrapper.setProps({ file: new File(['b'], 'b.docx') })
  await flushPromises()
  expect(parsing.word).toHaveBeenCalledTimes(2)
  expect(document.body.textContent).toContain('Document B')
  expect(document.body.textContent).not.toContain('Document A')
})
