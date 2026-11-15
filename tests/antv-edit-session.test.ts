import { expect, test } from 'bun:test'
import { createGraphEditSession } from '../src/components/C_AntV/composables/graphEditSession'

test('graph edit baselines retain equal source echoes and unrelated record changes', () => {
  let current = [
    { id: 'a', name: 'Original' },
    { id: 'b', name: 'Other' },
  ]
  let source = structuredClone(current)
  let closed = 0
  const session = createGraphEditSession(
    id => current.find(row => row.id === id),
    id => source.find(row => row.id === id),
    () => closed++
  )
  session.begin('a')
  source = structuredClone(source)
  source[1].name = 'Changed elsewhere'
  current = structuredClone(source)
  session.validate()
  expect(closed).toBe(0)
  expect(session.consume('a')).toBe(true)
  expect(session.consume('a')).toBe(false)
})

test('graph edits reject same-frame source changes, SDK changes and removals', () => {
  for (const reason of ['source', 'current', 'removed'] as const) {
    let current: { id: string; name: string } | undefined = {
      id: 'a',
      name: 'Original',
    }
    const source = structuredClone(current)
    const session = createGraphEditSession(
      () => current,
      () => source,
      () => {}
    )
    session.begin('a')
    if (reason === 'source') source.name = 'Fresh source'
    if (reason === 'current') current.name = 'Changed by SDK'
    if (reason === 'removed') current = undefined
    expect(session.consume('a')).toBe(false)
  }
})

test('a new graph record accepts its first controlled echo and closes before reentry', () => {
  const current = { id: 'new', name: 'New' }
  const state: { source?: typeof current } = {}
  let reentered: boolean | undefined
  let closing = false
  const session = createGraphEditSession(
    () => current,
    () => state.source,
    () => {
      if (closing) return
      closing = true
      reentered = session.consume('new')
    }
  )
  session.begin('new')
  state.source = structuredClone(current)
  expect(session.consume('new')).toBe(true)
  expect(reentered).toBe(false)
})

test('a controlled graph echo with materialized defaults remains the same edited record', () => {
  const current = { id: 'a', name: 'Original', width: 120, height: 60 }
  let source: { id: string; name: string; width?: number; height?: number } = {
    id: 'a',
    name: 'Original',
  }
  let closed = false
  const session = createGraphEditSession(
    () => current,
    () => source,
    () => {
      closed = true
    }
  )
  session.begin('a')
  source = structuredClone(current)
  session.validate()
  expect(closed).toBe(false)
  expect(session.consume('a')).toBe(true)
})
