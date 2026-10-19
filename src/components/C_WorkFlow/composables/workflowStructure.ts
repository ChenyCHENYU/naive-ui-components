import type { ValidationError, WorkflowEdge, WorkflowNode } from '../types'

interface StructureOptions {
  allowCycles?: boolean
}

function structureError(
  node: WorkflowNode | undefined,
  field: string,
  message: string
): ValidationError {
  return {
    nodeId: node?.id ?? '',
    nodeName: node?.data.title ?? '流程结构',
    field,
    message,
    type: 'invalid',
    severity: 'high',
  }
}

/** 迭代遍历避免长流程递归溢出，返回一条实际循环上的节点。 */
function findCycle(adjacency: Map<string, string[]>): string | undefined {
  const visited = new Set<string>()
  const active = new Set<string>()
  for (const id of adjacency.keys()) {
    if (visited.has(id)) continue
    const stack = [{ id, offset: 0 }]
    visited.add(id)
    active.add(id)
    while (stack.length) {
      const frame = stack[stack.length - 1]
      const targets = adjacency.get(frame.id)!
      if (frame.offset >= targets.length) {
        active.delete(frame.id)
        stack.pop()
        continue
      }
      const target = targets[frame.offset++]
      if (active.has(target)) return target
      if (!visited.has(target)) {
        visited.add(target)
        active.add(target)
        stack.push({ id: target, offset: 0 })
      }
    }
  }
}

function collectNodes(nodes: WorkflowNode[], errors: ValidationError[]) {
  const index = new Map<string, WorkflowNode>()
  nodes.forEach(node => {
    if (!node.id?.trim()) {
      errors.push(structureError(node, 'nodeId', '节点 id 不能为空'))
    } else if (index.has(node.id)) {
      errors.push(
        structureError(
          node,
          'nodeId',
          `节点 id「${node.id}」重复，请使用唯一标识`
        )
      )
    } else {
      index.set(node.id, node)
    }
  })
  return index
}

function collectConnections(
  nodes: Map<string, WorkflowNode>,
  edges: WorkflowEdge[],
  errors: ValidationError[]
) {
  const adjacency = new Map([...nodes.keys()].map(id => [id, [] as string[]]))
  const edgeIds = new Set<string>()
  edges.forEach(edge => {
    const source = nodes.get(edge.source)
    const target = nodes.get(edge.target)
    if (!edge.id?.trim() || edgeIds.has(edge.id)) {
      errors.push(
        structureError(source ?? target, 'edgeId', '连线 id 不能为空或重复')
      )
    }
    edgeIds.add(edge.id)
    if (!source || !target) {
      const missing = [!source && edge.source, !target && edge.target]
        .filter(value => value !== false)
        .map(value => value || '空标识')
      errors.push(
        structureError(
          source ?? target,
          'connection',
          `连线「${edge.id}」指向不存在的节点：${missing.join('、')}`
        )
      )
      return
    }
    adjacency.get(source.id)!.push(target.id)
  })
  return adjacency
}

function validateReachability(
  start: WorkflowNode,
  nodes: Map<string, WorkflowNode>,
  adjacency: Map<string, string[]>,
  errors: ValidationError[]
) {
  const reachable = new Set([start.id])
  const queue = [start.id]
  for (let offset = 0; offset < queue.length; offset++) {
    adjacency.get(queue[offset])?.forEach(target => {
      if (reachable.has(target)) return
      reachable.add(target)
      queue.push(target)
    })
  }
  nodes.forEach(node => {
    if (!reachable.has(node.id)) {
      errors.push(
        structureError(
          node,
          'connection',
          '此节点无法从开始节点到达，请检查连线方向与流程连接'
        )
      )
    }
  })
}

/** 只校验图结构；循环由业务显式选择，审批执行和权限仍由业务后端负责。 */
export function validateWorkflowStructure(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  options: StructureOptions = {}
): ValidationError[] {
  const errors: ValidationError[] = []
  const index = collectNodes(nodes, errors)
  const starts = nodes.filter(node => node.type === 'start')
  if (starts.length !== 1) {
    errors.push(
      structureError(
        starts[0],
        'start',
        `流程必须包含且仅包含一个开始节点，当前为 ${starts.length} 个`
      )
    )
  }
  const adjacency = collectConnections(index, edges, errors)
  if (starts.length === 1 && index.has(starts[0].id)) {
    validateReachability(starts[0], index, adjacency, errors)
  }
  if (options.allowCycles === false) {
    const cycleNode = findCycle(adjacency)
    if (cycleNode !== undefined) {
      errors.push(
        structureError(
          index.get(cycleNode),
          'cycle',
          '当前审批流程不允许循环，请移除回指连线或由业务启用循环策略'
        )
      )
    }
  }
  return errors
}
