<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_TaskPanel,
    type TaskPanelTask,
  } from '@robot-admin/naive-ui-components/C_TaskPanel'
  import '@robot-admin/naive-ui-components/C_TaskPanel/style.css'

  const tasks = ref<TaskPanelTask[]>([
    { key: 'sales', title: '销售明细导出', status: 'running', progress: 0 },
    { key: 'shipping', title: '待发运订单导出', status: 'running' },
    {
      key: 'balance',
      title: '月度对账文件',
      status: 'success',
      downloadable: true,
    },
    {
      key: 'imports',
      title: '合同批量导入',
      status: 'failed',
      retryable: true,
      results: [
        {
          key: 'CT-701',
          status: 'conflict',
          message: '合同记录已被其他人更新',
        },
      ],
    },
  ])
  const action = ref('')
  function retry(task: TaskPanelTask) {
    action.value = `重试 ${task.title}`
    tasks.value = tasks.value.map(row =>
      row.key === task.key ? { ...row, status: 'queued' } : row
    )
  }
</script>

<template>
  <section>
    <C_TaskPanel
      :tasks="tasks"
      title="销售后台任务"
      @download="task => (action = `下载 ${task.title}`)"
      @retry="retry"
    />
    <output data-testid="background-task-action">{{ action }}</output>
  </section>
</template>
