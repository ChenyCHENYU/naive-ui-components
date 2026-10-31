import { describe, expect, test } from 'bun:test'
import { effectScope, watch, watchEffect } from 'vue'
import { useDictionaryOptions } from '../src/composables/useDictionary'
import type {
  DictionaryOption,
  DictionarySource,
  DictionaryState,
} from '../src/core/dictionary'

describe('dictionary request and subscription ownership', () => {
  test('不可变快照的加载/失败通知不复制选项、不重建索引或触发数据消费者', async () => {
    let state: DictionaryState
    let reads = 0
    let options: readonly DictionaryOption[] = Object.freeze([
      {
        value: 0,
        get label() {
          reads++
          return '零'
        },
      },
    ])
    state = { status: 'ready', options }
    let notify = () => {}
    let snapshots = 0
    let resolvers = 0
    const source: DictionarySource = {
      getOptions: () => options,
      getState: () => state,
      subscribe: listener => {
        notify = listener
        return () => {}
      },
    }
    const scope = effectScope()
    const view = scope.run(() => {
      const result = useDictionaryOptions(new Map([['state', source]]))
      watchEffect(
        () => {
          result.getOptions('state')
          snapshots++
        },
        { flush: 'sync' }
      )
      watchEffect(
        () => {
          result.getLabel('state', 0)
          resolvers++
        },
        { flush: 'sync' }
      )
      return result
    })!
    const first = view.getOptions('state')
    const firstReads = reads
    state = { status: 'loading', options }
    notify()
    expect(view.isLoading('state')).toBe(true)
    const error = new Error('offline')
    state = { status: 'error', error, options }
    notify()
    notify()
    expect(view.getError('state')).toBe(error)
    expect(view.getOptions('state')).toBe(first)
    expect(reads).toBe(firstReads)
    expect([snapshots, resolvers]).toEqual([1, 1])
    source.load = async () => {
      state = { status: 'loading', options }
      notify()
      state = { status: 'ready', options }
      notify()
      return options
    }
    await view.reload('state')
    expect(view.getOptions('state')).toBe(first)
    expect(reads).toBe(firstReads)
    expect([snapshots, resolvers]).toEqual([1, 1])
    options = Object.freeze([{ value: 0, label: '新零' }])
    state = { status: 'ready', options }
    notify()
    expect(view.getOptions('state')).not.toBe(first)
    expect(view.getLabel('state', 0)).toBe('新零')
    expect([snapshots, resolvers]).toEqual([2, 2])
    scope.stop()
  })

  for (const stateMode of [
    'legacy',
    'without-snapshot',
    'mismatched-snapshot',
  ]) {
    test(`不承诺不可变快照的源保留原地数组更新协议 (${stateMode})`, () => {
      const options = [{ value: 0, label: '旧' }]
      let notify = () => {}
      const source: DictionarySource = {
        getOptions: () => options,
        ...(stateMode === 'legacy'
          ? {}
          : {
              getState: () => ({
                status: 'ready' as const,
                ...(stateMode === 'mismatched-snapshot' ? { options: [] } : {}),
              }),
            }),
        subscribe: listener => {
          notify = listener
          return () => {}
        },
      }
      const view = useDictionaryOptions(new Map([['state', source]]))
      const first = view.getOptions('state')
      options[0]!.label = '新'
      notify()
      expect(view.getLabel('state', 0)).toBe('新')
      expect(view.getOptions('state')).not.toBe(first)
      view.dispose()
    })
  }

  test('共享状态通知保留错误和旧标签，重复通知不重复报告，恢复后释放状态', () => {
    let state: DictionaryState = { status: 'ready' }
    let options = [{ value: 0, label: '旧标签' }]
    let listener = () => {}
    let reports = 0
    let releases = 0
    const source: DictionarySource = {
      getOptions: () => options,
      getState: () => state,
      subscribe: callback => {
        listener = callback
        return () => releases++
      },
    }
    const view = useDictionaryOptions(new Map([['a', source]]), {
      onError: () => reports++,
    })
    state = { status: 'loading' }
    listener()
    expect(view.isLoading('a')).toBe(true)
    const error = new Error('offline')
    state = { status: 'error', error }
    listener()
    listener()
    expect(view.getError('a')).toBe(error)
    expect(view.isLoading('a')).toBe(false)
    expect(view.getLabel('a', 0)).toBe('旧标签')
    expect(reports).toBe(1)
    options = [{ value: 0, label: '新标签' }]
    state = { status: 'ready' }
    listener()
    expect(view.getError('a')).toBeUndefined()
    expect(view.getLabel('a', 0)).toBe('新标签')
    view.dispose()
    state = { status: 'loading' }
    listener()
    expect(releases).toBe(1)
    expect(view.isLoading('a')).toBe(false)
  })

  test('首次自动准备不强刷，显式重试带force且错误通知不会被返回缓存清除', async () => {
    const calls: Array<boolean | undefined> = []
    const error = new Error('offline')
    let state: DictionaryState = { status: 'idle' }
    let listener = () => {}
    const source: DictionarySource = {
      getOptions: () => [{ value: false, label: '保留' }],
      getState: () => state,
      subscribe: callback => {
        listener = callback
        return () => {}
      },
      load: async ({ force }) => {
        calls.push(force)
        state = force ? { status: 'ready' } : { status: 'error', error }
        listener()
        return source.getOptions()
      },
    }
    const view = useDictionaryOptions(new Map([['a', source]]))
    await Promise.resolve()
    await Promise.resolve()
    expect(view.getError('a')).toBe(error)
    expect(view.getLabel('a', false)).toBe('保留')
    await view.reload('a')
    expect(calls).toEqual([undefined, true])
    expect(view.getError('a')).toBeUndefined()
    view.dispose()
  })

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

  for (const sharedState of [false, true]) {
    test(`a loading observer retains replacement request ownership (${sharedState ? 'shared state' : 'legacy'})`, async () => {
      const signals: AbortSignal[] = []
      const resolvers: ((value: readonly DictionaryOption[]) => void)[] = []
      const source: DictionarySource = {
        getOptions: () => [],
        ...(sharedState
          ? { getState: () => ({ status: 'ready' as const }) }
          : {}),
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
  }

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
