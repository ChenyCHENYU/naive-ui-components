import type { BPMNDiagramData, BPMNNode } from './types'

/** X6's flat cells are an implementation detail of the BPMN layout. */
export interface BpmnCell {
  id: string
  shape: 'event' | 'activity' | 'gateway' | 'bpmn-edge'
  x: number
  y: number
  width?: number
  height?: number
  label?: string
  source?: string
  target?: string
  data?: Record<string, unknown>
}

const nodeShape = (type: BPMNNode['type']): BpmnCell['shape'] => {
  if (type === 'task') return 'activity'
  if (type === 'gateway') return 'gateway'
  return 'event'
}

const nodeType = (cell: BpmnCell): BPMNNode['type'] => {
  const type = cell.data?.type
  if (
    type === 'start' ||
    type === 'end' ||
    type === 'task' ||
    type === 'gateway' ||
    type === 'event'
  ) {
    return type
  }
  if (cell.shape === 'activity') return 'task'
  if (cell.shape === 'gateway') return 'gateway'
  return 'event'
}

export const toBpmnCells = (data: BPMNDiagramData): BpmnCell[] => [
  ...data.nodes.map(node => {
    const shape = nodeShape(node.type)
    return {
      id: node.id,
      shape,
      x: node.position.x,
      y: node.position.y,
      width: shape === 'activity' ? 120 : shape === 'gateway' ? 40 : 50,
      height: shape === 'activity' ? 60 : shape === 'gateway' ? 40 : 50,
      label: node.name,
      data: { ...node.properties, type: node.type },
    }
  }),
  ...data.flows.map(flow => ({
    id: flow.id,
    shape: 'bpmn-edge' as const,
    source: flow.source,
    target: flow.target,
    label: flow.name,
    x: 0,
    y: 0,
    data: flow.condition ? { condition: flow.condition } : undefined,
  })),
]

export const fromBpmnCells = (cells: BpmnCell[]): BPMNDiagramData => ({
  nodes: cells
    .filter(cell => cell.shape !== 'bpmn-edge')
    .map(cell => {
      const properties = { ...cell.data }
      delete properties.type
      return {
        id: cell.id,
        type: nodeType(cell),
        name: cell.label ?? '',
        position: { x: cell.x, y: cell.y },
        properties,
      }
    }),
  flows: cells
    .filter(cell => cell.shape === 'bpmn-edge')
    .map(cell => ({
      id: cell.id,
      source: cell.source ?? '',
      target: cell.target ?? '',
      name: cell.label,
      condition:
        typeof cell.data?.condition === 'string'
          ? cell.data.condition
          : undefined,
    })),
})
