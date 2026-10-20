<!-- 消费者类型回归：节点判别、实例生命周期、SDK 配置与业务任务推导。 -->
<script setup lang="ts">
  import { ref } from 'vue'
  import { VRender } from '@visactor/vtable-gantt'
  import {
    C_WorkFlow,
    type WorkflowData,
    type WorkflowNode,
    type WorkflowExpose,
  } from '@robot-admin/naive-ui-components/C_WorkFlow'
  import {
    C_AntV,
    type DiagramExpose,
  } from '@robot-admin/naive-ui-components/C_AntV'
  import {
    C_VtableGantt,
    appendGanttGroup,
    type GanttExpose,
    type GanttTask,
    type GanttTaskRecord,
    type GanttTaskNodeRecord,
    type GanttEmits,
    type GanttTaskChanges,
    type GanttOptions,
    type GanttTaskBarLayout,
    type GanttTaskCellLayout,
  } from '@robot-admin/naive-ui-components/C_VtableGantt'

  interface Assignment extends GanttTask {
    ownerId: number
    children?: Assignment[]
  }
  interface StringAssignment extends Assignment {
    start: string
    end: string
  }
  const stringTasks: StringAssignment[] = [
    {
      id: 2,
      title: 'Review',
      start: '2026-10-20',
      end: '2026-10-21',
      ownerId: 42,
    },
  ]
  const onStringTaskChange = (
    task: GanttTaskRecord<StringAssignment>,
    changes: GanttTaskChanges<StringAssignment>
  ) => {
    task.ownerId.toFixed()
    // @ts-expect-error SDK 日期编辑会产生 Date，不能假定它仍是输入的 string。
    task.start.toUpperCase()
    // @ts-expect-error 变更补丁也保留 SDK 日期的真实联合类型。
    changes.start?.toUpperCase()
    const time: number = new Date(task.start).getTime()
    void time
  }
  const stringBarLayout: GanttTaskBarLayout<StringAssignment> = ({
    taskRecord,
  }) => {
    taskRecord.ownerId.toFixed()
    // @ts-expect-error 布局回调读取 SDK 编辑后的记录，日期同样可能是 Date。
    taskRecord.start.toUpperCase()
    return { rootContainer: new VRender.Group({}) }
  }
  const stringCellLayout: GanttTaskCellLayout<StringAssignment> = ({
    table,
    col,
    row,
  }) => {
    const task = table.getCellOriginRecord(col, row)
    if (!task) return { rootContainer: new VRender.Group({}) }
    // @ts-expect-error 表格中的任务记录不能继续伪装成输入 string 日期。
    task.start.toUpperCase()
    return { rootContainer: new VRender.Group({}) }
  }
  void [stringBarLayout, stringCellLayout]
  interface NestedStringAssignment extends StringAssignment {
    children?: NestedStringAssignment[]
  }
  interface NestedDateAssignment extends Assignment {
    start: Date
    children: NestedDateAssignment[]
    queueName: string
  }
  const inspectNestedStrings = (
    task: GanttTaskRecord<NestedStringAssignment>
  ) => {
    const child = task.children?.[0]
    if (child) {
      child.ownerId.toFixed()
      // @ts-expect-error SDK 同样会改变嵌套子任务的日期表示。
      child.start.toUpperCase()
      const childTime: number = new Date(child.start).getTime()
      void childTime
    }
  }
  const inspectNestedDates = (task: GanttTaskRecord<NestedDateAssignment>) => {
    // 必选 children 仍为必选，每层业务扩展 queueName 保持 string。
    task.children.map(child => {
      child.queueName.toUpperCase()
      // @ts-expect-error Date 输入的子任务也可能被 SDK 改成日期字符串。
      child.start.getTime()
      return new Date(child.start).getTime()
    })
  }
  // 可选 children 不应因递归视图而变成必选。
  const emptyTreeView: GanttTaskRecord<NestedStringAssignment> = {
    id: 3,
    title: 'Nested',
    start: '2026-10-20',
    ownerId: 42,
  }
  void [inspectNestedStrings, inspectNestedDates, emptyTreeView]

  interface DeliverableTask extends GanttTask {
    kind: 'deliverable'
    delivered: boolean
    children?: never
  }
  interface PhaseTask extends GanttTask {
    kind: 'phase'
    phaseCode: string
    children: DeliverableTask[]
  }
  interface ProjectTask extends GanttTask {
    kind: 'project'
    projectCode: string
    children: PhaseTask[]
  }
  const projects: ProjectTask[] = [
    {
      id: 'p',
      title: 'Project',
      start: '2026-10-20',
      kind: 'project',
      projectCode: 'robot',
      children: [
        {
          id: 'phase',
          title: 'Phase',
          start: '2026-10-20',
          kind: 'phase',
          phaseCode: 'release',
          children: [
            {
              id: 'deliverable',
              title: 'Deliverable',
              start: '2026-10-20',
              kind: 'deliverable',
              delivered: true,
            },
          ],
        },
      ],
    },
  ]
  const inspectProjectNode = (task: GanttTaskNodeRecord<ProjectTask>) => {
    // @ts-expect-error 点击后代时并不一定拥有根任务的必填字段。
    task.projectCode.toUpperCase()
    if (task.kind === 'project') task.projectCode.toUpperCase()
    if (task.kind === 'phase') task.phaseCode.toUpperCase()
    if (task.kind === 'deliverable') task.delivered.valueOf()
  }
  const projectClick: (...args: GanttEmits<ProjectTask>['taskClick']) => void =
    inspectProjectNode
  const projectChange = (
    ...[task, changes]: GanttEmits<ProjectTask>['taskChange']
  ) => {
    inspectProjectNode(task)
    // @ts-expect-error 变更补丁也可能来自不含根字段的后代。
    changes.projectCode?.toUpperCase()
    if (changes.kind === 'deliverable') changes.delivered?.valueOf()
  }
  const projectBar: GanttTaskBarLayout<ProjectTask> = ({ taskRecord }) => {
    inspectProjectNode(taskRecord)
    // @ts-expect-error 任务条同样为后代渲染，不保证根业务字段。
    taskRecord.projectCode.toUpperCase()
    return { rootContainer: new VRender.Group({}) }
  }
  const projectCell: GanttTaskCellLayout<ProjectTask> = ({
    table,
    col,
    row,
  }) => {
    const task = table.getCellOriginRecord(col, row)
    // @ts-expect-error 表头或越界单元格没有任务记录。
    task.id.toString()
    if (task) {
      inspectProjectNode(task)
      // @ts-expect-error 左侧表格单元格也可以属于后代。
      task.projectCode.toUpperCase()
    }
    return { rootContainer: new VRender.Group({}) }
  }
  const projectOptions: GanttOptions<ProjectTask> = {
    taskBar: { customLayout: projectBar },
    taskListTable: {
      columns: [{ field: 'title', customLayout: projectCell }],
    },
  }

  // 相互递归与同构 children 使用同一业务联合，类型展开必须终止。
  interface RecursiveRoot extends GanttTask {
    kind: 'root'
    rootCode: string
    children?: RecursiveChild[]
  }
  interface RecursiveChild extends GanttTask {
    kind: 'child'
    childCode: string
    children?: RecursiveRoot[]
  }
  const inspectRecursive = (task: GanttTaskNodeRecord<RecursiveRoot>) => {
    if (task.kind === 'root') task.rootCode.toUpperCase()
    else task.childCode.toUpperCase()
  }
  void inspectRecursive
  const tasks: Assignment[] = [
    { id: 1, title: 'Deliver', start: '2026-10-20', ownerId: 42 },
  ]
  const workflow = ref<WorkflowExpose>()
  const diagram = ref<DiagramExpose>()
  const gantt = ref<GanttExpose<Assignment>>()
  const flow: WorkflowData = { nodes: [], edges: [] }
  const approval: WorkflowNode<'approval'> = {
    id: 'a',
    type: 'approval',
    position: { x: 0, y: 0 },
    data: { title: 'Review', approvers: [] },
  }
  const inspect = (node: WorkflowNode) => {
    if (node.type === 'approval') node.data.approvers?.map(user => user.id)
    if (node.type === 'condition')
      node.data.conditions?.map(condition => condition.field)
  }
  inspect(approval)
  const invalidNode: WorkflowNode = {
    id: 'x',
    type: 'start',
    position: { x: 0, y: 0 },
    // @ts-expect-error start 节点不能接受 approval 专属的数据。
    data: { title: 'Invalid', approvers: [] },
  }
  // @ts-expect-error SDK 已知配置字段不接受错误值。
  const invalidHeight: GanttOptions = { rowHeight: 'large' }
  // @ts-expect-error 拼错的 SDK 配置字段必须被拦截。
  const invalidKey: GanttOptions = { rowHeigth: 40 }
  // @ts-expect-error SDK 嵌套配置同样校验。
  const invalidMove: GanttOptions = { taskBar: { moveable: 'no' } }
  const barLayout: GanttTaskBarLayout<Assignment> = ({ taskRecord }) => {
    taskRecord.ownerId.toFixed()
    return { rootContainer: new VRender.Group({}) }
  }
  const cellLayout: GanttTaskCellLayout<Assignment> = ({ table, col, row }) => {
    table.getCellOriginRecord(col, row)?.ownerId.toFixed()
    const rootContainer = new VRender.Group({})
    appendGanttGroup(rootContainer, new VRender.Group({}))
    return { rootContainer }
  }
  const options: GanttOptions<Assignment> = {
    rowHeight: 40,
    timelineHeader: { colWidth: 80 },
    taskBar: { customLayout: barLayout },
    taskListTable: {
      columns: [{ field: 'title', title: 'Task', customLayout: cellLayout }],
    },
  }
  type IsAny<T> = 0 extends 1 & T ? true : false
  const graphIsAny: IsAny<ReturnType<InstanceType<typeof C_AntV>['getGraph']>> =
    false
  const dataIsAny: IsAny<ReturnType<InstanceType<typeof C_AntV>['getData']>> =
    false
  const workflowInstance: WorkflowExpose | undefined = workflow.value
  const graph = diagram.value?.getGraph()
  graph?.zoomToFit()
  gantt.value?.ganttInstance?.scrollToMarkLine(new Date())
  const total: number | undefined = workflow.value?.stats.totalNodes
  void [
    invalidNode,
    invalidHeight,
    invalidKey,
    invalidMove,
    graphIsAny,
    dataIsAny,
    workflowInstance,
    total,
  ]
</script>
<template>
  <C_VtableGantt
    :data="projects"
    :options="projectOptions"
    @task-click="projectClick"
    @task-change="projectChange"
  />
  <C_VtableGantt
    :data="stringTasks"
    @task-change="onStringTaskChange"
  />
  <C_WorkFlow
    ref="workflow"
    :model-value="flow"
    @node-click="inspect"
  />
  <C_AntV
    ref="diagram"
    type="bpmn"
    :data="{ nodes: [], flows: [] }"
  />
  <C_VtableGantt
    ref="gantt"
    :data="tasks"
    :options="options"
    @task-click="task => task.ownerId.toFixed()"
    @task-change="
      (task, changes) => {
        task.ownerId.toFixed()
        changes.ownerId?.toFixed()
      }
    "
  />
</template>
