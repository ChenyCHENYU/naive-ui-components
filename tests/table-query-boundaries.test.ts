import { expect, test } from 'bun:test'
import { effectScope, watch } from 'vue'
import {
  useTableQuery,
  type TableQueryResult,
  type UseTableQueryOptions,
} from '../src/components/C_Table/composables/useTableQuery'

interface Row {
  id: number
}
interface Query {
  keyword: string
}
const result = (id: number, total = 1): TableQueryResult<Row> => ({
  data: [{ id }],
  total,
})
function fixture(
  observers: Pick<
    UseTableQueryOptions<Row, Query>,
    'onSuccess' | 'onError'
  > = {}
) {
  const pending: Array<{
    signal: AbortSignal
    resolve: (value: TableQueryResult<Row>) => void
    reject: (error: Error) => void
  }> = []
  const scope = effectScope()
  const query = scope.run(() =>
    useTableQuery<Row, Query>({
      immediate: false,
      initialQuery: { keyword: 'initial' },
      ...observers,
      request: ({ signal }) =>
        new Promise((resolve, reject) => {
          pending.push({ signal, resolve, reject })
        }),
    })
  )!
  return { query, scope, pending }
}

test('replacement abort reentry owns the next request and remains cancellable', async () => {
  const { query, scope, pending } = fixture()
  let nested: Promise<boolean> | undefined
  try {
    const first = query.reload()
    pending[0].signal.addEventListener(
      'abort',
      () => {
        nested = query.reload()
      },
      { once: true }
    )
    const superseded = query.reload()
    expect(pending).toHaveLength(2)
    expect(pending[0].signal.aborted).toBe(true)
    expect(query.loading.value).toBe(true)
    query.cancel()
    expect(pending[1].signal.aborted).toBe(true)
    pending[0].resolve(result(1))
    pending[1].resolve(result(2))
    expect(await first).toBe(false)
    expect(await superseded).toBe(false)
    expect(await nested).toBe(false)
    expect(query.loading.value).toBe(false)
    expect(query.data.value).toEqual([])
  } finally {
    scope.stop()
  }
})

test('direct cancellation preserves a request synchronously started by abort cleanup', async () => {
  const { query, scope, pending } = fixture()
  let nested: Promise<boolean> | undefined
  try {
    const first = query.reload()
    pending[0].signal.addEventListener(
      'abort',
      () => {
        nested = query.reload()
      },
      { once: true }
    )
    query.cancel()
    expect(pending).toHaveLength(2)
    expect(query.loading.value).toBe(true)
    expect(pending[1].signal.aborted).toBe(false)
    pending[0].resolve(result(1))
    pending[1].resolve(result(2, 7))
    expect(await first).toBe(false)
    expect(await nested).toBe(true)
    expect(query.data.value).toEqual([{ id: 2 }])
    expect(query.total.value).toBe(7)
    expect(query.loading.value).toBe(false)
  } finally {
    scope.stop()
  }
})

test('disposal prevents abort reentry and later public request entry points', async () => {
  const successes: TableQueryResult<Row>[] = []
  const { query, scope, pending } = fixture({
    onSuccess: value => successes.push(value),
  })
  let nested: Promise<boolean> | undefined
  const first = query.reload()
  pending[0].signal.addEventListener('abort', () => {
    nested = query.reload()
  })
  scope.stop()
  expect(pending[0].signal.aborted).toBe(true)
  expect(pending).toHaveLength(1)
  pending[0].resolve(result(1))
  expect(await first).toBe(false)
  expect(await nested).toBe(false)
  expect(await query.reload()).toBe(false)
  expect(await query.setQuery({ keyword: 'late' })).toBe(false)
  expect(await query.setQuery({ keyword: 'late' }, false)).toBe(false)
  expect(await query.resetQuery()).toBe(false)
  expect(await query.resetQuery(false)).toBe(false)
  expect(await query.handlePaginationChange(3, 50)).toBe(false)
  expect(pending).toHaveLength(1)
  expect(query.query.value).toEqual({ keyword: 'initial' })
  expect(query.page.value).toBe(1)
  expect(query.pageSize.value).toBe(20)
  expect(query.data.value).toEqual([])
  expect(successes).toEqual([])
})

