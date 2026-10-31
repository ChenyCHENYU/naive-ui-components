import { describe, expect, test } from 'bun:test'
import { computed, reactive } from 'vue'
import {
  cloneData,
  deleteDataPath,
  getDataPath,
  hasDataPath,
  isDataEqual,
  setDataPath,
  type DataObject,
} from '../src/utils/data'

describe('data snapshot and path ownership', () => {
  test.each([{}, { profile: {} }])(
    'path reads and presence track initially missing reactive branches',
    initial => {
      const model = reactive<DataObject>(initial)
      const value = computed(() => getDataPath(model, 'profile.name'))
      const present = computed(() => hasDataPath(model, 'profile.name'))
      expect(value.value).toBeUndefined()
      expect(present.value).toBe(false)
      setDataPath(model, 'profile.name', 'Ada')
      expect(value.value).toBe('Ada')
      expect(present.value).toBe(true)
      model['profile.name'] = 'literal'
      expect(value.value).toBe('literal')
      deleteDataPath(model, 'profile.name')
      expect(value.value).toBe('Ada')
      deleteDataPath(model, 'profile.name')
      expect(value.value).toBeUndefined()
      expect(present.value).toBe(false)
    }
  )

  test('nested reads and writes never borrow an inherited branch', () => {
    const inherited = { profile: { name: 'shared' } }
    const model = Object.create(inherited) as DataObject
    expect(hasDataPath(model, 'profile.name')).toBe(false)
    expect(getDataPath(model, 'profile.name')).toBeUndefined()
    setDataPath(model, 'profile.name', 'local')
    expect(Object.hasOwn(model, 'profile')).toBe(true)
    expect(getDataPath(model, 'profile.name')).toBe('local')
    expect(inherited.profile.name).toBe('shared')
  })

  test('nested deletion cannot delete a field from an inherited branch', () => {
    const inherited = { profile: { name: 'shared' } }
    const model = Object.create(inherited) as DataObject
    deleteDataPath(model, 'profile.name')
    expect(inherited.profile.name).toBe('shared')
    expect(Object.hasOwn(model, 'profile')).toBe(false)
  })

  test('fallback snapshots preserve sparse row indices and isolate values', () => {
    const rows: { count: number }[] = []
    rows.length = 4
    rows[3] = { count: 1 }
    // Callbacks require the supported fallback instead of structuredClone.
    const snapshot = cloneData({ rows, callback: () => undefined })
    expect(snapshot.rows).toHaveLength(4)
    expect(Object.hasOwn(snapshot.rows, 0)).toBe(false)
    expect(Object.hasOwn(snapshot.rows, 3)).toBe(true)
    snapshot.rows[3].count = 2
    expect(rows[3].count).toBe(1)
  })

  test('fallback snapshots preserve literal prototype keys as owned data', () => {
    const source = JSON.parse(
      '{"__proto__":{"inherited":true},"value":1}'
    ) as DataObject
    source.callback = () => undefined
    source.self = source
    const snapshot = cloneData(source)
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype)
    expect(Object.hasOwn(snapshot, '__proto__')).toBe(true)
    expect(snapshot.inherited).toBeUndefined()
    expect(snapshot.__proto__).toEqual({ inherited: true })
    expect(snapshot.__proto__).not.toBe(source.__proto__)
    expect(snapshot.self).toBe(snapshot)
  })

  test('sparse row equality is symmetric and detects newly filled positions', () => {
    const sparse: (string | undefined)[] = []
    sparse.length = 2
    sparse[1] = 'last'
    const filled = ['first', 'last']
    expect(isDataEqual(sparse, filled)).toBe(false)
    expect(isDataEqual(filled, sparse)).toBe(false)
    expect(isDataEqual(sparse, cloneData(sparse))).toBe(true)
  })
})
