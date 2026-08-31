import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref } from 'vue'
import { useChunkUpload } from '../src/components/C_Upload/composables/useChunkUpload'
import { useFileHash } from '../src/components/C_Upload/composables/useFileHash'
import { useUploadQueue } from '../src/components/C_Upload/composables/useUploadQueue'
import type {
  CustomUploadRequest,
  UploadFileItem,
  UploadRequestOptions,
} from '../src/components/C_Upload/types'
import { escapeHtmlText, sanitizeRichHtml } from '../src/utils/html'

const createItem = (uid: string): UploadFileItem => ({
  uid,
  name: `${uid}.txt`,
  size: 3,
  type: 'text/plain',
  status: 'pending',
  percent: 0,
  raw: new File(['abc'], `${uid}.txt`, { type: 'text/plain' }),
})

describe('C_Upload request queue', () => {
  test('aborting an active request releases its slot and ignores late callbacks', () => {
    const requests = new Map<string, UploadRequestOptions>()
    const aborted: string[] = []
    const customRequest = ref<CustomUploadRequest>(options => {
      requests.set(options.filename, options)
      return {
        abort: () => {
          aborted.push(options.filename)
          options.onError?.(new Error('late abort callback'))
        },
      }
    })
    const successes: string[] = []
    const errors: string[] = []
    const scope = effectScope()
    const queue = scope.run(() =>
      useUploadQueue({
        concurrency: ref(1),
        action: ref('/upload'),
        headers: ref({}),
        data: ref({}),
        customRequest,
      })
    )!

    const enqueue = (uid: string) =>
      queue.enqueue(
        createItem(uid),
        () => undefined,
        id => successes.push(id),
        id => errors.push(id)
      )
    enqueue('first')
    enqueue('second')
    expect(queue.activeCount.value).toBe(1)
    expect(requests.has('second.txt')).toBe(false)

    queue.abort('first')
    expect(aborted).toEqual(['first.txt'])
    expect(requests.has('second.txt')).toBe(true)
    expect(queue.activeCount.value).toBe(1)
    expect(errors).toEqual([])

    requests.get('second.txt')?.onSuccess?.({ ok: true })
    requests.get('second.txt')?.onSuccess?.({ duplicate: true })
    expect(successes).toEqual(['second'])
    expect(queue.activeCount.value).toBe(0)
    scope.stop()
  })

  test('reacts when concurrency increases', async () => {
    const concurrency = ref(1)
    const started: string[] = []
    const scope = effectScope()
    const queue = scope.run(() =>
      useUploadQueue({
        concurrency,
        action: ref('/upload'),
        headers: ref({}),
        data: ref({}),
        customRequest: ref(options => {
          started.push(options.filename)
          return { abort: () => undefined }
        }),
      })
    )!

    const noop = () => undefined
    queue.enqueue(createItem('one'), noop, noop, noop)
    queue.enqueue(createItem('two'), noop, noop, noop)
    expect(started).toEqual(['one.txt'])
    concurrency.value = 2
    await nextTick()
    expect(started).toEqual(['one.txt', 'two.txt'])
    queue.abortAll()
    scope.stop()
  })
})

describe('C_Upload hashing and chunk guards', () => {
  test('normalizes a zero chunk size instead of entering an infinite loop', () => {
    const uploader = useChunkUpload({
      chunkSize: ref(0),
      concurrency: ref(0),
      action: ref('/upload'),
      headers: ref({}),
      data: ref({}),
    })
    const chunks = uploader.createChunks(new File(['abc'], 'file.txt'))
    expect(chunks).toHaveLength(3)
    expect(chunks.every(chunk => chunk.size === 1)).toBe(true)
  })

  test('computes hashes locally without a remote worker script', async () => {
    const hash = useFileHash(ref(1))
    expect(await hash.calculateHash(new File(['abc'], 'file.txt'))).toBe(
      '900150983cd24fb0d6963f7d28e17f72'
    )
    expect(hash.hashing.value).toBe(false)
    expect(hash.hashProgress.value).toBe(100)
  })
})

describe('HTML safety helpers', () => {
  test('escapes rich HTML during SSR fallback', () => {
    const unsafe = '<img src=x onerror=alert(1)><script>alert(1)</script>'
    expect(escapeHtmlText(unsafe)).not.toContain('<script>')
    expect(sanitizeRichHtml(unsafe)).not.toContain('<script>')
  })
})
