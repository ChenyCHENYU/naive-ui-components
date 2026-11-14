# 表格编辑与分组列

旧的平铺列、`editable: false`、静态选项和 `editRender` 保持有效。行键继续由业务提供，`0` 也是有效身份。

## 常显录入

检测矩阵等需要连续填写的页面可直接配置 `edit: 'inline'`：

```vue
<C_Table
  v-model:data="measurements"
  :columns="columns"
  :config="{ edit: 'inline', density: 'compact', pagination: false }"
/>
```

列继续声明 `editType`、`editProps` 或 `editRender`。所有可编辑单元格常显控件，输入即不可变发布 `update:data`，同一轮多个字段更新会合并。字段权限按当前模型与源行索引判断，`editProps.disabled/readonly` 也约束自定义控件的回调。仅开启此模式时不生成默认操作列，显式业务操作保持有效。

此模式直接编辑应用模型，没有逐格保存／取消草稿；不会逐键调用 `edit.onSave` 或自动提交网络请求。页面在提交时使用自己的业务规则或 `useValidationScope` 协调校验。`C_Table` 目前没有公开整表 `validate()`，不能把单元格或行保存内部的校验方法当成整表提交入口。需要先校验再确认的逐格操作继续使用 `edit: 'cell'`。

切换受控数据、删除源行、更换列或离开缓存页面会结束旧控件的写入会话；重新激活后可继续编辑现有模型。只在同一 tick 内暂存字段补丁以合并受控事件，父级未接收的值不会变成组件内部长期草稿。大量数据仍需分页或虚拟滚动；常显控件数量由实际渲染的行列决定，不代表电子表格区域编辑或报表版式引擎。

## 按行决定编辑许可

```ts
const columns = defineTableColumns<OrderRow>([
  {
    key: 'quantity',
    title: '数量',
    editable: row => !row.released,
    editType: 'number',
    editProps: { precision: 3, min: 0, step: 0.001 },
  },
])
```

`editable(row, index)` 读取当前源行及源数据索引，不读取正在输入的草稿；表格展示、单元格/行/弹窗编辑和公开编辑方法使用同一判断。数字编辑支持原生 `precision`、`format`、`parse` 等属性。日期编辑继续使用字符串 `format` 和原有 `valueMode`。

来源状态变化使字段不可编辑后，控件停止修改该字段；单元格保存保留草稿并拒绝派发，行/弹窗保存将该字段恢复为最新源值。启用行谓词时，未声明的元数据同样以最新源行为准，防止旧草稿覆盖新的生效/锁定状态。业务回调抛错仍走原错误通道，不会被当成允许编辑。已经发送的请求及后端授权由业务服务负责。

## 远程候选只配置来源

```ts
const columns = defineTableColumns<OrderRow>([
  {
    key: 'customerId',
    title: '客户',
    editType: 'select',
    editProps: {
      source: row => ({ ...customers, filters: { company: row.company } }),
      clearable: true,
    },
  },
])
```

`customers` 使用与 C_Select、表单和搜索字段相同的 `OptionSource`，防抖、取消、分页、初值回显和失败重试由已有来源控件处理。表格没有另一套请求引擎。`editType: 'autocomplete'` 对应自由文本建议；值保持文本，选中时才产生候选记录事件。静态 select 沿用原生轻入口；来源字段按需加载，不使基础表格提前加载完整表单字段。

需要对候选的业务字段保持完整类型推导时，可选用编辑器助手：

```ts
const columns = defineTableColumns<OrderRow>([
  {
    key: 'customerId',
    title: '客户',
    editRender: createTableSelectEditor({
      source: customers,
      onSelect: customer => inspectCredit(customer?.creditCode),
    }),
  },
])
```

`createTableSelectEditor`、`createTableAutoCompleteEditor` 返回已有 `editRender`，来源记录从传入 source 推导；不要求消费者提取条件类型或断言候选对象。`onSelect` 在主字段模型更新后的 nextTick 调用。第二个参数提供只读 `row`、`index` 和当前字段 `updateValue`；关联业务字段如何回填仍由应用明确决定。

同一编辑器也用于生成的编辑弹窗。控件尺寸默认跟随表格密度，助手显式设置 size 时以该值为准。自定义 `editRender` 现在可读取可选的 `context.disabled` 和 `context.size`；旧的 `{ onUpdate }` 写法无需改动。

## 分组表头

```ts
const columns = defineTableColumns<OrderRow>([
  {
    type: 'group',
    title: '计量',
    children: [
      { key: 'quantity', title: '数量', editType: 'number' },
      { key: 'weight', title: '重量', editType: 'number' },
    ],
  },
])
```

组列使用明确的 `type: 'group'`，可嵌套；组本身不编辑、不参与排序和取业务值。列设置、内容测宽、横向滚动、编辑校验、动态列失效和数据导出统一遍历叶列。所有叶列都隐藏时，不渲染空组；调用方列对象不被修改。

列设置可调整叶列的可见性、宽度、固定方向及同组顺序，持久化仍使用原来的 persistKey；跨组移动不会重写调用方定义的结构。业务叶列被动态移除时会关闭当前编辑会话，并阻止迟到保存结果回写；新增列、重排、组名及列宽变化不丢弃草稿。分组模式下原生表头拖动关闭，使用列设置调整同组顺序；旧平铺表头拖动保持原有行为。CSV/XLSX 基础导出采用叶列标题和值，不承诺合并多行表头或工作簿版式保真。

这项能力用于普通分组列表，不代表工业矩阵、Excel 区域编辑、调度拖动或报表设计器已经等价实现。
