import type {
  RelationshipEdge,
  RelationshipKey,
  RelationshipNode,
} from './types'

/** Build directional indexes from the currently loaded nodes and visible edges. */
export function indexRelationships<T extends RelationshipNode>(
  nodes: readonly T[],
  edges: readonly RelationshipEdge[],
  edgeTypes?: readonly string[]
) {
  const nodeByKey = new Map(nodes.map(node => [node.key, node]))
  const incoming = new Map<RelationshipKey, RelationshipEdge[]>()
  const outgoing = new Map<RelationshipKey, RelationshipEdge[]>()
  const allowed = edgeTypes && new Set(edgeTypes)
  const seen = new Set<RelationshipKey>()
  const append = (
    index: Map<RelationshipKey, RelationshipEdge[]>,
    key: RelationshipKey,
    edge: RelationshipEdge
  ) => {
    const entries = index.get(key)
    if (entries) entries.push(edge)
    else index.set(key, [edge])
  }
  for (const edge of edges) {
    if (
      !nodeByKey.has(edge.from) ||
      !nodeByKey.has(edge.to) ||
      seen.has(edge.key)
    )
      continue
    if (allowed && (edge.type === undefined || !allowed.has(edge.type)))
      continue
    seen.add(edge.key)
    append(outgoing, edge.from, edge)
    append(incoming, edge.to, edge)
  }
  return { nodeByKey, incoming, outgoing }
}

/** Returns the shortest visible directed path. A visited index bounds traversals of cycles. */
export function traceRelationshipPath(
  outgoing: ReadonlyMap<RelationshipKey, readonly RelationshipEdge[]>,
  from: RelationshipKey,
  to: RelationshipKey
): RelationshipEdge[] | undefined {
  const cameFrom = new Map<RelationshipKey, RelationshipEdge | undefined>([
    [from, undefined],
  ])
  const queue = [from]
  for (let index = 0; index < queue.length && !cameFrom.has(to); index++) {
    for (const edge of outgoing.get(queue[index]) ?? []) {
      if (cameFrom.has(edge.to)) continue
      cameFrom.set(edge.to, edge)
      queue.push(edge.to)
    }
  }
  if (!cameFrom.has(to)) return undefined
  const path: RelationshipEdge[] = []
  for (let edge = cameFrom.get(to); edge; edge = cameFrom.get(edge.from))
    path.push(edge)
  return path.reverse()
}
