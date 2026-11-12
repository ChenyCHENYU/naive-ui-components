import { afterEach, expect, test, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h, ref, shallowRef, KeepAlive, nextTick } from 'vue'
import { useRemoteOptions } from '../../src/composables/useRemoteOptions'
import type {
  OptionPage,
  OptionRequest,
  OptionSource,
} from '../../src/core/optionSource'

interface Row {
  id: number | boolean
  name: string
}
type Source = OptionSource<Row, number | boolean, { tenant: string }>
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}
function setup(source: Source, initial: Array<number | boolean> = []) {
  const current = shallowRef(source)
  const values = ref(initial)
  let api!: ReturnType<
    typeof useRemoteOptions<Row, number | boolean, { tenant: string }>
  >
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useRemoteOptions({ source: current, values })
        return () => h('div')
      },
    })
  )
  return { api, current, values, wrapper }
}
const base = { value: (row: Row) => row.id, label: (row: Row) => row.name }
afterEach(() => vi.useRealTimers())

test('search aborts immediately, debounces requests and rejects late results after close', async () => {
  vi.useFakeTimers()
  const pending: Array<ReturnType<typeof deferred<OptionPage<Row>>>> = []
  const queries: OptionRequest<{ tenant: string }>[] = []
  const request = vi.fn((query: OptionRequest<{ tenant: string }>) => {
    queries.push(query)
    const task = deferred<OptionPage<Row>>()
    pending.push(task)
    return task.promise
  })
  const { api } = setup({ ...base, request, minChars: 1 })
  api.open()
  expect(request).not.toHaveBeenCalled()
  api.setSearch('a')
  await vi.advanceTimersByTimeAsync(250)
  expect(request).toHaveBeenCalledTimes(1)
  api.setSearch('ab')
  expect(queries[0].signal.aborted).toBe(true)
  pending[0].resolve({ rows: [{ id: 0, name: 'stale' }], total: 1 })
  await flushPromises()
  expect(api.rows.value).toEqual([])
  await vi.advanceTimersByTimeAsync(249)
  expect(request).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(queries[1].search).toBe('ab')
  api.close()
  expect(queries[1].signal.aborted).toBe(true)
  pending[1].resolve({ rows: [{ id: false, name: 'closed' }], total: 1 })
  await flushPromises()
  expect(api.rows.value).toEqual([])
})

test('equivalent source factories keep requests, while changed filters invalidate them', async () => {
  const first = deferred<OptionPage<Row>>()
  const queries: OptionRequest<{ tenant: string }>[] = []
  const request = vi.fn((query: OptionRequest<{ tenant: string }>) => {
    queries.push(query)
    return queries.length === 1
      ? first.promise
      : Promise.resolve({ rows: [{ id: 2, name: 'B' }], total: 1 })
  })
  const { api, current } = setup({ ...base, request, filters: { tenant: 'A' } })
  api.open()
  current.value = { ...base, request, filters: { tenant: 'A' } }
  expect(request).toHaveBeenCalledTimes(1)
  current.value = { ...base, request, filters: { tenant: 'B' } }
  expect(queries[0].signal.aborted).toBe(true)
  await flushPromises()
  first.resolve({ rows: [{ id: 1, name: 'A' }], total: 1 })
  await flushPromises()
  expect(api.rows.value).toEqual([{ id: 2, name: 'B' }])
  expect(queries[0].filters).toEqual({ tenant: 'A' })
  expect(queries[1].filters).toEqual({ tenant: 'B' })
})

test('paging preserves previous rows on error and retries the failed page', async () => {
  const request = vi
    .fn<Source['request']>()
    .mockResolvedValueOnce({ rows: [{ id: 0, name: 'zero' }], total: 2 })
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ rows: [{ id: false, name: 'false' }], total: 2 })
  const { api } = setup({ ...base, request, pageSize: 1 })
  api.open()
  await flushPromises()
  api.loadMore()
  api.loadMore()
  await flushPromises()
  expect(request).toHaveBeenCalledTimes(2)
  expect(api.rows.value).toEqual([{ id: 0, name: 'zero' }])
  expect(api.error.value).toBeInstanceOf(Error)
  await api.retry()
  expect(request.mock.calls[2][0].page).toBe(2)
  expect(api.rows.value.map(row => row.id)).toEqual([0, false])
  expect(api.hasMore.value).toBe(false)
})

