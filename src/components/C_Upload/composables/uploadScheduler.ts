import { watch, type Ref } from 'vue'
import type { CustomUploadRequest, UploadRequestOptions } from '../types'

/** 普通文件与分片共享同一个组件级请求额度；排队、取消和同步回调均释放一次。 */
export function createUploadScheduler(concurrency: Ref<number>) {
  const waiting: Array<() => void> = []
  const cancellations = new Set<() => void>()
  let active = 0
  let pumping = false
  const pump = () => {
    if (pumping) return
    pumping = true
    try {
      const limit = Math.max(1, Math.trunc(concurrency.value) || 1)
      while (active < limit && waiting.length) waiting.shift()!()
    } finally {
      pumping = false
    }
  }
  watch(concurrency, pump)
  const schedule = (
    request: CustomUploadRequest,
    options: UploadRequestOptions
  ) => {
    let settled = false
    let started = false
    let transport: ReturnType<CustomUploadRequest> | undefined
    const finish = (dispatchNext = true) => {
      if (settled) return false
      settled = true
      cancellations.delete(abort)
      if (started) active -= 1
      if (dispatchNext) pump()
      return true
    }
    const start = () => {
      if (settled) return
      started = true
      active += 1
      try {
        transport = request({
          ...options,
          onProgress: percent => {
            if (!settled) options.onProgress?.(percent)
          },
          onSuccess: response => {
            if (finish()) options.onSuccess?.(response)
          },
          onError: error => {
            if (finish()) options.onError?.(error)
          },
        })
      } catch (error) {
        if (finish())
          options.onError?.(
            error instanceof Error ? error : new Error(String(error))
          )
      }
    }
    const abort = () => {
      const index = waiting.indexOf(start)
      if (index >= 0) waiting.splice(index, 1)
      if (!finish(false)) return
      try {
        transport?.abort()
      } catch {
        /* 取消后的传输异常不重新占用额度。 */
      } finally {
        pump()
      }
    }
    cancellations.add(abort)
    waiting.push(start)
    pump()
    return { abort }
  }
  return Object.assign(schedule, {
    abortAll() {
      const wasPumping = pumping
      pumping = true
      waiting.length = 0
      try {
        for (const cancel of cancellations) cancel()
      } finally {
        pumping = wasPumping
      }
    },
  })
}
export type UploadScheduler = ReturnType<typeof createUploadScheduler>
