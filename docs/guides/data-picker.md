# 远程实体选择器

`C_DataPicker` 用于客户、订单、人员、物料等需要分页查询和多列辨认的选择场景。它复用 `C_Table` 和资源生命周期，支持独立弹窗和表单内嵌两种展示。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_DataPicker,
    type DataPickerSourceInput,
  } from '@robot-admin/naive-ui-components/C_DataPicker'
  import '@robot-admin/naive-ui-components/C_DataPicker/style.css'

  interface Customer {
    id: string
    code: string
    name: string
  }
  const selected = ref<string[]>([])

  // customerClient 是应用已有的请求/缓存适配器；signal 透传给真实请求。
  const source: DataPickerSourceInput<Customer> = {
    rowKey: 'id',
    label: row => row.name,
    request: query => customerClient.page(query), // { rows: Customer[], total: number }
    resolve: (ids, signal) => customerClient.byIds(ids, { signal }),
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

- `source.rowKey` 是表格行身份。省略 `source.value` 时，选择和回显直接使用行键；数值 `0` 和字符串 `'0'` 保持为两个不同的值。
- 业务提交值与行键不同时，显式配置 `value: row => row.code`，并让 `resolve` 按业务编码查询。行键和业务值均须稳定且唯一；`DataPickerSource<T>` 保留可直接调用的 `value(row)`，组件传参用 `DataPickerSourceInput<T>` 可省略它。
- 选择在本地草稿中进行，跨分页保留；只有“确认选择”或显式清空才发出 `update:modelValue`。取消、关闭弹窗、卸载不会提交草稿。
- 计划定位等操作可加上 `require-selection`，选中候选后才可确认。默认允许提交空选择。
- `select(rows)` 返回确认时已解析的选中行。提供 `source.resolve(values, signal)` 可批量回显初值。打开后到达的回显会更新仍选中的标签及确认结果。尚未解析的初值显示并保留原编码。
- 源、受控值、单多选模式或可用状态改变时关闭旧会话；旧请求即使忽略 signal，也不能回写到新会话。
- `readonly` 保留名称展示，但不打开选择、清空或确认；`disabled` 同样禁止变更。名称加载失败保留编码并提供重试。

## 请求与布局

`request` 接收 `{ page, pageSize, search, signal }`，返回 `{ rows, total }`。应用负责接口字段转换、鉴权、业务过滤、去重及缓存。组件不猜测 `data.records` 等响应信封。

默认 `pageSize=20`。密度按显式 `density`、区域 `C_Density` / 表单默认密度、`compact` 依次解析，支持 `default`、`comfortable`。首次打开时，虚拟表格与候选请求并行加载。底部左侧显示结果数和已选项，右侧分页在换页加载时保持可见。窄窗允许分行。已选标签最多同时呈现 30 个，其余显示数量。可通过实例 `open()` / `close()` 控制选择会话。

`locale` 可覆盖应用中英文配置，标题和 placeholder 的显式配置优先；运行时切换语言不会清空选择草稿。

同一页的业务值必须唯一且为字符串或有限数值；响应的 `rows`、`total` 无效时显示失败和重试入口。`total` 必须为非负安全整数；行身份不可缺失或重复，返回行数不得超过所请求的 `pageSize` 或 `total`，不靠静默截断伪装成合法分页。跨页再次出现同一实体时保留一项选择，移除已选标签会取消该实体。

在 Form/Search 中通过现有自定义渲染器使用这一组件。将 `source` 在业务集成层定义一次并复用即可，不需要让所有表单或搜索入口静态依赖实体选择器。

## 表单内嵌选择

常规表单字段通过 `createDataPickerField` 接入。它把选择结果写回当前字段，并继承表单的禁用和只读状态。

```ts
import { createDataPickerField } from '@robot-admin/naive-ui-components/C_DataPicker'
import '@robot-admin/naive-ui-components/C_DataPicker/style.css'

const renderers = {
  customer: createDataPickerField({ source, columns, title: '选择客户' }),
}
const options = [
  {
    prop: 'customerId',
    type: 'customer',
    label: '订货客户',
    attrs: { presentation: 'inline' },
  },
]
```

将 `options` 和 `renderers` 传给 `C_Form` 或 `C_FormModal`。内嵌候选区与字段同处一个弹窗，Enter 查询候选项，Escape 或取消收起并将焦点交回字段。需要一次回填编码和名称等多个关联字段时，可直接组合 `C_DataPicker` 并使用 `@select`。

```vue
<C_DataPicker
  :model-value="form.customerId"
  :source="source"
  :columns="columns"
  presentation="inline"
  @select="applyCustomer"
/>
```

`applyCustomer(rows)` 可从 `rows[0]` 取得完整实体。需要回显已有 ID 或业务编码时，继续提供 `resolve`。

## 多条件查询与固定上下文

声明 `DataPickerSourceInput<Customer, CustomerFilters>`，在 `request` 中用 `filters` 接收业务类型。设置 `initialValues` 后，打开会用它查询第一页。翻页沿用最近提交的筛选条件，外部初值（例如组织）变化会关闭旧会话、取消请求并丢弃未确认选择。

`#query` 的 `initialValues`、`submit(filters)` 和 `loading` 可用于接入项目现有的查询控件。独立弹窗内可直接组合 `C_FormSearch`：

```vue
<C_DataPicker
  :source="source"
  :columns="columns"
  :initial-values="initialFilters"
>
  <template #query="{ initialValues, submit, loading }">
    <C_FormSearch
      :model-value="initialValues ?? initialFilters"
      :form-item-list="searchFields"
      :config="{ requireValue: false }"
      :loading="loading"
      @search="submit"
      @reset="submit"
    />
  </template>
</C_DataPicker>
```

例如将 `organization` 放进 `initialFilters`，使用一个 `fixed` 字段显示它，或让它只随查询提交。服务端鉴权和组织隔离仍由应用请求层负责。`submit` 启动加载并回到第一页，`loading` 和错误提示由选择器管理。内嵌在 `C_Form` 内时，`#query` 使用普通输入或选择控件，避免嵌套原生表单。`#trigger` 可用 `{ open, disabled, opened, display }` 替换默认触发器。
