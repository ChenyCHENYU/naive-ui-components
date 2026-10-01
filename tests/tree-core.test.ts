import { describe, expect, test } from 'bun:test'
import { useTreeOperations } from '../src/components/C_Tree/composables/useTreeOperations'
import {
  collectExpandableKeys,
  findTreeNode,
} from '../src/components/C_Tree/treeKeys'
import type { TreeNodeData } from '../src/components/C_Tree/types'

describe('C_Tree expansion and lookup', () => {
  test('default expand-all expands parents, not leaf keys', () => {
    const data: TreeNodeData[] = [
      {
        id: 0,
        name: 'Root',
        children: [{ id: 1, name: 'Leaf' }],
      },
    ]
    const tree = useTreeOperations({ data, defaultExpandAll: true }, () => {})
    expect(tree.expandedKeys.value).toEqual([0])
    expect(tree.isAllExpanded.value).toBe(true)
    tree.toggleExpandAll()
    expect(tree.expandedKeys.value).toEqual([])
    tree.toggleExpandAll()
    expect(tree.expandedKeys.value).toEqual([0])
  })

  test('tree traversal tolerates cycles and retains first-match order', () => {
    const first: TreeNodeData = { id: 0, name: 'First', children: [] }
    const second: TreeNodeData = { id: 1, name: 'Second', children: [] }
    first.children?.push(second)
    second.children?.push(first)
    expect(collectExpandableKeys([first], 'id', 'children')).toEqual([0, 1])
    expect(findTreeNode([first], 1, 'id', 'children')).toBe(second)
    expect(findTreeNode([first], 99, 'id', 'children')).toBeNull()
  })
})
