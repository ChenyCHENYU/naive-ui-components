import { describe, expect, test } from 'bun:test'
import { flattenTableRows } from '../src/components/C_Table/helpers'

interface Row {
  id: number
  children?: unknown[]
}

describe('table row traversal', () => {
  test('preserves source identity and does not read rows without tree mode', () => {
    let reads = 0
    const source = new Proxy([{ id: 1 }], {
      get(target, property, receiver) {
        if (property === '0') reads++
        return Reflect.get(target, property, receiver)
      },
    })
    expect(flattenTableRows(source)).toBe(source)
    expect(reads).toBe(0)
  })

  test('keeps depth-first order and identities while ignoring shared/cyclic children', () => {
    const leaf: Row = { id: 3 }
    const branch: Row = { id: 2, children: [leaf] }
    const root: Row = {
      id: 1,
      children: [branch, null, false, 'invalid', leaf],
    }
    leaf.children = [root]
    const second: Row = { id: 4, children: [leaf] }
    const source = [root, second]
    const result = flattenTableRows(source, 'children')
    expect(result.map(row => row.id)).toEqual([1, 2, 3, 4])
    expect(result[0]).toBe(root)
    expect(result[1]).toBe(branch)
    expect(result[2]).toBe(leaf)
    expect(source).toEqual([root, second])
    expect(leaf.children).toEqual([root])
  })

  test('flattens deeply nested data without consuming the JavaScript call stack', () => {
    const root: Row = { id: 0 }
    let parent = root
    for (let id = 1; id < 20_000; id++) {
      const child = { id }
      parent.children = [child]
      parent = child
    }
    const result = flattenTableRows([root], 'children')
    expect(result).toHaveLength(20_000)
    expect(result[0]).toBe(root)
    expect(result.at(-1)).toBe(parent)
  })

  test('traverses broad datasets without spread-argument limits', () => {
    const children = Array.from({ length: 150_000 }, (_, id) => ({ id }))
    const root = { id: -1, children }
    const result = flattenTableRows([root], 'children')
    expect(result).toHaveLength(150_001)
    expect(result[1]).toBe(children[0])
    expect(result.at(-1)).toBe(children.at(-1))
  })
})
