/** Concurrent upload queue with exactly-once request settlement. */

import { readonly, ref, watch, type Ref } from 'vue'
import type {
  CustomUploadRequest,
  UploadFileItem,
  UploadRequestOptions,
} from '../types'

interface UseUploadQueueOptions {
  concurrency: Ref<number>
  action: Ref<string>
  headers: Ref<Record<string, string>>
  data: Ref<Record<string, unknown>>
  customRequest?: Ref<CustomUploadRequest | undefined>
}

interface QueueJob {
  file: UploadFileItem
  onProgress: (uid: string, percent: number) => void
  onSuccess: (uid: string, response: unknown) => void
  onError: (uid: string, error: Error) => void
}

interface ActiveRequest {
  abort: () => void
  settle: (result?: { response?: unknown; error?: Error }) => void
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 *
 */
export function useUploadQueue(options: UseUploadQueueOptions) {
  const queue: QueueJob[] = []
  const activeCount = ref(0)
  const activeRequests = new Map<string, ActiveRequest>()

  const syncActiveCount = () => {
    activeCount.value = activeRequests.size
  }

  const getConcurrency = () =>
    Math.max(1, Math.trunc(Number(options.concurrency.value) || 1))

  function processQueue() {
    while (activeRequests.size < getConcurrency() && queue.length > 0) {
      const job = queue.shift()!
      const { file } = job
      if (!file.raw || activeRequests.has(file.uid)) continue

      let settled = false
      const settle: ActiveRequest['settle'] = result => {
        if (settled) return
        settled = true
        activeRequests.delete(file.uid)
        syncActiveCount()
        if (result?.error) job.onError(file.uid, result.error)
        else if (result && 'response' in result) {
          job.onSuccess(file.uid, result.response)
        }
        processQueue()
      }

      const requestOptions: UploadRequestOptions = {
        action: options.action.value,
        headers: options.headers.value,
        data: options.data.value,
        file: file.raw,
        filename: file.name,
        onProgress: percent => job.onProgress(file.uid, percent),
        onSuccess: response => settle({ response }),
        onError: error => settle({ error }),
      }

      activeRequests.set(file.uid, { abort: () => undefined, settle })
      syncActiveCount()
      try {
        const request = options.customRequest?.value
          ? options.customRequest.value(requestOptions)
          : defaultRequest(requestOptions)
        const active = activeRequests.get(file.uid)
        if (active) active.abort = request.abort
      } catch (error) {
        settle({ error: toError(error) })
      }
    }
  }

  function enqueue(
    file: UploadFileItem,
    onProgress: QueueJob['onProgress'],
    onSuccess: QueueJob['onSuccess'],
    onError: QueueJob['onError']
  ) {
    abort(file.uid)
    queue.push({ file, onProgress, onSuccess, onError })
    processQueue()
  }

  /** Abort without reporting a user-visible upload error. */
  function abort(uid: string) {
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      if (queue[index].file.uid === uid) queue.splice(index, 1)
    }

    const active = activeRequests.get(uid)
    if (!active) return
    active.settle()
    try {
      active.abort()
    } catch {
      // The request is already detached from queue state.
    }
  }

  function abortAll() {
    queue.length = 0
    const requests = [...activeRequests.values()]
    activeRequests.clear()
    syncActiveCount()
    requests.forEach(request => {
      request.settle()
      try {
        request.abort()
      } catch {
        // The request is already detached from queue state.
      }
    })
  }

  watch(options.concurrency, processQueue)

  return {
    activeCount: readonly(activeCount),
    enqueue,
    abort,
    abortAll,
  }
}

function defaultRequest(options: UploadRequestOptions) {
  const xhr = new XMLHttpRequest()
  xhr.open('POST', options.action)

  Object.entries(options.headers ?? {}).forEach(([key, value]) => {
    xhr.setRequestHeader(key, value)
  })

  xhr.upload.addEventListener('progress', event => {
    if (event.lengthComputable) {
      options.onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
  })

  xhr.addEventListener('load', () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      let response: unknown = xhr.responseText
      try {
        response = JSON.parse(xhr.responseText)
      } catch {
        // Non-JSON responses remain text.
      }
      options.onSuccess?.(response)
    } else {
      options.onError?.(new Error(`上传失败: HTTP ${xhr.status}`))
    }
  })
  xhr.addEventListener('error', () => options.onError?.(new Error('网络错误')))

  const formData = new FormData()
  formData.append('file', options.file, options.filename)
  Object.entries(options.data ?? {}).forEach(([key, value]) => {
    formData.append(key, String(value))
  })
  xhr.send(formData)

  return { abort: () => xhr.abort() }
}
