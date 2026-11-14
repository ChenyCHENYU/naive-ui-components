/**
 * 工作流节点管理 Composable
 * 封装节点 CRUD、provide/inject、边重连、画布操作等逻辑
 */

import {
  ref,
  computed,
  provide,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  markRaw,
  type Component,
  type Ref,
} from 'vue'
import type {
  Connection,
  EdgeUpdateEvent,
  NodeChange,
  EdgeChange,
} from '@vue-flow/core'
import { useComponentFeedback } from '../../../component-config'
import {
  hasBoundBranches,
  isWorkflowConnectionAllowed,
  retargetWorkflowBranch,
} from './workflowBranches'
import { cloneData, isDataEqual } from '../../../utils/data'
import {
  getWorkflowFields,
  pruneWorkflowFields,
  snapshotWorkflowEdge,
  snapshotWorkflowNode,
} from './workflowSnapshot'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowData,
  WorkflowProps,
  NodeType,
  MenuPosition,
  WorkflowEmits,
} from '../types'
import {
  NODE_TITLES,
  INITIAL_NODE,
  NODE_Y_GAP,
  generateEdgeId,
  generateWorkflowId,
} from '../data'

import StartNode from '../nodes/StartNode.vue'
import ApprovalNode from '../nodes/ApprovalNode.vue'
import CopyNode from '../nodes/CopyNode.vue'
import ConditionNode from '../nodes/ConditionNode.vue'

/** 节点组件映射（模块级常量，仅初始化一次） */
const NODE_COMPONENT_MAP: Record<string, Component> = {
  start: markRaw(StartNode),
  approval: markRaw(ApprovalNode),
  copy: markRaw(CopyNode),
  condition: markRaw(ConditionNode),
}

type EmitFn = <Event extends keyof WorkflowEmits>(
  event: Event,
  ...args: WorkflowEmits[Event]
) => void

function isCanvasDeleteKey(event: KeyboardEvent, readonly?: boolean): boolean {
  if (
    readonly ||
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  )
    return false
  if (event.key !== 'Backspace' && event.key !== 'Delete') return false
  return !isInputTarget(event.target)
}

function isInputTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"]'
      )
    )
  )
}

