import { expect, test } from 'bun:test'
import { effectScope, ref } from 'vue'
import {
  useTabbedQuery,
  type TabbedQueryContext,
  type TabbedQueryResult,
} from '../src/composables/useTabbedQuery'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => {
    resolve = done
  })
  return { promise, resolve }
}

test('requests only the active tab, retains pagination by key, and resets pages when searching', async () => {
  const scope = effectScope()
  try {
    const activeTab = ref<string | number>('0')
    const calls: TabbedQueryContext<string | number, { term: string }>[] = []
    const state = scope.run(() =>
      useTabbedQuery({
        activeTab,
        initialQuery: { term: '' },
        async request(input) {
          calls.push(input)
          return {
            data: [
              { tab: input.tab, page: input.page, term: input.query.term },
            ],
            total: 200,
          }
        },
      })
    )!
    await settle()
    expect(calls.map(({ tab }) => tab)).toEqual(['0'])
    await state.setPage(1, 30)
    await state.setPage(3)
    activeTab.value = 0
    await settle()
    expect(state.pagination.value).toEqual({
      page: 1,
      pageSize: 20,
      total: 200,
    })
    await state.setPage(2)
    activeTab.value = '0'
    expect(state.pagination.value).toEqual({
      page: 3,
      pageSize: 30,
      total: 200,
    })
    await settle()
    const previousCalls = calls.length
    expect(await state.setQuery({ term: 'filtered' })).toBe(true)
    expect(calls).toHaveLength(previousCalls + 1)
    expect(state.data.value[0]).toEqual({ tab: '0', page: 1, term: 'filtered' })
    expect(state.pagination.value.pageSize).toBe(30)
    activeTab.value = 0
    await settle()
    expect(state.data.value[0]).toEqual({ tab: 0, page: 1, term: 'filtered' })
    expect(state.pagination.value.pageSize).toBe(20)
  } finally {
    scope.stop()
  }
})

test('aborts stale work and only a successful response publishes applied criteria', async () => {
  const scope = effectScope()
  try {
    type Row = { id: string }
    const activeTab = ref<string | null>(null)
    const slow = deferred<TabbedQueryResult<Row>>()
    const calls: TabbedQueryContext<string, { term: string }>[] = []
    const state = scope.run(() =>
      useTabbedQuery({
        activeTab,
        initialQuery: { term: 'initial' },
        async request(input) {
          calls.push(input)
          if (input.tab === 'a') return slow.promise
          if (input.query.term === 'bad') throw new Error('Failed search')
          return { data: [{ id: input.tab }], total: 1 }
        },
      })
    )!
    expect(calls).toHaveLength(0)
    activeTab.value = 'a'
    const searching = state.setQuery({ term: 'next' })
    activeTab.value = 'b'
    expect(calls[1]?.signal.aborted).toBe(true)
    slow.resolve({ data: [{ id: 'old' }], total: 1 })
    expect(await searching).toBe(false)
    await settle()
    expect(state.data.value).toEqual([{ id: 'b' }])
    expect(state.appliedQuery.value).toEqual({ term: 'next' })
    expect(await state.setQuery({ term: 'bad' })).toBe(false)
    expect(state.appliedQuery.value).toBeUndefined()
    expect(state.error.value).toEqual(new Error('Failed search'))
    expect(await state.setQuery({ term: 'fixed' })).toBe(true)
    const snapshot = calls.at(-1)
    expect(snapshot?.query).toEqual({ term: 'fixed' })
  } finally {
    scope.stop()
  }
})

test('keeps query snapshots isolated and corrects pagination when the backend total shrinks', async () => {
  const scope = effectScope()
  try {
    const input = { where: { id: 'original' } }
    const seen: { page: number; id: string }[] = []
    const state = scope.run(() =>
      useTabbedQuery({
        activeTab: 'a',
        initialQuery: input,
        pageSize: 10,
        async request({ page, query }) {
          seen.push({ page, id: query.where.id })
          query.where.id = 'mutated by adapter'
          return { data: [{ id: page }], total: page > 1 ? 7 : 40 }
        },
      })
    )!
    await settle()
    input.where.id = 'mutated by caller'
    await state.setPage(3)
    await settle()
    expect(seen).toEqual([
      { page: 1, id: 'original' },
      { page: 3, id: 'original' },
      { page: 1, id: 'original' },
    ])
    expect(state.pagination.value.page).toBe(1)
    expect(state.appliedQuery.value).toEqual({ where: { id: 'original' } })
    expect(state.data.value).toEqual([{ id: 1 }])
  } finally {
    scope.stop()
  }
})
