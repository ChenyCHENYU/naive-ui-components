[← 组件目录](../components.md) · [通知接入](./notification-center.md)

# 审批实例查看器

`C_ApprovalViewer` 从单据查看历次审批。默认打开最近发起的一次，弹窗顶部可以切换到较早的记录。已经知道实例 ID 的消息或待办入口可以用 `instance-id` 直接打开。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { C_ApprovalViewer } from '@robot-admin/naive-ui-components/C_ApprovalViewer'
  import '@robot-admin/naive-ui-components/C_ApprovalViewer/style.css'
  import { orderApprovalSource } from './order-approval-source'

  const show = ref(false)
</script>

<template>
  <button
    type="button"
    @click="show = true"
    >查看审批</button
  >
  <C_ApprovalViewer
    v-model:show="show"
    business-key="order-1"
    :source="orderApprovalSource"
  />
</template>
```

## 数据源

`orderApprovalSource` 遵循同一子路径导出的 `ApprovalViewerSource`。`listInstances(businessKey, signal)` 返回当前单据可查看的审批实例，`getInstance(instanceId, signal)` 返回对应实例和 `history`。各次审批使用稳定的独立 `id`，详情的 `id` 与请求一致，所有时间戳使用毫秒。应用将状态映射为 `pending`、`running`、`approved`、`rejected`、`withdrawn`、`cancelled` 或 `terminated`。

数据源可将 `signal` 传给请求层。重新打开会查询最新数据，把数据源定义在模块或 `setup` 中可保持引用稳定。实例按发起时间降序排列，处理记录按发生时间升序展示，审批意见以纯文本呈现。

列表与详情有独立的加载和重试状态。指定 `instance-id` 时可以并行读取列表和详情，列表暂时失败时仍可查看已加载的详情。如果同一个页面里可能出现来自不同业务的同号单据，请由数据源使用含业务类型的单据键。

`#diagram="{ instance }"` 可放入按实例加载的只读图，切到图表时才挂载插槽。[`C_WorkFlow`](./workflow.md)可展示该次审批对应的流程定义。数据授权、审批动作和执行规则由应用服务提供。

## API 摘要

| 属性           | 用途                           |
| -------------- | ------------------------------ |
| `v-model:show` | 控制详情弹窗开关               |
| `business-key` | 当前单据的业务键               |
| `source`       | 提供有类型的实例列表与详情查询 |
| `instance-id`  | 选填，指定进入时的实例 ID      |
| `title`        | 选填，覆盖默认弹窗标题         |
| `locale`       | 选填，覆盖组件的语言及词条     |