/** 工作流节点管理 —— 封装节点 CRUD、provide/inject、边重连、画布操作等逻辑 */
export function useWorkflowNodes(
  props: WorkflowProps,
  emit: EmitFn,
  vueFlowRef: Ref
) {
  const message = useComponentFeedback()

  /* ─── 响应式状态 ────────────────────────────────────────── */
  const nodes = ref<WorkflowNode[]>(
    cloneData(props.modelValue?.nodes ?? [INITIAL_NODE])
  )
  const edges = ref<WorkflowEdge[]>(cloneData(props.modelValue?.edges ?? []))
  let declaredNodeFields = getWorkflowFields(nodes.value)
  let declaredEdgeFields = getWorkflowFields(edges.value)
  const workflowConfig = ref<WorkflowData['config']>(
    props.modelValue
      ? cloneData(props.modelValue.config)
      : { version: '1.0', createdAt: new Date().toISOString() }
  )
  const showAddMenu = ref(false)
  const menuPosition = ref<MenuPosition>({ x: 0, y: 0 })
  const showNodeConfig = ref(false)
  const currentNode = ref<WorkflowNode | null>(null)
  const currentAddNodeId = ref<string | null>(null)
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>()
  let disposed = false

  const schedule = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      pendingTimers.delete(timer)
      if (!disposed) callback()
    }, delay)
    pendingTimers.add(timer)
  }

  /* ─── 计算属性 ──────────────────────────────────────────── */
  const nodeTypes = computed(() => NODE_COMPONENT_MAP)

  const workflowStats = computed(() => {
    const stats = {
      totalNodes: nodes.value.length,
      approvalNodes: 0,
      copyNodes: 0,
      conditionNodes: 0,
    }
    nodes.value.forEach(n => {
      if (n.type === 'approval') stats.approvalNodes++
      else if (n.type === 'copy') stats.copyNodes++
      else if (n.type === 'condition') stats.conditionNodes++
    })
    return stats
  })

  /* ─── 数据操作 ──────────────────────────────────────────── */
  /** 获取当前工作流完整数据 */
  const getCurrentWorkflowData = (): WorkflowData => {
    pruneWorkflowFields(nodes.value, declaredNodeFields)
    pruneWorkflowFields(edges.value, declaredEdgeFields)
    return {
      nodes: nodes.value.map(node =>
        snapshotWorkflowNode(node, declaredNodeFields.get(node.id))
      ),
      edges: edges.value.map(edge =>
        snapshotWorkflowEdge(edge, declaredEdgeFields.get(edge.id))
      ),
      ...(workflowConfig.value !== undefined && {
        config: cloneData(workflowConfig.value),
      }),
    }
  }

  const nodeIndex = computed(
    () => new Map(nodes.value.map(node => [node.id, node]))
  )
  const getNodeSnapshot = (id: string) => {
    const node = nodeIndex.value.get(id)
    return node
      ? snapshotWorkflowNode(node, declaredNodeFields.get(id))
      : undefined
  }

  /** 触发数据变更事件 */
  const emitChange = (): void => {
    const data = getCurrentWorkflowData()
    emit('update:modelValue', data)
    emit('change', data)
  }

  let pendingCanvasCommit = false
  let modelRevision = 0
  /** 仅在用户操作结束后发出快照；外部回填与 SDK 尺寸/选择变化不回写。 */
  const commitCanvasChange = (): void => {
    if (disposed || props.readonly || pendingCanvasCommit) return
    pendingCanvasCommit = true
    const revision = modelRevision
    void nextTick(() => {
      pendingCanvasCommit = false
      if (disposed || props.readonly || revision !== modelRevision) return
      emitChange()
    })
  }
  const handleCanvasChanges = (changes: NodeChange[] | EdgeChange[]): void => {
    if (changes.some(change => change.type === 'remove')) commitCanvasChange()
  }
  const createEdge = (source: string, target: string): WorkflowEdge => {
    const edge: WorkflowEdge = {
      id: generateEdgeId(source, target),
      source,
      target,
      animated: true,
      type: 'default',
    }
    declaredEdgeFields.set(edge.id, new Set(Object.keys(edge)))
    return edge
  }
  const canConnect = (
    connection: Connection,
    excludingEdgeId?: string
  ): boolean =>
    isWorkflowConnectionAllowed(
      nodes.value,
      edges.value,
      connection,
      props.allowCycles,
      excludingEdgeId
    )
  // Vue Flow 也用此回调解析已有 Edge；导入图必须交给显式校验，不能被重复边检查静默删除。
  const validateCanvasConnection = (
    connection: Connection | { id: string }
  ): boolean => 'id' in connection || canConnect(connection)
  const connectNodes = (connection: Connection): void => {
    if (props.readonly || !canConnect(connection)) return
    edges.value = [
      ...edges.value,
      {
        ...createEdge(connection.source, connection.target),
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      },
    ]
    const added = edges.value[edges.value.length - 1]
    declaredEdgeFields.get(added.id)?.add('sourceHandle')
    declaredEdgeFields.get(added.id)?.add('targetHandle')
    commitCanvasChange()
  }
  const updateConnection = ({ edge, connection }: EdgeUpdateEvent): void => {
    if (
      props.readonly ||
      !edges.value.some(item => item.id === edge.id) ||
      !canConnect(connection, edge.id)
    )
      return
    const previous = edges.value.find(item => item.id === edge.id)!
    const source = nodes.value.find(node => node.id === previous.source)
    if (
      source &&
      hasBoundBranches(source) &&
      previous.source !== connection.source
    ) {
      message.warning('请先解除原条件分支绑定，再把连线移动到其他起点')
      return
    }
    retargetWorkflowBranch(source, previous.target, connection.target)
    declaredEdgeFields.get(edge.id)?.add('sourceHandle')
    declaredEdgeFields.get(edge.id)?.add('targetHandle')
    edges.value = edges.value.map(item =>
      item.id === edge.id ? { ...item, ...connection } : item
    )
    commitCanvasChange()
  }

  /** 延迟适应画布视图 */
  const deferFitView = (
    padding: `${number}px` = '60px',
    duration = 400
  ): void => {
    nextTick(() => {
      if (disposed) return
      schedule(() => {
        vueFlowRef.value?.fitView?.({ padding, duration })
      }, 100)
    })
  }

  /* ─── 添加菜单 ──────────────────────────────────────────── */
  const handleShowAddMenu = (position: MenuPosition, nodeId?: string): void => {
    if (props.readonly) return
    menuPosition.value = {
      x: typeof position.x === 'number' ? position.x : 0,
      y: typeof position.y === 'number' ? position.y : 0,
    }
    currentAddNodeId.value = nodeId || null
    showAddMenu.value = true
  }

  const closeAddMenu = (): void => {
    showAddMenu.value = false
  }

  const canBypassNode = (
    nodeId: string,
    incoming: WorkflowEdge[],
    outgoing: WorkflowEdge[]
  ): boolean => {
    const remainingNodes = nodes.value.filter(node => node.id !== nodeId)
    const remainingEdges = edges.value.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    )
    return incoming.every(before =>
      outgoing.every(after => {
        const connection = { source: before.source, target: after.target }
        const exists = remainingEdges.some(
          edge =>
            edge.source === connection.source &&
            edge.target === connection.target
        )
        return (
          exists ||
          isWorkflowConnectionAllowed(
            remainingNodes,
            remainingEdges,
            connection,
            props.allowCycles
          )
        )
      })
    )
  }

  /* ─── 节点删除 ──────────────────────────────────────────── */
  const deleteNode = (nodeId: string): void => {
    if (props.readonly) return
    const nodeIndex = nodes.value.findIndex(n => n.id === nodeId)
    if (nodeIndex === -1) return
    if (nodes.value[nodeIndex].type === 'start') {
      message.warning('不能删除开始节点')
      return
    }

    /* 收集上下游边，用于重连 */
    const incomingEdges = edges.value.filter(
      e => e.target === nodeId && e.source !== nodeId
    )
    const outgoingEdges = edges.value.filter(
      e => e.source === nodeId && e.target !== nodeId
    )

    if (!canBypassNode(nodeId, incomingEdges, outgoingEdges)) {
      message.warning('删除后会产生无效连接，请先调整此节点的上下游连线')
      return
    }
    if (
      outgoingEdges.length > 1 &&
      incomingEdges.some(edge => {
        const source = nodes.value.find(node => node.id === edge.source)
        return source && hasBoundBranches(source)
      })
    ) {
      message.warning('此节点被条件分支引用且有多个下游，请先调整分支绑定')
      return
    }
    if (outgoingEdges.length === 1)
      for (const incoming of incomingEdges)
        retargetWorkflowBranch(
          nodes.value.find(node => node.id === incoming.source),
          nodeId,
          outgoingEdges[0].target
        )

    /* 移除节点和关联边 */
    nodes.value.splice(nodeIndex, 1)
    edges.value = edges.value.filter(
      e => e.source !== nodeId && e.target !== nodeId
    )

    /* 重连上下游 */
    incomingEdges.forEach(inEdge => {
      outgoingEdges.forEach(outEdge => {
        if (
          !edges.value.some(
            edge =>
              edge.source === inEdge.source && edge.target === outEdge.target
          )
        ) {
          const connection = createEdge(inEdge.source, outEdge.target)
          const reconnected: WorkflowEdge = {
            ...connection,
            ...snapshotWorkflowEdge(inEdge, declaredEdgeFields.get(inEdge.id)),
            id: connection.id,
            source: connection.source,
            target: connection.target,
            ...(declaredEdgeFields.get(outEdge.id)?.has('targetHandle') && {
              targetHandle: outEdge.targetHandle,
            }),
          }
          declaredEdgeFields.set(
            reconnected.id,
            new Set(Object.keys(reconnected))
          )
          edges.value.push(reconnected)
        }
      })
    })

    /* 下移后续节点位置 */
    nodes.value.forEach((node, i) => {
      if (i >= nodeIndex) node.position.y -= NODE_Y_GAP
    })

    emitChange()
    message.success('节点已删除')
    deferFitView()
  }

  /** SDK 默认键盘删除会绕过节点约束，统一复用显式删除入口。 */
  const handleCanvasKeydown = (event: KeyboardEvent): void => {
    if (!isCanvasDeleteKey(event, props.readonly)) return
    const selectedNodes = nodes.value.filter(
      node => node.selected && node.deletable !== false
    )
    const selectedEdges = new Set(
      edges.value
        .filter(
          edge =>
            'selected' in edge &&
            edge.selected === true &&
            edge.deletable !== false
        )
        .map(edge => edge.id)
    )
    if (!selectedNodes.length && !selectedEdges.size) return
    event.preventDefault()
    selectedNodes.forEach(node => deleteNode(node.id))
    if (!selectedEdges.size) return
    edges.value = edges.value.filter(edge => !selectedEdges.has(edge.id))
    commitCanvasChange()
  }

  /* ─── provide 注入给子节点组件 ───────────────────────────── */
  provide('showAddMenu', handleShowAddMenu)
  provide('deleteNode', deleteNode)

  /* ─── 节点添加（内部辅助） ───────────────────────────────── */
  const getTargetNodeInfo = () => {
    let targetNodeIndex = nodes.value.length - 1
    let targetNode = nodes.value[targetNodeIndex]

    if (currentAddNodeId.value) {
      const foundIndex = nodes.value.findIndex(
        n => n.id === currentAddNodeId.value
      )
      if (foundIndex !== -1) {
        targetNodeIndex = foundIndex
        targetNode = nodes.value[targetNodeIndex]
      }
    }
    return { targetNodeIndex, targetNode }
  }

  const createNewNode = (
    type: NodeType,
    targetNode: WorkflowNode | null
  ): WorkflowNode => {
    const base = {
      id: generateWorkflowId(type),
      position: {
        x: targetNode?.position.x ?? 150,
        y: (targetNode?.position.y ?? 130) + NODE_Y_GAP,
      },
    }
    const data = { title: NODE_TITLES[type], status: 'pending' as const }
    switch (type) {
      case 'start':
        return { ...base, type, data: { ...data, status: 'active' } }
      case 'approval':
        return {
          ...base,
          type,
          data: { ...data, approvers: [], approvalMode: 'any' },
        }
      case 'copy':
        return { ...base, type, data: { ...data, copyUsers: [] } }
      case 'condition':
        return { ...base, type, data: { ...data, conditions: [] } }
    }
  }

  /** 将新节点插入到 targetNode 之后，重连所有边 */
  const reconnectEdges = (
    targetNode: WorkflowNode,
    newNode: WorkflowNode
  ): void => {
    const outgoing = edges.value.filter(e => e.source === targetNode.id)
    edges.value = edges.value.filter(e => e.source !== targetNode.id)

    /* 原节点 → 新节点 */
    edges.value.push(createEdge(targetNode.id, newNode.id))

    /* 新节点 → 原下游 */
    outgoing.forEach(edge => {
      edges.value.push({ ...edge, source: newNode.id, sourceHandle: null })
    })
  }

  /* ─── 节点添加（公开） ───────────────────────────────────── */
  const addNode = (type: NodeType): void => {
    if (props.readonly) return
    try {
      const { targetNodeIndex, targetNode } = getTargetNodeInfo()
      if (props.allowedNodeTypes && !props.allowedNodeTypes.includes(type))
        return
      if (targetNode && hasBoundBranches(targetNode)) {
        message.warning(
          '条件分支已绑定目标，请在具体下游节点添加，避免合并分支'
        )
        return
      }
      const newNode = createNewNode(type, targetNode)
      declaredNodeFields.set(newNode.id, new Set(Object.keys(newNode)))

      nodes.value.splice(targetNodeIndex + 1, 0, newNode)

      /* 下推后续节点 */
      for (let i = targetNodeIndex + 2; i < nodes.value.length; i++) {
        nodes.value[i].position.y += NODE_Y_GAP
      }

      if (targetNode) reconnectEdges(targetNode, newNode)

      showAddMenu.value = false
      currentAddNodeId.value = null
      emitChange()
      deferFitView()
    } catch (error) {
      message.error('添加节点失败，请重试', error)
    }
  }

  /* ─── 节点交互 ──────────────────────────────────────────── */
  const onNodeClick = (event: { node: { id: string } }): void => {
    const node = nodes.value.find(item => item.id === event.node.id)
    if (!node) return
    if (!props.readonly) {
      currentNode.value = node
      showNodeConfig.value = true
    }
    emit(
      'node-click',
      snapshotWorkflowNode(node, declaredNodeFields.get(node.id))
    )
  }

  const handleConfigSave = (configData: Record<string, unknown>): void => {
    if (
      props.readonly ||
      !currentNode.value ||
      !nodes.value.includes(currentNode.value)
    )
      return

    const nodeIndex = nodes.value.findIndex(n => n.id === currentNode.value!.id)
    if (nodeIndex !== -1) {
      const updatedNode = snapshotWorkflowNode(
        nodes.value[nodeIndex],
        declaredNodeFields.get(currentNode.value.id)
      )
      Object.assign(updatedNode.data, cloneData(configData))
      // SDK 按数组引用/长度同步节点；同长度 splice 只改快照而不会刷新画布。
      nodes.value = nodes.value.map((node, index) =>
        index === nodeIndex ? updatedNode : node
      )
      currentNode.value = updatedNode
    }

    emitChange()
    showNodeConfig.value = false
    message.success('节点配置已保存')
  }

  /* ─── 画布操作 ──────────────────────────────────────────── */
  const fitView = (): void => {
    const target = vueFlowRef.value
    if (!target?.fitView) {
      message.warning('画布未准备就绪，请稍后重试')
      return
    }
    nextTick(() => {
      if (disposed || vueFlowRef.value !== target) return
      target.fitView({
        padding: '50px',
        includeHiddenNodes: false,
        minZoom: 0.5,
        maxZoom: 1.5,
        duration: 800,
      })
    })
    message.success('已适应窗口大小')
  }

  /** 重置节点和边（不涉及验证状态） */
  const resetNodes = (): void => {
    if (props.readonly) return
    nodes.value = cloneData([INITIAL_NODE])
    edges.value = []
    declaredNodeFields = getWorkflowFields(nodes.value)
    declaredEdgeFields.clear()
    emitChange()
    deferFitView('80px', 600)
    message.success('画布已清空')
  }

  /* ─── 生命周期 ──────────────────────────────────────────── */
  watch(
    () => props.modelValue,
    newValue => {
      if (!newValue) return
      const current = getCurrentWorkflowData()
      const nextNodes = newValue.nodes ?? []
      const nextEdges = newValue.edges ?? []
      if (
        isDataEqual(nextNodes, current.nodes) &&
        isDataEqual(nextEdges, current.edges) &&
        isDataEqual(newValue.config, workflowConfig.value)
      )
        return
      modelRevision += 1
      showNodeConfig.value = false
      currentNode.value = null
      showAddMenu.value = false
      currentAddNodeId.value = null
      declaredNodeFields = getWorkflowFields(nextNodes)
      declaredEdgeFields = getWorkflowFields(nextEdges)
      nodes.value = cloneData(nextNodes)
      edges.value = cloneData(nextEdges)
      workflowConfig.value = cloneData(newValue.config)
    },
    { deep: true }
  )

  watch(
    () => props.readonly,
    value => {
      if (value) {
        showNodeConfig.value = false
        currentNode.value = null
        showAddMenu.value = false
      }
    }
  )

  onMounted(() => {
    disposed = false
    nextTick(() => {
      if (disposed) return
      schedule(() => {
        vueFlowRef.value?.fitView?.({
          padding: '80px',
          includeHiddenNodes: false,
          minZoom: 0.8,
          maxZoom: 1.2,
          duration: 600,
        })
      }, 300)
    })
  })

  onBeforeUnmount(() => {
    disposed = true
    pendingTimers.forEach(timer => clearTimeout(timer))
    pendingTimers.clear()
  })

  return {
    /* 状态 */
    nodes,
    edges,
    showAddMenu,
    menuPosition,
    showNodeConfig,
    currentNode,
    /* 计算属性 */
    nodeTypes,
    workflowStats,
    /* 方法 */
    commitCanvasChange,
    handleCanvasChanges,
    handleCanvasKeydown,
    canConnect,
    validateCanvasConnection,
    connectNodes,
    updateConnection,
    addNode,
    onNodeClick,
    closeAddMenu,
    handleConfigSave,
    resetNodes,
    getCurrentWorkflowData,
    getNodeSnapshot,
    fitView,
    deleteNode,
  }
}
