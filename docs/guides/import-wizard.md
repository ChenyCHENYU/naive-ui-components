# 普通业务数据导入

`C_ImportWizard` 管理文件选择、工作表与列映射、预检、确认和分项结果。页面提供一个适配器，从现有文件工具读取表头，或将文件发送到已有导入服务。

```vue
<script setup lang="ts">
  import {
    C_ImportWizard,
    type ImportWizardField,
  } from '@robot-admin/naive-ui-components/C_ImportWizard'
  import { readWorkbook, validateImport, commitImport } from './api'

  const props = defineProps<{ warehouseId: string }>()
  const fields = [
    { key: 'code', label: '物料编码', required: true },
    { key: 'quantity', label: '数量', required: true },
    { key: 'note', label: '备注' },
  ] satisfies ImportWizardField[]

  const adapter = {
    read: readWorkbook,
    preview: validateImport,
    commit: commitImport,
  }
</script>

<template>
  <C_ImportWizard
    :scope="props.warehouseId"
    :fields="fields"
    :adapter="adapter"
  />
</template>
```

- `read(file, signal)` 返回带稳定键的工作表和来源列。唯一键或唯一同名列可自动映射。重复表头请保留不同的列键供手工选择。
- `preview({ file, sheetKey, mapping }, signal)` 返回有效行数、定位到原始行或字段的预检问题，以及一个不透明的 `plan`。错误阻止确认，提醒允许用户继续。可复用 `@robot-admin/file-utils` 读取 CSV 或 Excel，再由业务处理字典、字段转换和校验。已有 MachTable 数据集可复用其 ImportPlan 作为底层适配。
- `commit(plan, signal)` 使用已预检计划，返回逐项 `BatchOperationResult[]`。点击确认后当前计划只提交一次。传输失败时应核对实际业务记录，服务端负责幂等、并发和重试策略。
- 更换文件、取消预检或 `scope` 变化时取消等待并忽略旧响应。已发出的提交可能已由服务端执行，最终结果由业务服务判定。
- `@completed` 返回分项结果，`@failure` 提供失败阶段与异常。需要接入业务重试、错误导出或专用展示时，使用 `#results`。
