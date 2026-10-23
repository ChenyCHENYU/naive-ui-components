import { cloneData } from '../../../utils/data'
import type { WorkflowEdge, WorkflowNode } from '../types'

const nodeFields = [
  'id',
  'type',
  'position',
  'data',
  'selected',
  'dragging',
  'connectable',
  'selectable',
  'deletable',
  'dragHandle',
  'width',
  'height',
  'parentNode',
  'zIndex',
  'extent',
  'expandParent',
] as const satisfies readonly (keyof WorkflowNode)[]

const edgeFields = [
  'id',
  'source',
  'target',
  'sourceHandle',
  'targetHandle',
  'type',
  'animated',
  'hidden',
  'deletable',
  'selectable',
  'data',
  'style',
  'label',
  'labelStyle',
  'labelShowBg',
  'labelBgStyle',
  'labelBgPadding',
  'labelBgBorderRadius',
  'markerStart',
  'markerEnd',
] as const satisfies readonly (keyof WorkflowEdge)[]

/** Capture field presence before Vue Flow adds its runtime defaults. */
export function getWorkflowFields<T extends { id: string }>(
  items: readonly T[]
) {
  return new Map(items.map(item => [item.id, new Set(Object.keys(item))]))
}

function pickFields<T extends object>(
  item: T,
  fields: readonly (keyof T)[],
  declared?: ReadonlySet<string>
): Partial<T> {
  return Object.fromEntries(
    fields
      .filter(key => declared?.has(String(key)))
      .map(key => [key, item[key]])
  ) as Partial<T>
}

/** Project before cloning: SDK graph references can contain a whole canvas. */
export function snapshotWorkflowNode(
  node: WorkflowNode,
  declared?: ReadonlySet<string>
): WorkflowNode {
  const result = {
    ...pickFields(node, nodeFields, declared),
    id: node.id,
    type: node.type,
    position: { x: node.position.x, y: node.position.y },
    data: node.data,
  }
  return cloneData(result) as WorkflowNode
}

/** Keep explicit empty values, but do not persist defaults injected by the SDK. */
export function snapshotWorkflowEdge(
  edge: WorkflowEdge,
  declared?: ReadonlySet<string>
): WorkflowEdge {
  return cloneData({
    ...pickFields(edge, edgeFields, declared),
    id: edge.id,
    source: edge.source,
    target: edge.target,
  })
}

/** Deleted SDK elements must not leave configuration metadata behind. */
export function pruneWorkflowFields(
  items: readonly { id: string }[],
  fields: Map<string, Set<string>>
) {
  const ids = new Set(items.map(item => item.id))
  for (const id of fields.keys()) {
    if (!ids.has(id)) fields.delete(id)
  }
}
