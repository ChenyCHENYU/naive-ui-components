import { describe, expect, test } from 'bun:test'
import { effectScope, nextTick, ref } from 'vue'
import { useTableExpand } from '../src/components/C_Table/composables/useTableExpand'

describe('table expansion row index', () => {
  test('resolves 10,000 expansion keys with linear row-key work and no repeated rescans', async () => {
    const scope = effectScope()
    let reads = 0
    let loads = 0
    const data = ref(Array.from({ length: 10_000 }, (_, id) => ({ id })))
    const expand = scope.run(() =>
      useTableExpand({
        data,
        rowKey: row => {
          reads++
          return row.id
        },
        onLoadData: () => {
          loads++
          return []
        },
      })
    )!
    expect(reads).toBe(0)
    const keys = data.value.map(row => row.id)
    await expand.handleExpandChange(keys)
    expect(loads).toBe(10_000)
    expect(reads).toBe(20_000)
    expect(expand.expandedKeys.value).toEqual(keys)
    await expand.handleExpandChange(keys)
    expect(reads).toBe(20_000)
    expect(loads).toBe(10_000)
    await expand.handleExpandChange(keys.slice(0, 5_000))
    expect(reads).toBe(20_000)
    expect(expand.expandedKeys.value).toEqual(keys.slice(0, 5_000))
    scope.stop()
  })

  test('updates lookups after source replacement and in-place reactive row-key changes', async () => {
    const scope = effectScope()
    const data = ref([{ id: 1, name: 'original' }])
    const loaded: { id: number; name: string }[] = []
    const expand = scope.run(() =>
      useTableExpand({
        data,
        rowKey: row => row.id,
        onLoadData: row => {
          loaded.push(row)
          return []
        },
      })
    )!
    await expand.expandRow(1)
    expect(loaded[0]).toBe(data.value[0])
    expand.collapseAll()
    expand.invalidateExpand()
    data.value[0].id = 2
    await nextTick()
    await expand.expandRow(1)
    expect(loaded).toHaveLength(1)
    await expand.expandRow(2)
    expect(loaded).toHaveLength(2)
    expect(loaded[1]).toBe(data.value[0])
    expand.collapseAll()
    expand.invalidateExpand()
    data.value = [{ id: 2, name: 'replacement' }]
    await nextTick()
    await expand.expandRow(2)
    expect(loaded).toHaveLength(3)
    expect(loaded[2]).toBe(data.value[0])
    expect(loaded[2].name).toBe('replacement')
    scope.stop()
  })

  test('preserves first-row lookup semantics for duplicate keys and strict number/string identity', async () => {
    const scope = effectScope()
    const data = ref([
      { id: 1 as string | number, name: 'first numeric' },
      { id: 1 as string | number, name: 'second numeric' },
      { id: '1' as string | number, name: 'string' },
    ])
    const loaded: string[] = []
    const expand = scope.run(() =>
      useTableExpand({
        data,
        rowKey: row => row.id,
        onLoadData: row => {
          loaded.push(row.name)
          return []
        },
      })
    )!
    await expand.handleExpandChange([1, '1'])
    expect(loaded).toEqual(['first numeric', 'string'])
    scope.stop()
  })

  test('indexes nested rows and updates after reactive child additions', async () => {
    const scope = effectScope()
    interface Row {
      id: number
      children?: Row[]
    }
    const data = ref<Row[]>([{ id: 1, children: [{ id: 2 }] }])
    const loaded: number[] = []
    const expand = scope.run(() =>
      useTableExpand({
        data,
        childrenKey: 'children',
        rowKey: row => row.id,
        onLoadData: row => {
          loaded.push(row.id)
          return []
        },
      })
    )!
    await expand.expandRow(2)
    expect(loaded).toEqual([2])
    data.value[0].children!.push({ id: 3 })
    await nextTick()
    await expand.expandRow(3)
    expect(loaded).toEqual([2, 3])
    scope.stop()
  })
})
