import type {
  Condition,
  ValidationError,
  WorkflowEdge,
  WorkflowNode,
} from '../types'

/** 目标、优先级或默认分支声明启用绑定检查；历史描述条件不被改写。 */
export function hasBoundBranches(node: WorkflowNode): boolean {
  return (
    node.type === 'condition' &&
    Boolean(
      node.data.conditions?.some(
        condition =>
          condition.targetNodeId !== undefined ||
          condition.isDefault === true ||
          condition.priority !== undefined
      )
    )
  )
}

function branchError(
  node: WorkflowNode,
  message: string,
  warning = false
): ValidationError {
  return {
    nodeId: node.id,
    nodeName: node.data.title,
    field: 'conditions',
    message,
    type: warning ? 'warning' : 'invalid',
    severity: warning ? 'low' : 'high',
  }
}

function validateConditionOrder(
  node: WorkflowNode<'condition'>
): ValidationError[] {
  const errors: ValidationError[] = []
  const ids = new Set<string>()
  const priorities = new Set<number>()
  let defaults = 0
  for (const condition of node.data.conditions ?? []) {
    if (ids.has(condition.id))
      errors.push(branchError(node, `分支标识「${condition.id}」重复`))
    ids.add(condition.id)
    if (condition.isDefault) defaults++
    if (condition.priority === undefined) continue
    if (
      !Number.isSafeInteger(condition.priority) ||
      condition.priority < 0 ||
      priorities.has(condition.priority)
    )
      errors.push(branchError(node, '分支优先级必须是互不重复的非负整数'))
    priorities.add(condition.priority)
  }
  if (defaults > 1)
    errors.push(branchError(node, '条件节点最多只能配置一个默认分支'))
  return errors
}

function validateBoundTarget(
  node: WorkflowNode<'condition'>,
  condition: Condition,
  index: Map<string, WorkflowNode>,
  outgoing: WorkflowEdge[],
  targets: Set<string>
): ValidationError[] {
  const target = condition.targetNodeId && index.get(condition.targetNodeId)
  if (!target || target.id === node.id || target.type === 'start')
    return [
      branchError(node, `分支「${condition.name}」需要指定有效的下游节点`),
    ]
  const errors: ValidationError[] = []
  if (targets.has(target.id))
    errors.push(
      branchError(node, `多个分支绑定了同一目标「${target.data.title}」`)
    )
  targets.add(target.id)
  if (!outgoing.some(edge => edge.target === target.id))
    errors.push(
      branchError(
        node,
        `分支「${condition.name}」尚未连接到「${target.data.title}」`
      )
    )
  return errors
}

function validateNodeBranches(
  node: WorkflowNode<'condition'>,
  index: Map<string, WorkflowNode>,
  outgoing: WorkflowEdge[]
): ValidationError[] {
  if (!hasBoundBranches(node))
    return outgoing.length > 1
      ? [
          branchError(
            node,
            '历史条件尚未绑定分支目标；多条出边仅作结构展示，请补全绑定后再接入执行',
            true
          ),
        ]
      : []
  const errors = validateConditionOrder(node)
  const targets = new Set<string>()
  for (const condition of node.data.conditions ?? [])
    errors.push(
      ...validateBoundTarget(node, condition, index, outgoing, targets)
    )
  if (outgoing.some(edge => !targets.has(edge.target)))
    errors.push(
      branchError(node, '条件节点存在未绑定条件的出边，请补齐分支配置')
    )
  return errors
}

/** 旧条件保留为兼容提示，显式绑定的条件与每条实际出边一一核对。 */
export function validateWorkflowBranches(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationError[] {
  const index = new Map(nodes.map(node => [node.id, node]))
  const edgesBySource = new Map<string, WorkflowEdge[]>()
  for (const edge of edges) {
    const list = edgesBySource.get(edge.source) ?? []
    list.push(edge)
    edgesBySource.set(edge.source, list)
  }
  return nodes.flatMap(node =>
    node.type === 'condition'
      ? validateNodeBranches(node, index, edgesBySource.get(node.id) ?? [])
      : []
  )
}

function buildAdjacency(edges: WorkflowEdge[]) {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    const next = adjacency.get(edge.source) ?? []
    next.push(edge.target)
    adjacency.set(edge.source, next)
  }
  return adjacency
}

function hasRoute(edges: WorkflowEdge[], start: string, target: string) {
  const adjacency = buildAdjacency(edges)
  const visited = new Set<string>()
  const pending = [start]
  for (let offset = 0; offset < pending.length; offset++) {
    const id = pending[offset]
    if (id === target) return true
    if (visited.has(id)) continue
    visited.add(id)
    pending.push(...(adjacency.get(id) ?? []))
  }
  return false
}

/** 连接只做图约束；条件含义、审批执行与权限由业务适配器负责。 */
export function isWorkflowConnectionAllowed(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  connection: { source: string; target: string },
  allowCycles = true,
  excludingEdgeId?: string
): boolean {
  const target = nodes.find(node => node.id === connection.target)
  if (
    !target ||
    target.type === 'start' ||
    connection.source === connection.target ||
    !nodes.some(node => node.id === connection.source)
  )
    return false
  const active = edges.filter(edge => edge.id !== excludingEdgeId)
  if (
    active.some(
      edge =>
        edge.source === connection.source && edge.target === connection.target
    )
  )
    return false
  if (allowCycles) return true
  return !hasRoute(active, connection.target, connection.source)
}

/** 重连同一分支时保留规则，只改变它指向的目标，不重新排列条件。 */
export function retargetWorkflowBranch(
  node: WorkflowNode | undefined,
  from: string,
  to: string
): void {
  if (node?.type !== 'condition' || !hasBoundBranches(node)) return
  node.data.conditions = node.data.conditions?.map((condition: Condition) =>
    condition.targetNodeId === from
      ? { ...condition, targetNodeId: to }
      : condition
  )
}
