import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref, watch } from 'vue'
import { useDataResource } from '../src/composables/useDataResource'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((a, b) => {
    resolve = a
    reject = b
  })
  return { promise, resolve, reject }
}

describe('dependent data ownership', () => {
  test('latest key owns data even if old transport ignores abort', async () => {
    const key = ref('A'),
      a = deferred<string[]>(),
      b = deferred<string[]>()
    const signals: AbortSignal[] = []
    const scope = effectScope()
    const resource = scope.run(() =>
      useDataResource({
        key,
        load: ({ key, signal }) => {
          signals.push(signal)
          return key === 'A' ? a.promise : b.promise
        },
      })
    )!
    key.value = 'B'
    expect(signals[0].aborted).toBe(true)
    b.resolve(['B'])
    await b.promise
    await nextTick()
    a.resolve(['A'])
    await a.promise
    await nextTick()
    expect(resource.data.value).toEqual(['B'])
    scope.stop()
  })
  test('an explicit empty local source owns data and suppresses the loader', async () => {
    let calls = 0
    const source = ref<string[] | undefined>([])
    const resource = useDataResource({
      key: 'A',
      source,
      load: async () => {
        calls++
        return ['remote']
      },
    })
    expect(resource.data.value).toEqual([])
    expect(resource.status.value).toBe('empty')
    expect(calls).toBe(0)
    source.value = undefined
    await nextTick()
    expect(resource.data.value).toEqual(['remote'])
    expect(calls).toBe(1)
    resource.dispose()
  })
  test('local takeover ignores pending remote values and disposed work cannot land', async () => {
    const pending = deferred<string[]>(),
      source = ref<string[] | undefined>()
    const resource = useDataResource({
      key: 0,
      source,
      load: () => pending.promise,
    })
    source.value = []
    pending.resolve(['old'])
    await pending.promise
    await nextTick()
    expect(resource.data.value).toEqual([])
    resource.dispose()
    expect(await resource.reload()).toBe(false)
  })
  test('refresh errors keep the last successful value with visible stale status and allow retry', async () => {
    let fail = false
    const resource = useDataResource({
      key: 'A',
      immediate: false,
      load: async () => {
        if (fail) throw new Error('offline')
        return [1]
      },
      onError: () => {
        throw new Error('observer')
      },
    })
    expect(await resource.reload()).toBe(true)
    fail = true
    expect(await resource.reload()).toBe(false)
    expect(resource.data.value).toEqual([1])
    expect(resource.status.value).toBe('error')
    expect(resource.stale.value).toBe(true)
    fail = false
    expect(await resource.reload()).toBe(true)
    expect(resource.stale.value).toBe(false)
    resource.dispose()
  })
  test('a synchronous data observer can transfer ownership without the old completion clearing loading', async () => {
    const key = ref('A'),
      a = deferred<string[]>(),
      b = deferred<string[]>()
    const resource = useDataResource({
      key,
      immediate: false,
      load: ({ key }) => (key === 'A' ? a.promise : b.promise),
    })
    const stop = watch(
      resource.data,
      value => {
        if (value?.[0] === 'A') key.value = 'B'
      },
      { flush: 'sync' }
    )
    const first = resource.reload()
    a.resolve(['A'])
    expect(await first).toBe(false)
    expect(resource.status.value).toBe('loading')
    expect(resource.loading.value).toBe(true)
    expect(resource.data.value).toBeUndefined()
    b.resolve(['B'])
    await b.promise
    await nextTick()
    expect(resource.data.value).toEqual(['B'])
    expect(resource.status.value).toBe('ready')
    stop()
    resource.dispose()
  })
  test('loading and error observers cannot dispatch or publish obsolete work', async () => {
    const key = ref('A'),
      next = deferred<string[]>(),
      replacement = deferred<string[]>(),
      calls: string[] = [],
      errors: unknown[] = []
    const resource = useDataResource({
      key,
      immediate: false,
      load: ({ key }) => {
        calls.push(key)
        return key === 'C' ? replacement.promise : next.promise
      },
      onError: error => errors.push(error),
    })
    const stopLoading = watch(
      resource.loading,
      loading => {
        if (loading && key.value === 'A') key.value = 'B'
      },
      { flush: 'sync' }
    )
    expect(await resource.reload()).toBe(false)
    expect(calls).toEqual(['B'])
    const stopError = watch(
      resource.error,
      error => {
        if (error && key.value === 'B') key.value = 'C'
      },
      { flush: 'sync' }
    )
    next.reject(new Error('offline'))
    await next.promise.catch(() => {})
    await nextTick()
    expect(calls).toEqual(['B', 'C'])
    expect(errors).toHaveLength(0)
    expect(resource.error.value).toBeNull()
    expect(resource.status.value).toBe('loading')
    replacement.resolve(['C'])
    await replacement.promise
    await nextTick()
    expect(resource.data.value).toEqual(['C'])
    stopLoading()
    stopError()
    resource.dispose()
  })
  test('an abort observer can start a new request whose controller remains owned', async () => {
    const key = ref('A'),
      a = deferred<string[]>(),
      b = deferred<string[]>()
    const signals = new Map<string, AbortSignal>()
    const resource = useDataResource({
      key,
      load: ({ key: current, signal }) => {
        signals.set(current, signal)
        if (current === 'A')
          signal.addEventListener('abort', () => {
            key.value = 'B'
          })
        return current === 'A' ? a.promise : b.promise
      },
    })
    resource.abort()
    expect(signals.get('A')?.aborted).toBe(true)
    expect(signals.get('B')?.aborted).toBe(false)
    expect(resource.loading.value).toBe(true)
    resource.dispose()
    expect(signals.get('B')?.aborted).toBe(true)
    b.resolve(['late'])
    a.resolve(['older'])
    await Promise.all([a.promise, b.promise])
    await nextTick()
    expect(resource.data.value).toBeUndefined()
  })
  test('clearing a missing key cannot overwrite a replacement started by a synchronous reset observer', async () => {
    let key: string | null = 'A'
    const b = deferred<string[]>()
    const resource = useDataResource({
      key: () => key,
      load: ({ key }) => (key === 'A' ? Promise.resolve(['A']) : b.promise),
    })
    await nextTick()
    const stop = watch(
      resource.data,
      value => {
        if (value === undefined && key === null) {
          key = 'B'
          void resource.reload()
        }
      },
      { flush: 'sync' }
    )
    key = null
    expect(await resource.reload()).toBe(false)
    expect(resource.status.value).toBe('loading')
    b.resolve(['B'])
    await b.promise
    await nextTick()
    expect(resource.data.value).toEqual(['B'])
    stop()
    resource.dispose()
  })
  test('scope disposal during the immediate loader is registered before transport dispatch', async () => {
    const scope = effectScope(),
      pending = deferred<string[]>()
    let signal!: AbortSignal
    const resource = scope.run(() =>
      useDataResource({
        key: 'A',
        load: ({ signal: currentSignal }) => {
          signal = currentSignal
          scope.stop()
          return pending.promise
        },
      })
    )!
    expect(signal.aborted).toBe(true)
    pending.resolve(['late'])
    await pending.promise
    await nextTick()
    expect(resource.data.value).toBeUndefined()
    expect(await resource.reload()).toBe(false)
  })
})
