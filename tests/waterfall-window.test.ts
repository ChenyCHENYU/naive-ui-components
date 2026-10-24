import { describe, expect, test } from 'bun:test'
import {
  findWaterFallWindow,
  indexWaterFallLayout,
  type WaterFallWindowEntry,
} from '../src/components/C_WaterFall/composables/waterfallWindow'

describe('waterfall interval window', () => {
  test('uses full measured card intervals and retains original item order', () => {
    const layout = [
      {
        item: { id: 0, src: '', width: 100, height: 100 },
        columnIndex: 0,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        totalHeight: 600,
      },
      {
        item: { id: 1, src: '', width: 100, height: 100 },
        columnIndex: 1,
        x: 100,
        y: 0,
        width: 100,
        height: 100,
        totalHeight: 100,
      },
      {
        item: { id: 2, src: '', width: 100, height: 100 },
        columnIndex: 1,
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        totalHeight: 100,
      },
      {
        item: { id: 3, src: '', width: 100, height: 100 },
        columnIndex: 1,
        x: 100,
        y: 200,
        width: 100,
        height: 100,
        totalHeight: 100,
      },
    ]
    const indexed = indexWaterFallLayout(layout)
    expect(
      findWaterFallWindow(indexed.columns, 250, 350).map(entry => entry.index)
    ).toEqual([0, 3])
    expect(indexed.byId.get(3)?.index).toBe(3)
  })

  test('100,000 cards require fewer than 150 geometry reads per scroll query', () => {
    let reads = 0
    const columns: WaterFallWindowEntry[][] = Array.from(
      { length: 4 },
      () => []
    )
    for (let index = 0; index < 100_000; index++) {
      const y = Math.floor(index / 4) * 100
      columns[index % 4].push({
        index,
        get bottom() {
          reads++
          return y + 100
        },
        layout: {
          item: { id: index, src: '', width: 100, height: 100 },
          columnIndex: index % 4,
          x: (index % 4) * 100,
          get y() {
            reads++
            return y
          },
          width: 100,
          height: 100,
        },
      })
    }
    const visible = findWaterFallWindow(columns, 2_000_025, 2_000_625)
    expect(visible).toHaveLength(28)
    expect(visible[0].index).toBe(80_000)
    expect(reads).toBeLessThan(150)
  })
})
