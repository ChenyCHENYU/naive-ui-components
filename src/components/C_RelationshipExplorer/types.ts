import type { ComponentLocale } from '../../core/contracts'

export type RelationshipKey = string | number

export interface RelationshipNode {
  key: RelationshipKey
  label: string
  type?: string
  subtitle?: string
}

export interface RelationshipEdge {
  key: RelationshipKey
  from: RelationshipKey
  to: RelationshipKey
  label?: string
  type?: string
}

export interface RelationshipExplorerProps<
  T extends RelationshipNode = RelationshipNode,
> {
  nodes: readonly T[]
  edges: readonly RelationshipEdge[]
  modelValue?: NoInfer<T['key']> | null
  traceFrom?: NoInfer<T['key']> | null
  edgeTypes?: readonly string[]
  expandable?: boolean
  loading?: boolean
  locale?: ComponentLocale
}

export interface RelationshipNeighbor<T extends RelationshipNode> {
  node: T
  edge: RelationshipEdge
  traced: boolean
}
