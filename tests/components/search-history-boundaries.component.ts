import { expect, test } from 'vitest'
import { ref } from 'vue'
import { useSearchHistory } from '../../src/components/C_FormSearch/composables/useSearchHistory'
import type { SearchFormItem } from '../../src/components/C_FormSearch/types'

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
