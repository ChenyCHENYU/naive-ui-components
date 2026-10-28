# 批量操作结果

`C_BatchResult` 呈现成功、失败、冲突、跳过及失败原因，支持筛选、分页与显式重试。组件不提交请求，也不自行重试。

```vue
<script setup lang="ts">
  import { C_BatchResult } from '@robot-admin/naive-ui-components/C_BatchResult'
  import type { BatchOperationResult } from '@robot-admin/naive-ui-components/data'
  import '@robot-admin/naive-ui-components/C_BatchResult/style.css'

  const results: BatchOperationResult[] = [
    { key: 'ORDER-1', status: 'success' },
    {
      key: 'ORDER-2',
      status: 'conflict',
      message: '版本已改变，请核对后重试',
      retryable: true,
    },
    {
      key: 'ORDER-3',
      status: 'failure',
      message: '当前状态不允许操作',
      retryable: false,
    },
  ]
  function retry(keys: (string | number)[]) {
    // 使用应用已有的命令适配器；后端仍须再次校验权限、状态、版本和幂等令牌。
    orderActions.retry(keys)
  }
</script>

<template>
  <C_BatchResult
    :results="results"
    title="下达结果"
    @retry="retry"
  />
</template>
```

同一 `key` 多次出现时，以最后一条结果为准，摘要、表格和重试资格保持一致。`retry` 只发送最后状态为 `failure` / `conflict` 且 `retryable: true` 的去重key；后来已成功或跳过的行不会再次发送。失败不等于允许重试。

默认每页20条，可通过 `pageSize` 调整；表格只接收当前页行并使用虚拟滚动，万条结果不会同时创建万条DOM。切换状态筛选时回到第一页，结果数量缩小会修正页码。

原因按文本显示。不要把HTML、Vue节点或后端原始异常堆栈塞进 `message`；业务应提供可以行动的原因，并决定是否保留失败行的编辑草稿、是否刷新成功行以及如何处理冲突。

`locale` 支持应用默认和组件局部中英文配置，统计、筛选、列头与重试文案会随配置更新；显式 `title` 优先。
