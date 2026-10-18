import type { TreeKey, TreeNodeData } from './types'

type GetChildren = (node: TreeNodeData) => unknown
const isTreeKey = (value: unknown): value is TreeKey =>
  typeof value === 'string' || typeof value === 'number'
const isTreeNode = (value: unknown): value is TreeNodeData =>
  Boolean(value) && typeof value === 'object'

/** Iterative index shared by lookup and toolbar expansion; never mutates caller data. */
export function indexTreeNodes(
  nodes: object[],
  keyField: string,
  childrenField: string,
  getChildren?: GetChildren
): { nodes: Map<TreeKey, TreeNodeData>; expandableKeys: TreeKey[] } {
  const byKey = new Map<TreeKey, TreeNodeData>()
  const expandableKeys = new Set<TreeKey>()
  const visited = new WeakSet<TreeNodeData>()
  const pending: object[] = []
  const pushNodes = (items: object[]) => {
    for (let index = items.length - 1; index >= 0; index--)
      pending.push(items[index])
  }
  pushNodes(nodes)
  while (pending.length) {
    const node = pending.pop()!
    if (!isTreeNode(node) || visited.has(node)) continue
    visited.add(node)
    const key = node[keyField]
    const validKey = isTreeKey(key)
    if (validKey && !byKey.has(key)) byKey.set(key, node)
    const children = getChildren ? getChildren(node) : node[childrenField]
    if (Array.isArray(children) && children.length) {
      if (validKey) expandableKeys.add(key)
      pushNodes(children)
    }
  }
  return { nodes: byKey, expandableKeys: [...expandableKeys] }
}

/** Expand loaded parents only; expand-all never starts an unbounded lazy fetch. */
export function collectExpandableKeys(
  nodes: object[],
  keyField: string,
  childrenField: string,
  getChildren?: GetChildren
): TreeKey[] {
  return indexTreeNodes(nodes, keyField, childrenField, getChildren)
    .expandableKeys
}

/** Look up a node by the same identity protocol as the native tree. */
export function findTreeNode(
  nodes: object[],
  key: TreeKey,
  keyField: string,
  childrenField: string
): TreeNodeData | null {
  return indexTreeNodes(nodes, keyField, childrenField).nodes.get(key) ?? null
}
