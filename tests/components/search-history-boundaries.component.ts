import { afterEach, expect, test } from 'vitest'
import { effectScope, reactive, ref, type EffectScope } from 'vue'
import { useSearchHistory } from '../../src/components/C_FormSearch/composables/useSearchHistory'
import type { SearchFormItem } from '../../src/components/C_FormSearch/types'

const scopes: EffectScope[] = []
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()))

function scopedHistory(defaults: string[] = []) {
  const fields = ref<SearchFormItem[]>([
    { prop: 'name', type: 'input', hisList: defaults },
  ])
  const model = ref({ name: '' })
  const options = reactive<{ storageKey: string | undefined }>({
    storageKey: 'a',
  })
  const scope = effectScope()
  scopes.push(scope)
  const history = scope.run(() => useSearchHistory(fields, model, options))!
  return { fields, model, options, history }
}

test.each([1.5, Number.NaN, Number.POSITIVE_INFINITY])(
  'search history normalizes maxItems %s before array length writes',
  maxItems => {
    const fields = ref<SearchFormItem[]>([
      {
        prop: 'name',
        type: 'input',
        hisList: Array.from({ length: 7 }, (_, index) => `old${index}`),
      },
    ])
    const model = ref({ name: 'new' })
    const history = useSearchHistory(fields, model, {
      storageKey: 'history',
      maxItems,
    })
    expect(() => history.saveCurrentInputs()).not.toThrow()
    expect(fields.value[0].hisList?.[0]).toBe('new')
    expect(fields.value[0].hisList).toHaveLength(
      Number.isFinite(maxItems) ? 1 : 5
    )
  }
)

test('search history restores only bounded string entries and tolerates malformed legacy records', () => {
  const fields = ref<SearchFormItem[]>([
    { prop: 'name', type: 'input', hisList: [] },
  ])
  const history = useSearchHistory(fields, ref({ name: '' }), {
    storageKey: 'history',
    maxItems: 2,
  })
  localStorage.setItem(
    'history',
    JSON.stringify([
      null,
      3,
      { prop: 'name', hisList: [null, 'one', {}, 'two', 'three'] },
    ])
  )
  expect(() => history.handleFocus('name')).not.toThrow()
  expect(fields.value[0].hisList).toEqual(['one', 'two'])
  expect(fields.value[0].isFocus).toBe(true)
})

test('switching history scope closes the panel and never copies previous stored entries', () => {
  localStorage.setItem('a', JSON.stringify({ name: ['A-history'] }))
  const { fields, model, options, history } = scopedHistory()
  history.handleFocus('name')
  expect(fields.value[0].hisList).toEqual(['A-history'])
  options.storageKey = 'b'
  expect(fields.value[0].hisList).toEqual([])
  expect(fields.value[0].isFocus).toBe(false)
  // A query can run without focusing the field again.
  model.value.name = 'B-history'
  history.saveCurrentInputs()
  expect(JSON.parse(localStorage.getItem('b')!)).toEqual({
    name: ['B-history'],
  })
  expect(JSON.parse(localStorage.getItem('a')!)).toEqual({
    name: ['A-history'],
  })
  options.storageKey = 'a'
  expect(fields.value[0].hisList).toEqual(['A-history'])
})

test('history scopes retain explicit defaults without promoting persisted or newly entered values', () => {
  localStorage.setItem('a', JSON.stringify({ name: ['A-history'] }))
  localStorage.setItem('malformed', 'not-json')
  localStorage.setItem('empty', JSON.stringify({ other: ['unrelated'] }))
  const defaults = ['Business suggestion']
  const { fields, model, options, history } = scopedHistory(defaults)
  history.handleFocus('name')
  options.storageKey = 'b'
  expect(fields.value[0].hisList).toEqual(defaults)
  model.value.name = 'B-history'
  history.saveCurrentInputs()
  expect(fields.value[0].hisList).toEqual(['B-history', ...defaults])
  expect(defaults).toEqual(['Business suggestion'])
  options.storageKey = 'malformed'
  expect(fields.value[0].hisList).toEqual(defaults)
  options.storageKey = 'empty'
  expect(fields.value[0].hisList).toEqual(defaults)
  options.storageKey = undefined
  expect(fields.value[0].hisList).toEqual(defaults)
  history.clearAllHistory('name')
  history.handleFocus('name')
  expect(fields.value[0].hisList).toEqual([])
})

test('scope switches respect updated field defaults and forget removed field ownership', () => {
  localStorage.setItem('a', JSON.stringify({ name: ['A-history'] }))
  const { fields, options, history } = scopedHistory(['Original suggestion'])
  history.handleFocus('name')
  // Metadata refreshes may keep the runtime history array from the prior field.
  fields.value = [{ ...fields.value[0], label: 'Renamed' }]
  options.storageKey = 'b'
  expect(fields.value[0].hisList).toEqual(['Original suggestion'])
  fields.value = [{ prop: 'name', type: 'input', hisList: ['New suggestion'] }]
  options.storageKey = 'c'
  expect(fields.value[0].hisList).toEqual(['New suggestion'])
  fields.value = []
  fields.value = [{ prop: 'name', type: 'input', hisList: [] }]
  options.storageKey = 'd'
  expect(fields.value[0].hisList).toEqual([])
})

test('an explicitly cleared scope stays empty when revisited while a new scope keeps defaults', () => {
  const { fields, options, history } = scopedHistory(['Suggestion'])
  history.clearAllHistory('name')
  options.storageKey = 'b'
  expect(fields.value[0].hisList).toEqual(['Suggestion'])
  options.storageKey = 'a'
  expect(fields.value[0].hisList).toEqual([])
  options.storageKey = 'b'
  history.deleteHistoryItem('name', 0)
  options.storageKey = 'a'
  options.storageKey = 'b'
  expect(fields.value[0].hisList).toEqual([])
})
