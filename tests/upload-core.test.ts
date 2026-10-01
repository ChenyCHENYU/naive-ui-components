import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref } from 'vue'
import { useChunkUpload } from '../src/components/C_Upload/composables/useChunkUpload'
import { useFileHash } from '../src/components/C_Upload/composables/useFileHash'
import { useUploadQueue } from '../src/components/C_Upload/composables/useUploadQueue'
import { filterByAccept } from '../src/components/C_Upload/composables/useDragDrop'
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
  test('native picker and drag/paste share the same accept filtering', () => {
    const image = new File(['a'], 'a.PNG', { type: 'image/png' })
    const text = new File(['b'], 'b.txt', { type: 'text/plain' })
    expect(filterByAccept([image, text], '.png,image/jpeg')).toEqual([image])
    expect(filterByAccept([image, text], 'image/*')).toEqual([image])
    expect(filterByAccept([image, text], ',')).toEqual([image, text])
  })

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
    const progress: number[] = []
    expect(
      await hash.calculateHash(new File(['abc'], 'file.txt'), percent => {
        progress.push(percent)
      })
    ).toBe('900150983cd24fb0d6963f7d28e17f72')
    expect(progress).toEqual([0, 33, 67, 100])
    expect(hash.hashing.value).toBe(false)
    expect(hash.hashProgress.value).toBe(100)
  })

  test('abortAll during a resume query prevents new chunk requests', async () => {
    let finishQuery!: (indices: number[]) => void
    let requests = 0
    const uploader = useChunkUpload({
      chunkSize: ref(2),
      concurrency: ref(1),
      action: ref('/upload'),
      headers: ref({}),
      data: ref({}),
      uploadedChunksQuery: ref(
        () => new Promise<number[]>(resolve => (finishQuery = resolve))
      ),
      customRequest: ref(() => {
        requests += 1
        return { abort: () => undefined }
      }),
    })
    const success: unknown[] = []
    const upload = uploader.uploadChunks({
      uid: 'querying',
      file: new File(['abc'], 'file.txt'),
      hash: 'hash',
      onProgress: () => undefined,
      onSuccess: response => success.push(response),
      onError: () => undefined,
      isPaused: () => false,
    })
    uploader.abortAll()
    finishQuery([])
    await upload
    expect(requests).toBe(0)
    expect(success).toEqual([])
  })

  test('abortAll settles custom chunk requests even without abort callbacks', async () => {
    let aborts = 0
    const uploader = useChunkUpload({
      chunkSize: ref(2),
      concurrency: ref(1),
      action: ref('/upload'),
      headers: ref({}),
      data: ref({}),
      customRequest: ref(() => ({
        abort: () => {
          aborts += 1
        },
      })),
    })
    const success: unknown[] = []
    const upload = uploader.uploadChunks({
      uid: 'active',
      file: new File(['abc'], 'file.txt'),
      hash: 'hash',
      onProgress: () => undefined,
      onSuccess: response => success.push(response),
      onError: () => undefined,
      isPaused: () => false,
    })
    await Promise.resolve()
    uploader.abortAll()
    await upload
    expect(aborts).toBe(1)
    expect(success).toEqual([])
  })

  test('abortAll suppresses completion of an in-flight merge', async () => {
    let finishMerge!: (value: unknown) => void
    let markMergeStarted!: () => void
    const mergeStarted = new Promise<void>(resolve => {
      markMergeStarted = resolve
    })
    const uploader = useChunkUpload({
      chunkSize: ref(2),
      concurrency: ref(1),
      action: ref('/upload'),
      headers: ref({}),
      data: ref({}),
      uploadedChunksQuery: ref(async () => [0, 1]),
      mergeChunks: ref(() => {
        markMergeStarted()
        return new Promise(resolve => (finishMerge = resolve))
      }),
    })
    const success: unknown[] = []
    const upload = uploader.uploadChunks({
      uid: 'merging',
      file: new File(['abc'], 'file.txt'),
      hash: 'hash',
      onProgress: () => undefined,
      onSuccess: response => success.push(response),
      onError: () => undefined,
      isPaused: () => false,
    })
    await mergeStarted
    uploader.abortAll()
    finishMerge({ ok: true })
    await upload
    expect(success).toEqual([])
  })
})

describe('HTML safety helpers', () => {
  test('escapes rich HTML during SSR fallback', () => {
    const unsafe = '<img src=x onerror=alert(1)><script>alert(1)</script>'
    expect(escapeHtmlText(unsafe)).not.toContain('<script>')
    expect(sanitizeRichHtml(unsafe)).not.toContain('<script>')
  })
})
