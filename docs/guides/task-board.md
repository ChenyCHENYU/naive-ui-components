# 任务泳道看板

`C_TaskBoard` 以状态列展示工单、计划或待办。业务可以加一组泳道来区分产线、班次或责任人。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_TaskBoard,
    type TaskBoardColumn,
    type TaskBoardMove,
  } from '@robot-admin/naive-ui-components/C_TaskBoard'

  type Status = 'waiting' | 'working' | 'done'
  interface Task {
    key: number
    title: string
    status: Status
    lane: string
  }
  const columns: TaskBoardColumn<Status>[] = [
    { key: 'waiting', label: '待执行' },
    { key: 'working', label: '执行中' },
    { key: 'done', label: '已完成' },
  ]
  const lanes = [{ key: 'shift-a', label: '甲班' }]
  const tasks = ref<Task[]>([
    { key: 1, title: '核对轧制计划', status: 'waiting', lane: 'shift-a' },
  ])

  const move = ({ task, to }: TaskBoardMove<Task>) => {
    tasks.value = tasks.value.map(item =>
      item.key === task.key ? { ...item, status: to.status } : item
    )
  }
</script>

<template>
  <C_TaskBoard
    :columns="columns"
    :lanes="lanes"
    :tasks="tasks"
    draggable
    @move-request="move"
  />
</template>
```

- 支持键盘激活卡片上的移动菜单。启用 `draggable` 后，也可通过拖动手柄移到同泳道的另一状态列，两者统一发出 `move-request`。
- 宿主确认后更新 `tasks`。接口等待期间可填写 `pendingKeys`，通过 `canMove` 可以提前拦截不允许的状态变更。接口拒绝时继续保留原数据即可。
- `to.index` 是建议落位，下标按目标单元格计算。宿主可以按业务排序规则应用它。组件使用传入的任务顺序展示。
- 提供泳道时，未知泳道或未分配的任务进入「未分配」组。看板只呈现已配置状态列。禁用的任务、列不会发起移动。
- `#card` 收到原始任务、列与泳道，可以展示负责人、优先级和截止时间。任务的业务数据和状态转换权限由页面管理。
