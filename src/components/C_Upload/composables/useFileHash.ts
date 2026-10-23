/** Incremental local file hashing without remote worker scripts. */

import { computed, readonly, ref, type Ref } from 'vue'
import SparkMD5 from 'spark-md5'

const yieldToBrowser = (signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    let frame: number | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const cleanup = () => {
      signal?.removeEventListener('abort', abort)
      if (frame !== undefined) cancelAnimationFrame(frame)
      if (timer !== undefined) clearTimeout(timer)
    }
    const abort = () => {
      cleanup()
      reject(signal?.reason ?? new DOMException('Hash cancelled', 'AbortError'))
    }
    const finish = () => {
      cleanup()
      resolve()
    }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) {
      abort()
      return
    }
    if (typeof requestAnimationFrame === 'function')
      frame = requestAnimationFrame(finish)
    else timer = setTimeout(finish, 0)
  })

/** Compute MD5 incrementally while yielding between chunks to keep UI responsive. */
export function useFileHash(chunkSize: Ref<number>) {
  const activeHashCount = ref(0)
  const hashProgress = ref(0)
  const hashing = computed(() => activeHashCount.value > 0)

  let hashTail: Promise<void> = Promise.resolve()
  async function calculateHash(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const preceding = hashTail
    let release!: () => void
    hashTail = new Promise<void>(resolve => {
      release = resolve
    })
    await preceding
    try {
      return await hashFile(file, onProgress, signal)
    } finally {
      release()
    }
  }

  async function hashFile(
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal
  ): Promise<string> {
    signal?.throwIfAborted()
    activeHashCount.value += 1
    hashProgress.value = 0
    onProgress?.(0)
    const spark = new SparkMD5.ArrayBuffer()
    const size = Math.max(1, Math.trunc(Number(chunkSize.value) || 1))
    const totalChunks = Math.max(1, Math.ceil(file.size / size))

    try {
      for (let index = 0; index < totalChunks; index += 1) {
        signal?.throwIfAborted()
        const start = index * size
        // eslint-disable-next-line no-await-in-loop -- 增量哈希必须按文件顺序读取分片。
        const buffer = await file.slice(start, start + size).arrayBuffer()
        signal?.throwIfAborted()
        spark.append(buffer)
        hashProgress.value = Math.round(((index + 1) / totalChunks) * 100)
        onProgress?.(hashProgress.value)
        // eslint-disable-next-line no-await-in-loop -- 避免大文件计算长期阻塞 UI 线程。
        await yieldToBrowser(signal)
      }

      signal?.throwIfAborted()
      return spark.end()
    } finally {
      activeHashCount.value = Math.max(0, activeHashCount.value - 1)
    }
  }

  return {
    hashing,
    hashProgress: readonly(hashProgress),
    calculateHash,
  }
}
