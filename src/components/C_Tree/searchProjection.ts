import type { TreeKey } from './types'

export interface TreeProjection<T extends object> {
  data: readonly T[]
  partialKeys: Set<TreeKey>
  projected: boolean
}

const validNode = (value: unknown): value is object =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/** 远程数据的身份边界；拒绝无效键，不把 0 当成缺失值。 */
export function treeSearchKey(node: object, field: string): TreeKey {
  const key: unknown = Reflect.get(node, field)
  if (
    typeof key !== 'string' &&
    !(typeof key === 'number' && Number.isFinite(key))
  )
    throw new TypeError(
      'Tree search nodes require a string or finite numeric key'
    )
  return key
}

/** 先完整验证路径，再交给隔离投影；父项身份冲突不能悄悄重挂节点。 */
export function validateTreePaths<T extends object>(
  paths: readonly (readonly T[])[],
  keyField: string,
  limit: number
): void {
  if (!Array.isArray(paths) || paths.length > limit)
    throw new TypeError(
      'Tree search returned an invalid or oversized path list'
    )
  const parents = new Map<TreeKey, TreeKey | null>()
  const targets = new Set<TreeKey>()
  for (const path of paths) {
    const target = validatePath(path, keyField, parents)
    if (targets.has(target)) throw new TypeError('Duplicate tree search match')
    targets.add(target)
  }
}

function validatePath<T extends object>(
  path: readonly T[],
  keyField: string,
  parents: Map<TreeKey, TreeKey | null>
): TreeKey {
  if (!Array.isArray(path) || !path.length || path.length > 256)
    throw new TypeError('Tree search paths must contain 1 to 256 nodes')
  const visited = new Set<TreeKey>()
  let parent: TreeKey | null = null
  for (const node of path) {
    if (!validNode(node)) throw new TypeError('Invalid tree search node')
    const key = treeSearchKey(node, keyField)
    if (visited.has(key))
      throw new TypeError('A tree search path contains a cycle')
    if (parents.has(key) && parents.get(key) !== parent)
      throw new TypeError('A tree search node has conflicting parents')
    parents.set(key, parent)
    visited.add(key)
    parent = key
  }
  return parent!
}

/** 搜索只补入路径，完整加载只替换对应分支；永不修改传入的节点或数组。 */
export function projectTreePaths<T extends object>(
  data: readonly T[],
  paths: readonly (readonly T[])[],
  branches: ReadonlyMap<TreeKey, readonly T[]>,
  fields: { key: string; children: string; getChildren?: (node: T) => unknown }
): TreeProjection<T> {
  if (!paths.length && !branches.size)
    return { data, partialKeys: new Set(), projected: false }
  if (['__proto__', 'prototype', 'constructor'].includes(fields.children))
    throw new TypeError('Invalid tree children field')
  const nodes = new Map<TreeKey, T>()
  const parents = new Map<TreeKey, TreeKey | null>()
  const children = new Map<TreeKey, TreeKey[]>()
  const roots: TreeKey[] = []
  const partialKeys = new Set<TreeKey>()
  const getChildren = (node: T) =>
    fields.getChildren
      ? fields.getChildren(node)
      : Reflect.get(node, fields.children)
  const copy = (node: T, key: TreeKey, parent: TreeKey | null) => {
    if (parents.has(key) && parents.get(key) !== parent)
      throw new TypeError('A tree search path conflicts with the loaded tree')
    parents.set(key, parent)
    nodes.set(key, { ...nodes.get(key), ...node })
  }
  const addBranch = (items: readonly T[], parent: TreeKey | null) => {
    const pending = items.map(node => ({ node, parent }))
    const seen = new WeakSet<T>()
    const seenKeys = new Set<TreeKey>()
    for (let index = 0; index < pending.length; index++) {
      const entry = pending[index]
      const { node } = entry
      if (!validNode(node) || seen.has(node))
        throw new TypeError('Invalid or circular tree branch')
      seen.add(node)
      const key = treeSearchKey(node, fields.key)
      if (seenKeys.has(key)) throw new TypeError('Duplicate tree branch key')
      seenKeys.add(key)
      copy(node, key, entry.parent)
      const nested = getChildren(node)
      if (Array.isArray(nested)) {
        children.set(
          key,
          nested.map(child => treeSearchKey(child, fields.key))
        )
        for (const child of nested)
          pending.push({ node: child as T, parent: key })
      }
    }
  }
  const addPath = (path: readonly T[]) => {
    let parent: TreeKey | null = null
    for (const node of path) {
      const key = treeSearchKey(node, fields.key)
      if (!nodes.has(key)) copy(node, key, parent)
      else if (parents.get(key) !== parent)
        throw new TypeError('A tree search path conflicts with the loaded tree')
      const siblings: TreeKey[] =
        parent === null ? roots : (children.get(parent) ?? [])
      if (!siblings.includes(key)) {
        siblings.push(key)
        if (parent !== null) partialKeys.add(parent)
      }
      if (parent !== null) children.set(parent, siblings)
      parent = key
    }
  }
  const finishNode = (key: TreeKey, node: T) => {
    const childKeys = children.get(key)
    if (childKeys)
      Reflect.set(
        node,
        fields.children,
        childKeys.map(child => nodes.get(child)!)
      )
    else Reflect.deleteProperty(node, fields.children)
    if (partialKeys.has(key)) Reflect.set(node, 'isLeaf', false)
    if (branches.has(key) && childKeys?.length === 0)
      Reflect.set(node, 'isLeaf', true)
  }
  addBranch(data, null)
  for (const node of data) roots.push(treeSearchKey(node, fields.key))
  for (const path of paths) addPath(path)
  for (const [parent, items] of branches) {
    if (!nodes.has(parent)) continue
    addBranch(items, parent)
    children.set(
      parent,
      items.map(node => treeSearchKey(node, fields.key))
    )
    partialKeys.delete(parent)
  }
  for (const [key, node] of nodes) finishNode(key, node)
  return {
    data: roots.map(key => nodes.get(key)!),
    partialKeys,
    projected: true,
  }
}
