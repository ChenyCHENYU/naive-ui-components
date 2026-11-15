import { afterEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { useFileHash } from '../../src/components/C_Upload/composables/useFileHash'
import { useUploadCore } from '../../src/components/C_Upload/composables/useUploadCore'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function pauseFrames() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1)
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}

test('hashing and the next file complete while animation frames never fire', async () => {
  pauseFrames()
  const hashing = useFileHash(ref(1))
  const controller = new AbortController()
  const results: string[] = []
  const tasks = ['abc', 'abc'].map(text =>
    hashing
      .calculateHash(new File([text], 'file.txt'), undefined, controller.signal)
      .then(
        hash => results.push(hash),
        () => undefined
      )
  )
  try {
    await flushPromises()
    await vi.runAllTimersAsync()
    expect(results).toEqual([
      '900150983cd24fb0d6963f7d28e17f72',
      '900150983cd24fb0d6963f7d28e17f72',
    ])
    expect(hashing.hashing.value).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    controller.abort()
    await Promise.all(tasks)
  }
})

test('abort during a task yield releases a cancelled queued file without reading it', async () => {
  pauseFrames()
  const hashing = useFileHash(ref(1))
  const active = new AbortController(),
    queued = new AbortController()
  const next = new File(['def'], 'queued.txt')
  const slice = vi.spyOn(next, 'slice')
  const first = hashing
    .calculateHash(new File(['abc'], 'active.txt'), undefined, active.signal)
    .catch(() => 'cancelled')
  const second = hashing
    .calculateHash(next, undefined, queued.signal)
    .catch(() => 'cancelled')
  await flushPromises()
  queued.abort()
  active.abort()
  expect(await first).toBe('cancelled')
  expect(await second).toBe('cancelled')
  expect(slice).not.toHaveBeenCalled()
  expect(hashing.hashing.value).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

test('aborting on the last chunk cleans its task and never reports a completed hash', async () => {
  pauseFrames()
  const hashing = useFileHash(ref(1))
  const controller = new AbortController()
  const progress: number[] = []
  const task = hashing
    .calculateHash(
      new File(['a'], 'last.txt'),
      percent => {
        progress.push(percent)
        if (percent === 100) controller.abort()
      },
      controller.signal
    )
    .catch(() => 'cancelled')
  expect(await task).toBe('cancelled')
  expect(progress).toEqual([0, 100])
  expect(hashing.hashing.value).toBe(false)
  expect(vi.getTimerCount()).toBe(0)
})

test('unmounting upload during hashing cancels current and queued hashes without starting transport', async () => {
  pauseFrames()
  const request = vi.fn(() => ({ abort: vi.fn() }))
  let upload!: ReturnType<typeof useUploadCore>
  const wrapper = mount(
    defineComponent({
      setup() {
        upload = useUploadCore({
          chunked: true,
          chunkSize: 1,
          action: '/upload',
          customRequest: request,
        })
        return () => h('div')
      },
    })
  )
  upload.addFiles([new File(['abc'], 'one.txt'), new File(['def'], 'two.txt')])
  upload.startUpload()
  await flushPromises()
  expect(upload.hashing.value).toBe(true)
  wrapper.unmount()
  await flushPromises()
  await vi.runAllTimersAsync()
  expect(upload.hashing.value).toBe(false)
  expect(request).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(0)
})
