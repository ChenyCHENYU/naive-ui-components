import { describe, expect, test } from 'bun:test'
import {
  allMovableChecked,
  movableKeys,
} from '../src/components/C_Transfer/transferSelection'

describe('C_Transfer action selection', () => {
  test('ignores stale and disabled keys when moving', () => {
    const items = [
      { key: 0, label: 'Zero' },
      { key: 1, label: 'Disabled', disabled: true },
    ]
    const checked = new Set<string | number>([0, 1, 99])
    expect(movableKeys(items, checked)).toEqual([0])
    expect(allMovableChecked(items, checked)).toBe(true)
    expect(
      allMovableChecked(
        [{ key: 1, label: 'Disabled', disabled: true }],
        checked
      )
    ).toBe(false)
  })

  test('empty selection avoids scanning and an unchecked enabled item ends the all-checked probe', () => {
    let reads = 0
    const items = [
      { key: 0, label: 'First' },
      {
        key: 1,
        label: 'Later',
        get disabled() {
          reads++
          return false
        },
      },
    ]
    expect(movableKeys(items, new Set())).toEqual([])
    expect(reads).toBe(0)
    expect(allMovableChecked(items, new Set())).toBe(false)
    expect(reads).toBe(0)
    expect(allMovableChecked(items, new Set([0, 1]))).toBe(true)
    expect(reads).toBe(1)
  })
})
