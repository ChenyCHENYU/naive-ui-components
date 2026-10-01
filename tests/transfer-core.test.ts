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
})
