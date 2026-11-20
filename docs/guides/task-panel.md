[← 组件目录](../components.md) · [表格导出](./table-density.md#异步导出的快照与卸载)

# 后台任务面板

`C_TaskPanel` 展示异步导出、批量处理或上传任务。宿主传入当前任务列表，接收下载和整项重试事件。面板可以放进页面、抽屉或项目已有的任务入口。

```vue
<script setup lang="ts">
  import { C_TaskPanel } from '@robot-admin/naive-ui-components/C_TaskPanel'
  import '@robot-admin/naive-ui-components/C_TaskPanel/style.css'
  import { tasks, pendingKeys, downloadTask, retryTask } from './export-tasks'
</script>

<template>
  <C_TaskPanel
    :tasks="tasks"
    :pending-keys="pendingKeys"
    @download="downloadTask"
    @retry="retryTask"
  />
</template>
```

- 每项提供稳定 `key`、`title` 和 `status`。状态支持 `queued`、`running`、`success`、`failed`、`cancelled`。面板保留宿主提供的顺序。
- 运行中的 `progress` 用 `0` 到 `100` 表示实测百分比。省略或数值无效时显示未知进度，`0` 仍表示已知的零进度。
- `downloadable` 启用下载。失败且标记 `retryable` 时显示重试，业务函数收到原任务记录。将下载或重试中的键放入 `pendingKeys` 可暂停该项操作。鉴权、轮询、任务持久化和服务端幂等由宿主负责。
- 提供 `results` 可展开分项结果。首次展开才加载 [`C_BatchResult`](./batch-results.md) 与表格运行时。面板里的结果为只读，整项重试仍由任务行触发。
- `loading` 和 `error` 用于列表查询状态。刷新失败时保留已传入的任务。分页默认每页 8 项，`page-size` 可设为 1 至 50。

对于表格的全部匹配导出，在 `onExportMatching` 中读取已生效的筛选，向服务端创建任务，再将任务加入 `tasks`。轮询结果用同一个 `key` 更新，文件就绪后由 `downloadable` 提供下载入口。面板可同样接入导入、校验等后台操作。
