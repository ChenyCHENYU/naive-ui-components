import { describe, expect, test } from 'bun:test'
import { createSSRApp, h, reactive, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  generateConditionId,
  generateWorkflowId,
} from '../src/components/C_WorkFlow/data'
import { useWorkflowNodes } from '../src/components/C_WorkFlow/composables/useWorkflowNodes'
import type {
  ApprovalNodeData,
  WorkflowNode,
  WorkflowData,
  WorkflowProps,
} from '../src/components/C_WorkFlow/types'

describe('C_WorkFlow model boundaries', () => {
  test('node and condition IDs remain unique within the same tick', () => {
    const ids = Array.from({ length: 100 }, () =>
      generateWorkflowId('approval')
    )
    const conditionIds = Array.from({ length: 100 }, generateConditionId)
    expect(new Set(ids).size).toBe(100)
    expect(new Set(conditionIds).size).toBe(100)
  })

  test('loads the initial model, isolates snapshots, and honors readonly', async () => {
    const model: WorkflowData = {
      nodes: [
        {
          id: 'custom-start',
          type: 'start',
          position: { x: 0, y: 0 },
          data: { title: 'Start', status: 'active' },
        },
        {
          id: 'approval-1',
          type: 'approval',
          position: { x: 0, y: 180 },
          data: { title: 'Approve', approvers: [] },
        },
      ],
      edges: [{ id: 'edge-1', source: 'custom-start', target: 'approval-1' }],
      config: { version: '2.0' },
    }
    const props = reactive<WorkflowProps>({ modelValue: model, readonly: true })
    let workflow!: ReturnType<typeof useWorkflowNodes>
    let clickedNode: WorkflowNode | undefined
    const app = createSSRApp({
      setup() {
        workflow = useWorkflowNodes(
          props,
          (event, value) => {
            if (event === 'node-click') clickedNode = value as WorkflowNode
          },
          ref()
        )
        return () => h('div')
      },
    })
    await renderToString(app)

    expect(workflow.getCurrentWorkflowData()).toEqual(model)
    workflow.nodes.value[0].data.title = 'Local'
    expect(model.nodes[0].data.title).toBe('Start')
    const snapshot = workflow.getCurrentWorkflowData()
    snapshot.nodes[0].data.title = 'External'
    expect(workflow.nodes.value[0].data.title).toBe('Local')
    workflow.onNodeClick({ node: workflow.nodes.value[0] })
    clickedNode!.data.title = 'Clicked'
    expect(workflow.nodes.value[0].data.title).toBe('Local')

    workflow.deleteNode('custom-start')
    workflow.addNode('approval')
    workflow.resetNodes()
    expect(workflow.nodes.value).toHaveLength(2)

    props.readonly = false
    workflow.deleteNode('custom-start')
    expect(workflow.nodes.value).toHaveLength(2)
    workflow.addNode('copy')
    expect(workflow.nodes.value).toHaveLength(3)
    expect(workflow.nodes.value[2].position.x).toBe(0)

    workflow.currentNode.value = workflow.nodes.value[1]
    const approvers = [
      { id: 'one', name: 'Alice', department: 'Ops', role: 'Reviewer' },
    ]
    workflow.handleConfigSave({ approvers })
    approvers[0].name = 'Changed'
    expect(
      (workflow.nodes.value[1].data as ApprovalNodeData).approvers?.[0].name
    ).toBe('Alice')
  })
})
