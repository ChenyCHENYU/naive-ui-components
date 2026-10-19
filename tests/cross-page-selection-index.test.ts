import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref } from 'vue'
import { useCrossPageSelection } from '../src/components/C_Table/composables/useCrossPageSelection'

describe('cross-page selection row index', () => {
  test('indexes a dataset once when selecting many keys programmatically', () => {
    const scope = effectScope()
    let reads = 0
    const data = ref(Array.from({ length: 10_000 }, (_, id) => ({ id })))
    const selection = scope.run(() =>
      useCrossPageSelection({
        allData: data,
        rowKey: row => {
          reads++
          return row.id
        },
        config: { enabled: true },
      })
    )!
    expect(reads).toBe(0)
    for (let key = 9_900; key < 10_000; key++) {
      expect(selection.select(key)).toBe(true)
    }
    // One full index pass, then one cache-write key lookup per selected row.
    expect(reads).toBe(10_100)
    expect(selection.getSelectedRows().map(row => row.id)).toEqual(
      Array.from({ length: 100 }, (_, index) => 9_900 + index)
    )
    scope.stop()
  })

  test('invalidates the index when data, tree children or reactive keys change', async () => {
    const scope = effectScope()
    interface Row {
      id: number
      children?: Row[]
    }
    const data = ref<Row[]>([{ id: 1, children: [{ id: 2 }] }])
    const selection = scope.run(() =>
      useCrossPageSelection({
        allData: data,
        rowKey: row => row.id,
        childrenKey: 'children',
        config: { enabled: true },
      })
    )!
    expect(selection.select(2)).toBe(true)
    data.value[0].children!.push({ id: 3 })
    expect(selection.select(3)).toBe(true)
    data.value[0].children![1].id = 4
    expect(selection.select(4)).toBe(true)
    expect(selection.select(3)).toBe(true)
    // Existing selections retain their key until the data-owner reconciliation.
    selection.clearAll()
    expect(selection.select(3)).toBe(false)
    expect(selection.select(4)).toBe(true)
    data.value = [{ id: 5 }]
    await nextTick()
    expect(selection.select(4)).toBe(false)
    expect(selection.select(5)).toBe(true)
    expect(selection.getSelectedRows()).toEqual([{ id: 5 }])
    scope.stop()
  })

  test('evaluates checkability at selection time and preserves duplicate-key fallback', () => {
    const scope = effectScope()
    const enabled = ref(false)
    const data = ref([
      { id: 1, available: true },
      { id: 2, available: false },
      { id: 2, available: true },
    ])
    const selection = scope.run(() =>
      useCrossPageSelection({
        allData: data,
        rowKey: row => row.id,
        rowCheckable: row => enabled.value && row.available,
        config: { enabled: true, maxSelection: 1 },
      })
    )!
    expect(selection.select(1)).toBe(false)
    enabled.value = true
    expect(selection.select(2)).toBe(true)
    expect(selection.getSelectedRows()).toEqual([data.value[2]])
    expect(selection.select(1)).toBe(false)
    selection.unselect(2)
    data.value[1].available = true
    expect(selection.select(2)).toBe(true)
    expect(selection.getSelectedRows()).toEqual([data.value[1]])
    selection.clearAll()
    expect(selection.select(1)).toBe(true)
    scope.stop()
  })

  test('never builds an index while cross-page selection is disabled', async () => {
    const scope = effectScope()
    let reads = 0
    const data = ref([{ id: 1 }])
    const selection = scope.run(() =>
      useCrossPageSelection({
        allData: data,
        rowKey: row => {
          reads++
          return row.id
        },
        config: { enabled: false },
      })
    )!
    expect(selection.select(1)).toBe(false)
    data.value = [{ id: 2 }]
    await nextTick()
    expect(selection.select(2)).toBe(false)
    expect(reads).toBe(0)
    scope.stop()
  })
})