test('a synchronous loading observer can replace a request before its loader starts', async () => {
  const { query, scope, pending } = fixture()
  let nested: Promise<boolean> | undefined
  scope.run(() =>
    watch(
      query.loading,
      loading => {
        if (loading) nested = query.reload()
      },
      { flush: 'sync' }
    )
  )
  try {
    const superseded = query.reload()
    expect(pending).toHaveLength(1)
    pending[0].resolve(result(2))
    expect(await superseded).toBe(false)
    expect(await nested).toBe(true)
    expect(query.loading.value).toBe(false)
  } finally {
    scope.stop()
  }
})

test('a data observer starting a new query prevents stale totals and success notifications', async () => {
  const successes: TableQueryResult<Row>[] = []
  const { query, scope, pending } = fixture({
    onSuccess: value => successes.push(value),
  })
  let nested: Promise<boolean> | undefined
  scope.run(() =>
    watch(
      query.data,
      rows => {
        if (rows[0]?.id === 1) nested = query.reload()
      },
      { flush: 'sync' }
    )
  )
  try {
    const first = query.reload()
    pending[0].resolve(result(1, 99))
    expect(await first).toBe(false)
    expect(query.total.value).toBe(0)
    expect(query.loading.value).toBe(true)
    expect(successes).toEqual([])
    pending[1].resolve(result(2, 3))
    expect(await nested).toBe(true)
    expect(query.total.value).toBe(3)
    expect(successes).toEqual([result(2, 3)])
  } finally {
    scope.stop()
  }
})

test('a synchronous error observer can retry without a stale notification or loading cleanup', async () => {
  const errors: unknown[] = []
  const firstFailure = new Error('first')
  const { query, scope, pending } = fixture({
    onError: error => errors.push(error),
  })
  let nested: Promise<boolean> | undefined
  scope.run(() =>
    watch(
      query.error,
      error => {
        if (error === firstFailure) nested = query.reload()
      },
      { flush: 'sync' }
    )
  )
  try {
    const first = query.reload()
    pending[0].reject(firstFailure)
    expect(await first).toBe(false)
    expect(query.error.value).toBeUndefined()
    expect(query.loading.value).toBe(true)
    expect(errors).toEqual([])
    pending[1].resolve(result(2))
    expect(await nested).toBe(true)
    expect(query.loading.value).toBe(false)
  } finally {
    scope.stop()
  }
})

test('success and error observer failures do not change the request result or cleanup', async () => {
  const observerFailure = new Error('observer failed')
  const success = fixture({
    onSuccess: () => {
      throw observerFailure
    },
  })
  const failure = fixture({
    onError: () => {
      throw observerFailure
    },
  })
  const asyncSuccess = fixture({
    onSuccess: async () => {
      throw observerFailure
    },
  })
  try {
    const successful = success.query.reload()
    success.pending[0].resolve(result(1))
    expect(await successful).toBe(true)
    expect(success.query.error.value).toBeUndefined()
    expect(success.query.loading.value).toBe(false)
    const failed = failure.query.reload()
    const networkFailure = new Error('offline')
    failure.pending[0].reject(networkFailure)
    expect(await failed).toBe(false)
    expect(failure.query.error.value).toBe(networkFailure)
    expect(failure.query.loading.value).toBe(false)
    const asyncObserved = asyncSuccess.query.reload()
    asyncSuccess.pending[0].resolve(result(3))
    expect(await asyncObserved).toBe(true)
    await Promise.resolve()
    expect(asyncSuccess.query.error.value).toBeUndefined()
  } finally {
    success.scope.stop()
    failure.scope.stop()
    asyncSuccess.scope.stop()
  }
})

test('success callback reentry keeps the successor loading and result owner', async () => {
  let nested: Promise<boolean> | undefined
  const { query, scope, pending } = fixture({
    onSuccess: value => {
      if (value.data[0]?.id === 1) nested = query.reload()
    },
  })
  try {
    const first = query.reload()
    pending[0].resolve(result(1))
    expect(await first).toBe(false)
    expect(query.loading.value).toBe(true)
    pending[1].resolve(result(2))
    expect(await nested).toBe(true)
    expect(query.data.value).toEqual([{ id: 2 }])
    expect(query.loading.value).toBe(false)
  } finally {
    scope.stop()
  }
})
