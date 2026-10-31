import { describe, expect, test } from 'bun:test'
import { effectScope, watch } from 'vue'
import { useDictionaryOptions } from '../src/composables/useDictionary'
import type { DictionaryOption, DictionarySource } from '../src/core/dictionary'

describe('dictionary request and subscription ownership', () => {
  test('disposal during initial reading never subscribes or starts a loader', () => {
    const scope = effectScope()
    let subscribed = false
    let loaded = false
    const source: DictionarySource = {
      getOptions: () => {
        scope.stop()
        return [{ value: 'A', label: 'Alpha' }]
      },
      subscribe: () => {
        subscribed = true
        return () => undefined
      },
      load: async () => {
        loaded = true
        return []
      },
    }
    const view = scope.run(() =>
      useDictionaryOptions(new Map([['state', source]]))
    )!
    expect(subscribed).toBe(false)
    expect(loaded).toBe(false)
    expect(view.getOptions('state')).toEqual([])
    expect(view.getLabel('state', 'A')).toBe('A')
  })

  test('a subscription returned after synchronous disposal is released once', () => {
    const scope = effectScope()
    let released = 0
    const source: DictionarySource = {
      getOptions: () => [],
      subscribe: () => {
        scope.stop()
        return () => released++
      },
    }
    const view = scope.run(() =>
      useDictionaryOptions(new Map([['state', source]]))
    )!
    expect(released).toBe(1)
    view.dispose()
    expect(released).toBe(1)
  })

  test('scope disposal during initial load cancels transport and subscriptions', async () => {
    const scope = effectScope()
    let signal!: AbortSignal
    let subscriptions = 0
    let resolve!: (value: readonly DictionaryOption[]) => void
    const pending = new Promise<readonly DictionaryOption[]>(done => {
      resolve = done
    })
    const source: DictionarySource = {
      getOptions: () => [],
      subscribe: () => {
        subscriptions++
        return () => subscriptions--
      },
      load: ({ signal: current }) => {
        signal = current
        scope.stop()
        return pending
      },
    }
    const view = scope.run(() =>
      useDictionaryOptions(new Map([['state', source]]))
    )!
    expect(signal.aborted).toBe(true)
    expect(subscriptions).toBe(0)
    resolve([{ value: 'late', label: 'Late' }])
    await pending
    expect(view.getOptions('state')).toEqual([])
    expect(view.getLabel('state', 'late')).toBe('late')
  })

  test('bulk reload stops dispatching when an earlier loader disposes the view', async () => {
    let dispose = () => undefined
    let calls = 0
    const first: DictionarySource = {
      getOptions: () => [],
      load: async () => {
        dispose()
        return []
      },
    }
    const second: DictionarySource = {
      getOptions: () => [],
      load: async () => {
        calls++
        return []
      },
    }
    const view = useDictionaryOptions(
      new Map([
        ['first', first],
        ['second', second],
      ])
    )
    await Promise.resolve()
    calls = 0
    dispose = () => view.dispose()
    await view.reload()
    expect(calls).toBe(0)
    expect(view.isLoading('second')).toBe(false)
  })

  test('an abort listener can start a replacement without losing its controller', async () => {
    const signals: AbortSignal[] = []
    const resolvers: ((value: readonly DictionaryOption[]) => void)[] = []
    const source: DictionarySource = {
      getOptions: () => [],
      load: ({ signal }) => {
        signals.push(signal)
        return new Promise(resolve => resolvers.push(resolve))
      },
    }
    const view = useDictionaryOptions(new Map([['state', source]]))
    signals[0].addEventListener('abort', () => {
      void view.reload('state')
    })
    const refresh = view.reload('state')
    expect(signals).toHaveLength(2)
    view.dispose()
    expect(signals.every(signal => signal.aborted)).toBe(true)
    resolvers.forEach(resolve => resolve([]))
    await refresh
    expect(view.getOptions('state')).toEqual([])
  })

  test('a loading observer can refresh without completion clearing its controller', async () => {
    const signals: AbortSignal[] = []
    const resolvers: ((value: readonly DictionaryOption[]) => void)[] = []
    const source: DictionarySource = {
      getOptions: () => [],
      load: ({ signal }) => {
        signals.push(signal)
        return new Promise(resolve => resolvers.push(resolve))
      },
    }
    const view = useDictionaryOptions(new Map([['state', source]]))
    let refreshed = false
    let refresh!: Promise<void>
    const stop = watch(
      () => view.isLoading('state'),
      loading => {
        if (!loading && !refreshed) {
          refreshed = true
          refresh = view.reload('state')
        }
      },
      { flush: 'sync' }
    )
    resolvers[0]([])
    await Promise.resolve()
    expect(signals).toHaveLength(2)
    expect(view.isLoading('state')).toBe(true)
    view.dispose()
    expect(signals[1].aborted).toBe(true)
    resolvers[1]([])
    await refresh
    stop()
  })

  test('disposing during a snapshot notification cannot republish a stale label', async () => {
    const source: DictionarySource = {
      getOptions: () => [{ value: 'A', label: 'Alpha' }],
      load: async () => [{ value: 'A', label: 'Updated' }],
    }
    const view = useDictionaryOptions(new Map([['state', source]]))
    await Promise.resolve()
    const stop = watch(
      () => view.getOptions('state'),
      options => {
        if (options.length) view.dispose()
      },
      { flush: 'sync' }
    )
    await view.reload('state')
    expect(view.getOptions('state')).toEqual([])
    expect(view.getLabel('state', 'A')).toBe('A')
    stop()
  })
})
