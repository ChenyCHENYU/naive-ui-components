import type { TreeKey, TreeNodeData } from './types'

type GetChildren<T extends object> = (node: T) => unknown
const isTreeKey = (value: unknown): value is TreeKey =>
  typeof value === 'string' || typeof value === 'number'
const isTreeNode = <T extends object>(value: unknown): value is T =>
  Boolean(value) && typeof value === 'object'

/** Iterative index shared by lookup and toolbar expansion; never mutates caller data. */
export function indexTreeNodes<T extends object = TreeNodeData>(
  nodes: readonly T[],
  keyField: string,
  childrenField: string,
  getChildren?: GetChildren<T>
): { nodes: Map<TreeKey, T>; expandableKeys: TreeKey[] } {
  const byKey = new Map<TreeKey, T>()
  const expandableKeys = new Set<TreeKey>()
  const visited = new WeakSet<T>()
  const pending: unknown[] = []
  const pushNodes = (items: readonly unknown[]) => {
    for (let index = items.length - 1; index >= 0; index--)
      pending.push(items[index])
  }
  pushNodes(nodes)
  while (pending.length) {
    const node = pending.pop()!
    if (!isTreeNode<T>(node) || visited.has(node)) continue
    visited.add(node)
    const key: unknown = Reflect.get(node, keyField)
    const validKey = isTreeKey(key)
    if (validKey && !byKey.has(key)) byKey.set(key, node)
    const children = getChildren
      ? getChildren(node)
      : Reflect.get(node, childrenField)
    if (Array.isArray(children) && children.length) {
      if (validKey) expandableKeys.add(key)
      pushNodes(children)
    }
  }
  return { nodes: byKey, expandableKeys: [...expandableKeys] }
}

/** Expand loaded parents only; expand-all never starts an unbounded lazy fetch. */
export function collectExpandableKeys<T extends object = TreeNodeData>(
  nodes: readonly T[],
  keyField: string,
  childrenField: string,
  getChildren?: GetChildren<T>
): TreeKey[] {
  return indexTreeNodes(nodes, keyField, childrenField, getChildren)
    .expandableKeys
}

/** Look up a node by the same identity protocol as the native tree. */
export function findTreeNode<T extends object = TreeNodeData>(
  nodes: readonly T[],
  key: TreeKey,
  keyField: string,
  childrenField: string
): T | null {
  return indexTreeNodes(nodes, keyField, childrenField).nodes.get(key) ?? null
}