test('initial labels resolve without opening; clear and unmount cancel late echo', async () => {
  const pending = deferred<readonly Row[]>()
  const resolve = vi
    .fn<NonNullable<Source['resolve']>>()
    .mockReturnValue(pending.promise)
  const request = vi.fn<Source['request']>()
  const { api, values, wrapper } = setup({ ...base, request, resolve }, [
    0,
    false,
  ])
  expect(resolve.mock.calls[0][0]).toEqual([0, false])
  expect(request).not.toHaveBeenCalled()
  values.value = []
  expect(resolve.mock.calls[0][1].aborted).toBe(true)
  pending.resolve([
    { id: 0, name: 'zero' },
    { id: false, name: 'false' },
  ])
  await flushPromises()
  expect(api.available.value).toEqual([])
  values.value = [0]
  wrapper.unmount()
  expect(resolve.mock.calls.at(-1)?.[1].aborted).toBe(true)
})

test('resolved selected labels survive searches without repeated resolve calls', async () => {
  const resolve = vi
    .fn<NonNullable<Source['resolve']>>()
    .mockResolvedValue([{ id: 0, name: 'saved' }])
  const { api } = setup(
    {
      ...base,
      debounce: 0,
      resolve,
      request: async () => ({ rows: [{ id: 1, name: 'result' }], total: 1 }),
    },
    [0]
  )
  await flushPromises()
  api.open()
  await flushPromises()
  api.setSearch('result')
  await flushPromises()
  expect(api.rowFor(0)?.name).toBe('saved')
  expect(resolve).toHaveBeenCalledTimes(1)
})

test('KeepAlive cancels pending debounce and resumes the current query once', async () => {
  vi.useFakeTimers()
  const visible = ref(true)
  const request = vi
    .fn<Source['request']>()
    .mockResolvedValue({ rows: [], total: 0 })
  let api!: ReturnType<
    typeof useRemoteOptions<Row, number | boolean, { tenant: string }>
  >
  const child = defineComponent({
    setup() {
      api = useRemoteOptions({ source: { ...base, request, minChars: 1 } })
      return () => h('div')
    },
  })
  mount(
    defineComponent({
      setup: () => () => h(KeepAlive, () => (visible.value ? h(child) : null)),
    })
  )
  api.open()
  api.setSearch('x')
  visible.value = false
  await nextTick()
  await vi.advanceTimersByTimeAsync(300)
  expect(request).not.toHaveBeenCalled()
  visible.value = true
  await nextTick()
  await flushPromises()
  expect(request).toHaveBeenCalledTimes(1)
  expect(request.mock.calls[0][0].search).toBe('x')
})

test('invalid pages fail explicitly and an empty page stops pagination', async () => {
  const request = vi
    .fn<Source['request']>()
    .mockResolvedValueOnce({
      rows: [
        { id: 0, name: 'A' },
        { id: 0, name: 'duplicate' },
      ],
      total: 2,
    })
    .mockResolvedValueOnce({ rows: [{ id: 0, name: 'A' }], total: 5 })
    .mockResolvedValueOnce({ rows: [], total: 5 })
  const { api } = setup({ ...base, request, pageSize: 2 })
  api.open()
  await flushPromises()
  expect(api.error.value).toBeInstanceOf(TypeError)
  expect(api.rows.value).toEqual([])
  await api.retry()
  expect(api.hasMore.value).toBe(true)
  api.loadMore()
  await flushPromises()
  expect(api.hasMore.value).toBe(false)
  api.loadMore()
  expect(request).toHaveBeenCalledTimes(3)
})
