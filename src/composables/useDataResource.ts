/** 主从资源所有权：本地空数组是有效源；异步结果只属于发起时的 key。 */
import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onActivated,
  onDeactivated,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'
import { notifyObserver } from '../core/observer'

export type DataResourceStatus =
  'idle' | 'loading' | 'ready' | 'empty' | 'error'
export interface DataResourceOptions<K extends string | number, T> {
  key: MaybeRefOrGetter<K | null | undefined>
  load: (context: { key: K; signal: AbortSignal }) => Promise<T>
  /** undefined 表示未提供本地源；[]、null 等其它值均由本地源拥有。 */
  source?: MaybeRefOrGetter<T | undefined>
  immediate?: boolean
  isEmpty?: (data: T) => boolean
  onError?: (error: unknown) => void
}

/** 独立区域的请求状态，既不持有全局缓存，也不决定业务主从关系。 */
export function useDataResource<K extends string | number, T>(
  options: DataResourceOptions<K, T>
) {
  const data = shallowRef<T>()
  const error = shallowRef<unknown>(null)
  const status = shallowRef<DataResourceStatus>('idle')
  let generation = 0
  let controller: AbortController | undefined
  let disposed = false
  let suspended = false
  let resume = false
  let settledStatus: DataResourceStatus = 'idle'
  const empty = (value: T) =>
    options.isEmpty?.(value) ??
    (value == null || (Array.isArray(value) && value.length === 0))
  const owns = (version: number, active?: AbortController) =>
    !disposed && version === generation && (!active || !active.signal.aborted)
  const apply = (
    value: T,
    version: number,
    active?: AbortController
  ): boolean => {
    const nextStatus = empty(value) ? 'empty' : 'ready'
    if (!owns(version, active)) return false
    settledStatus = nextStatus
    data.value = value
    if (!owns(version, active)) return false
    error.value = null
    if (!owns(version, active)) return false
    status.value = nextStatus
    return owns(version, active)
  }
  const abortRequest = () => {
    const version = ++generation
    const previous = controller
    controller = undefined
    // abort 监听器可以同步发起下一次请求，旧控制器不得清除新所有权。
    previous?.abort()
    if (version === generation && status.value === 'loading')
      status.value = settledStatus
    return version
  }
  const abort = () => {
    abortRequest()
  }
  const recordError = (
    cause: unknown,
    version: number,
    active?: AbortController
  ) => {
    if (!owns(version, active)) return
    error.value = cause
    if (!owns(version, active)) return
    status.value = 'error'
    if (owns(version, active)) notifyObserver(() => options.onError?.(cause))
  }
  const resetState = (version: number): boolean => {
    if (!owns(version)) return false
    settledStatus = 'idle'
    data.value = undefined
    if (!owns(version)) return false
    error.value = null
    if (!owns(version)) return false
    status.value = 'idle'
    return owns(version)
  }
  const loadRemote = async (key: K, version: number): Promise<boolean> => {
    if (!owns(version)) return false
    const active = new AbortController()
    controller = active
    status.value = 'loading'
    if (!owns(version, active)) return false
    error.value = null
    if (!owns(version, active)) return false
    try {
      const result = await options.load({ key, signal: active.signal })
      return apply(result, version, active)
    } catch (cause) {
      recordError(cause, version, active)
      return false
    } finally {
      if (controller === active) controller = undefined
    }
  }
  const reload = async (): Promise<boolean> => {
    if (disposed) return false
    const version = abortRequest()
    if (!owns(version)) return false
    const local =
      options.source === undefined ? undefined : toValue(options.source)
    if (local !== undefined) {
      try {
        return apply(local, version)
      } catch (cause) {
        recordError(cause, version)
        return false
      }
    }
    const key = toValue(options.key)
    if (!owns(version)) return false
    if (key == null) {
      resetState(version)
      return false
    }
    if (suspended) {
      resume = true
      return false
    }
    return loadRemote(key, version)
  }
  let stop = () => {}
  const dispose = () => {
    if (disposed) return
    disposed = true
    stop()
    abort()
  }
  if (getCurrentScope()) onScopeDispose(dispose)
  stop = watch(
    () =>
      [
        toValue(options.key),
        options.source === undefined ? undefined : toValue(options.source),
      ] as const,
    () => {
      const version = abortRequest()
      if (resetState(version)) void reload()
    },
    { immediate: options.immediate !== false, flush: 'sync' }
  )
  if (disposed) stop()
  if (getCurrentInstance()) {
    onDeactivated(() => {
      suspended = true
      resume = status.value === 'loading'
      abort()
    })
    onActivated(() => {
      if (!suspended) return
      suspended = false
      if (resume) {
        resume = false
        void reload()
      }
    })
  }
  return {
    data,
    error,
    status,
    loading: computed(() => status.value === 'loading'),
    /** 同一 key 刷新失败时保留原展示，但明确标为旧快照。 */
    stale: computed(() => status.value === 'error' && data.value !== undefined),
    reload,
    abort,
    dispose,
  }
}
