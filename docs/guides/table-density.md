# 表格密度与模式切换

`C_Form`、`C_FormSearch` 和 `C_Table` 共用 `ComponentDensity`。普通页面只需共享一个状态：

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import type { ComponentDensity } from '@robot-admin/naive-ui-components/C_Table'
  const density = ref<ComponentDensity>('compact')
</script>

<template>
  <C_FormSearch
    v-model="query"
    :form-item-list="searchFields"
    :config="{ density }"
  />
  <C_Table
    :data="rows"
    :columns="columns"
    :config="{ density, edit: 'cell', selection: true }"
  />
</template>
```

| density       | 原生控件尺寸 | 用途                           |
| ------------- | ------------ | ------------------------------ |
| `compact`     | `small`      | 高频操作、多表工作台、紧凑查询 |
| `default`     | `medium`     | 常规管理页面                   |
| `comfortable` | `large`      | 信息较少、强调可读性的录入页面 |

密度同步表格行尺寸、编辑器、分页、工具栏按钮、批量按钮、内置编辑弹窗和组件内部留白。
`display.size`、`pagination.size`、`toolbar.actionBar`、列 `editProps.size` 仍可分别覆盖；原生表格 attrs 保持既有覆盖顺序。
不传 `density` 保留旧表格尺寸和紧凑工具按钮。密度仅影响当前实例，不修改全局主题和相邻表格。

## 编辑模式使用一个配置项

```ts
const config = { density: 'compact', edit: 'row', pagination: false } as const
```

| edit                      | 行为           |
| ------------------------- | -------------- |
| `false` / `'none'` / 不传 | 只读           |
| `true` / `'modal'`        | 弹窗编辑       |
| `'row'`                   | 整行编辑       |
| `'cell'`                  | 单元格编辑     |
| `'both'`                  | 行与单元格编辑 |

需要保存回调、标题或宽度时升级为对象，不增加额外开关：

```ts
const config = {
  density: 'compact',
  edit: { mode: 'row', onSave: saveRow, onError: reportError },
  selection: true,
  pagination: { remote: true, total: 100, pageSize: 20 },
}
```

运行时修改密度保留草稿；修改编辑模式或关闭编辑会清理旧草稿。正在校验或保存的旧会话不能恢复草稿，旧结果也不会继续发出本地数据补丁。已经交给业务 `onSave` 的请求由业务自行取消或完成，组件不能撤销服务器写入。模式切换本身不会触发业务取消回调或自动保存。

绑定 `crud` 且提供 `crud.save` 时，CRUD 的函数式 `actions.edit` 视为保存能力标记：点击铅笔按配置打开内置编辑器，确认后才通过 `crud.save` 保存一次。自定义打开方式显式放在 `config.actions.edit`；没有独立 `save` 的外部绑定仍保留原有函数行为。

分页、树表、虚拟滚动、选择、导出继续使用各自的分组配置。它们是可组合能力，不设隐含开启多种行为的“万能模式”。

多表分屏请参阅[分割面板](./split-pane.md)；表单优先级与布局示例请参阅[表单密度](./form-density.md)。

## 展开、序号和弹性业务列

默认辅助列宽度：选择列 `40px`、展开列 `40px`、序号列 `50px`。普通未固定的业务列不再被统一填上 `width: 180`；未指定宽度时，它按首选最小宽度吸收容器余量。有辅助列和自然弹性业务列时，默认使用原生 `fixed` 表格布局，避免空余空间把展开与序号撑大：

```ts
const columns: TableColumn<Order>[] = [
  { type: 'selection' },
  { type: 'expand' },
  { type: 'index' },
  { key: 'name', title: '订单名称', minWidth: 220 }, // 自然弹性列
  { key: 'amount', title: '金额', width: 140 },
]
```

不需要给每张表写辅助列 CSS。显式列 `width / minWidth / maxWidth / fixed / className / cellProps` 保持转发；`config.display.columnWidth`（包括全局配置中的显式 `180`）仍表示统一列宽。固定业务列继续使用可计算的数值默认宽度；原生 `table-layout` 属性可覆盖自动选择的布局。

若所有业务列都显式指定宽度，且总宽小于容器，保留原生表格的剩余空间分配规则；这时声明的 `width` 不保证等于最后测量的像素。通常让名称或描述列保持弹性，比给所有列设宽更合适。虚拟横向滚动仍需按 Naive UI 的契约提供具体列宽。

独立的列 `renderExpand` 直接转交原生表格；配置 `config.expand.onLoadData / renderContent` 后由组件的加载、失败重试和内容渲染器接管展开区。不要同时配置两套展开内容并依赖原生渲染器优先。自动横向滚动宽度按最终可见列计算，包含辅助列、动态选择列和操作列，不再额外追加固定留白。

## 行拖拽的组合范围

`config.rowDrag: true` 按稳定 `rowKey` 重排当前页的顶层行。树表的子行、详情展开内容及合计行不参与拖拽；移动父行时其子树数据整体保留，不改变父子关系。过滤、排序与分页后的行位置会映射回原始数据，其余页和隐藏行保持不变。使用侧继续接收 `update:data` 和 `row-move`，无须自行计算 DOM 下标。

纵向 `config.virtualScroll` 或横向 `virtualScrollX` 开启时，行拖拽自动停用，避免局部窗口错误重排完整数据；退出虚拟模式后恢复。拖拽期间数据被替换或身份变化，会丢弃该次排序。行键必须唯一、稳定，数字与字符串按各自类型区分。空数据后加载、错误视图恢复等表体重新出现的场景会自动连接拖拽实例。

## 内容列宽与状态颜色（0.24）

`C_Table` 未声明 `width` 的业务列默认按表头和显示文字测宽，均匀抽样最多 100 条已加载数据，默认 80–360px。`minWidth/maxWidth` 可调整边界；显式列宽、原生百分比宽度、列设置后的宽度和 `display.columnWidth` 优先。`autoWidth: false` 恢复原统一默认 180px。横向虚拟化同样使用数值测宽，不依赖浏览器扫描所有行；长内容默认省略并提供 tooltip。

```ts
const columns = [
  { type: 'index' },
  { key: 'customer', title: '客户', maxWidth: 280 },
  { key: 'status', title: '状态', dictionary: 'order-status', status: true },
  {
    key: 'planStatus',
    title: '计划状态',
    status: {
      S1B: { label: '待复核', color: 'danger' },
      S1C: { label: '已完成', color: 'success' },
      special: { label: '特殊处理', color: '#8b5cf6' },
    },
  },
]
```

状态列复用 Naive UI 标签和主题。支持 `success/warning/danger/info/neutral`，也支持 Naive 的 `error/default/primary` 和 CSS 颜色。未知代码保持中性；`0/false` 是有效值，空值保留空态。显式 render 优先；formatter/字典文字会用于默认颜色判断和测宽。状态配置只改变展示，不会改写数据、排序、筛选或导出。

测宽不额外挂载或执行 render；图标、进度条和复杂自定义内容请显式指定 width。数据与字典更新会触发新的有界测量，配置和缓存只属于当前组件实例。此版本将未声明宽度的业务列由自然布局改为有界内容宽度；既有显式布局及原生 table-layout 覆盖仍保留。

表头默认完整展示，不随单元格 ellipsis 配置省略。所有业务列的最小宽度计入完整标题及排序/筛选控件；初始布局、显式窄列宽、恢复列设置与拖拽缩列均受此下限保护。360px 仅限制数据内容测宽；标题更长时允许超过该值，并使用表格内部横向滚动。复杂自定义标题请配置 minWidth。
