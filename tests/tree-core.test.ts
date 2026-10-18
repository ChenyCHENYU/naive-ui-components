import { describe, expect, test } from 'bun:test'
import { useTreeOperations } from '../src/components/C_Tree/composables/useTreeOperations'
import {
  collectExpandableKeys,
  findTreeNode,
  indexTreeNodes,
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

import { reactive, nextTick, effectScope } from 'vue'

describe('C_Tree controlled state and traversal scale', () => {
  test('custom child access and very wide trees avoid argument-stack limits', () => {
    const leaves = Array.from({ length: 150_000 }, (_, id) => ({
      uid: id,
      title: `Node ${id}`,
    }))
    const data = [{ uid: 'root', title: 'Root', nodes: leaves }]
    const index = indexTreeNodes(data, 'uid', 'unused', node => node.nodes)
    expect(index.nodes.size).toBe(150_001)
    expect(index.expandableKeys).toEqual(['root'])
    expect(index.nodes.get(149_999)?.title).toBe('Node 149999')
  })

  test('missing keys are skipped without dropping keyed descendants or changing input', () => {
    interface BusinessNode {
      id?: number
      name: string
      children?: BusinessNode[]
    }
    const source: BusinessNode[] = [
      { name: 'No key', children: [{ id: 0, name: 'First' }] },
      { id: 0, name: 'Duplicate' },
    ]
    const before = JSON.stringify(source)
    const indexed = indexTreeNodes(source, 'id', 'children')
    expect(indexed.nodes.size).toBe(1)
    expect(indexed.nodes.get(0)).toBe(source[0].children![0])
    expect(indexed.expandableKeys).toEqual([])
    expect(JSON.stringify(source)).toBe(before)
  })

  test('deep input remains iterative and duplicate identity retains the first node', () => {
    const root: TreeNodeData = { id: 0, name: 'Root' }
    let cursor = root
    for (let id = 1; id <= 20_000; id++) {
      const child = { id, name: String(id) }
      cursor.children = [child]
      cursor = child
    }
    const index = indexTreeNodes(
      [root, { id: 0, name: 'Duplicate' }],
      'id',
      'children'
    )
    expect(index.nodes.get(0)).toBe(root)
    expect(index.nodes.get(20_000)).toBe(cursor)
    expect(index.expandableKeys).toHaveLength(20_000)
  })

  test('controlled keys propose changes without overwriting external state', () => {
    const props = reactive({
      data: [{ id: 0, name: 'Zero' }],
      selectedKeys: [0],
      checkedKeys: [0],
      expandedKeys: [] as number[],
    })
    const events: Array<[string, unknown[]]> = []
    const tree = useTreeOperations(props, (name, ...args) => {
      events.push([name, args])
    })
    tree.expose.clearSelection()
    tree.expose.clearChecked()
    expect(tree.selectedKeys.value).toEqual([0])
    expect(tree.checkedKeys.value).toEqual([0])
    expect(events.map(([name]) => name)).toEqual([
      'update:selectedKeys',
      'node-select',
      'update:checkedKeys',
    ])
    props.selectedKeys = []
    expect(tree.selectedKeys.value).toEqual([])
    expect(tree.expose.getSelectedNode()).toBeNull()
  })

  test('defaults remain initial unless native watchProps explicitly asks to watch them', async () => {
    const scope = effectScope()
    const props = reactive({
      data: [
        { id: 0, name: 'Zero' },
        { id: 1, name: 'One' },
      ],
      defaultSelectedKeys: [0],
      treeProps: {} as import('../src/components/C_Tree/types').TreeNativeProps,
    })
    const tree = scope.run(() => useTreeOperations(props, () => {}))!
    props.defaultSelectedKeys = [1]
    await nextTick()
    expect(tree.selectedKeys.value).toEqual([0])
    props.treeProps = { watchProps: ['defaultSelectedKeys'] }
    props.defaultSelectedKeys = []
    await nextTick()
    expect(tree.selectedKeys.value).toEqual([])
    scope.stop()
  })
})
