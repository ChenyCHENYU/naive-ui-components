/** Incremental local file hashing without remote worker scripts. */

import { computed, readonly, ref, type Ref } from 'vue'
import SparkMD5 from 'spark-md5'

const yieldToBrowser = () =>
  new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
    } else {
      setTimeout(resolve, 0)
    }
  })

/** Compute MD5 incrementally while yielding between chunks to keep UI responsive. */
export function useFileHash(chunkSize: Ref<number>) {
  const activeHashCount = ref(0)
  const hashProgress = ref(0)
  const hashing = computed(() => activeHashCount.value > 0)

  async function calculateHash(file: File): Promise<string> {
    activeHashCount.value += 1
    hashProgress.value = 0
    const spark = new SparkMD5.ArrayBuffer()
    const size = Math.max(1, Math.trunc(Number(chunkSize.value) || 1))
    const totalChunks = Math.max(1, Math.ceil(file.size / size))

    try {
      if (file.size === 0) {
        spark.append(new ArrayBuffer(0))
        hashProgress.value = 100
        return spark.end()
      }

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * size
        // eslint-disable-next-line no-await-in-loop -- 增量哈希必须按文件顺序读取分片。
        const buffer = await file.slice(start, start + size).arrayBuffer()
        spark.append(buffer)
        hashProgress.value = Math.round(((index + 1) / totalChunks) * 100)
        // eslint-disable-next-line no-await-in-loop -- 避免大文件计算长期阻塞 UI 线程。
        await yieldToBrowser()
      }

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
