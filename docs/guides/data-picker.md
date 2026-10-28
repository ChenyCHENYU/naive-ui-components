# 远程实体选择器

`C_DataPicker` 用于客户、订单、人员、物料等需要分页查询和多列辨认的选择场景。它复用 `C_Table`、Naive Modal 和资源生命周期，不绑定后端地址，也不维护第二份请求缓存。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_DataPicker,
    type DataPickerSource,
  } from '@robot-admin/naive-ui-components/C_DataPicker'
  import '@robot-admin/naive-ui-components/C_DataPicker/style.css'

  interface Customer {
    id: string
    code: string
    name: string
  }
  const selected = ref<string[]>([])

  // customerClient 是应用已有的请求/缓存适配器；signal 透传给真实请求。
  const source: DataPickerSource<Customer> = {
    rowKey: 'id',
    value: row => row.code,
    label: row => row.name,
    request: query => customerClient.page(query), // { rows: Customer[], total: number }
    resolve: (codes, signal) => customerClient.byCodes(codes, { signal }),
  }
  const columns = [
    { key: 'code', title: '客户编码', width: 140 },
    { key: 'name', title: '客户名称', minWidth: 180 },
  ]
</script>

<template>
  <C_DataPicker
    v-model="selected"
    :source="source"
    :columns="columns"
    multiple
    clearable
    title="选择客户"
  />
</template>
```

## 值与会话

- `source.rowKey` 是表格行身份；`source.value(row)` 是业务提交值，两者可以不同，均须稳定且唯一。业务值支持字符串和数值，`0` 是有效值。
- 选择在本地草稿中进行，跨分页保留；只有“确认选择”或显式清空才发出 `update:modelValue`。取消、关闭弹窗、卸载不会提交草稿。
- `select(rows)` 返回已解析的选中行。提供 `source.resolve(values, signal)` 可一次批量回显全部初值；未提供时，尚未加载的初值显示原编码且保留，不猜测标签，不逐条请求。需要完整 `rows` 事件的场景应提供 `resolve`。
- 源、受控值、单多选模式或可用状态改变时关闭旧会话；旧请求即使忽略 signal，也不能回写到新会话。
- `readonly` 保留名称展示，但不打开选择、清空或确认；`disabled` 同样禁止变更。名称加载失败保留编码并提供重试。

## 请求与布局

`request` 接收 `{ page, pageSize, search, signal }`，返回 `{ rows, total }`。应用负责接口字段转换、鉴权、业务过滤、去重及缓存。组件不猜测 `data.records` 等响应信封。

默认 `pageSize=20`；密度按显式 `density`、区域 `C_Density` / 表单默认密度、`compact` 依次解析，支持 `default`、`comfortable`。列表使用虚拟表格，已选标签最多同时呈现30个，其余显示数量。可通过实例 `open()` / `close()` 控制选择会话。

`locale` 可覆盖应用中英文配置，标题和 placeholder 的显式配置优先；运行时切换语言不会清空选择草稿。

同一页的业务值必须唯一且为字符串或有限数值；响应的 `rows`、`total` 无效时显示失败和重试入口。`total` 必须为非负安全整数；行身份不可缺失或重复，返回行数不得超过所请求的 `pageSize` 或 `total`，不靠静默截断伪装成合法分页。跨页再次出现同一实体时保留一项选择，移除已选标签会取消该实体。

在 Form/Search 中通过现有自定义渲染器使用这一组件。将 `source` 在业务集成层定义一次并复用即可，不需要让所有表单或搜索入口静态依赖实体选择器。
