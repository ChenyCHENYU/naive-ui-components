import type { TreeNodeData } from './types'

type TreeKey = string | number

/** Collect only expandable nodes, tolerating malformed cyclic input. */
export function collectExpandableKeys(
  nodes: TreeNodeData[],
  keyField: string,
  childrenField: string
): TreeKey[] {
  const keys = new Set<TreeKey>()
  const visited = new WeakSet<TreeNodeData>()
  const pending = [...nodes].reverse()
  while (pending.length) {
    const node = pending.pop()!
    if (visited.has(node)) continue
    visited.add(node)
    const children = node[childrenField] as TreeNodeData[] | undefined
    if (!Array.isArray(children) || children.length === 0) continue
    const key = node[keyField]
    if (typeof key === 'string' || typeof key === 'number') keys.add(key)
    pending.push(...children.slice().reverse())
  }
  return [...keys]
}

/** Find the first matching node without recursive stack growth. */
export function findTreeNode(
  nodes: TreeNodeData[],
  key: TreeKey,
  keyField: string,
  childrenField: string
): TreeNodeData | null {
  const visited = new WeakSet<TreeNodeData>()
  const pending = [...nodes].reverse()
  while (pending.length) {
    const node = pending.pop()!
    if (visited.has(node)) continue
    visited.add(node)
    if (node[keyField] === key) return node
    const children = node[childrenField] as TreeNodeData[] | undefined
    if (Array.isArray(children)) pending.push(...children.slice().reverse())
  }
  return null
}
