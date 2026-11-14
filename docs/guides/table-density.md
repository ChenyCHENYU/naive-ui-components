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

显式 `compact` 且表格最终尺寸为 `small` 时，普通单元格内距为 `2px 8px`、表头内距为 `4px 8px`，通过 Naive 公开 `themeOverrides` 的 `tdPaddingSmall / thPaddingSmall` 设置。密度几何优先于父 Provider 的这两项内距；表格局部 `theme-overrides` 显式值最后合并，仍可覆盖密度。Provider 的颜色等其他主题项继续继承，嵌套表格和相邻原生表格互不改写。显式 `display.size: 'large'` 或原生 `size="large"` 不应用 compact 内距。操作列复用当前密度的单元格内距，未声明密度时保留 `8px 12px`。

已勾选的行默认在首个单元格内显示 `2px` 主色标识，不增加列宽或行高。选择列的 Checkbox 与单选 Radio 均适用；展开子表的勾选不会误标父行。可在表格 `style` 中设置 `--c-table-selected-marker-width: 0px` 关闭，或调整为其他宽度。此标识只反映已有勾选状态，不创建当前行、不把业务 `aria-selected` 转换为多选；业务当前项仍由页面自己的行属性控制。样式使用项目既有现代浏览器支持的 `:has()`。

未声明 `config.selection` 时，显式 `{ type: 'selection' }` 列自动启用选择；全局或局部显式 `false / { enabled: false }` 仍优先，并让选择控件呈禁用态。启用后的禁选规则继续组合列 `disabled` 与 `selection.rowCheckable`，不会改写原列定义。

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

## 展开、序号和自动业务列

默认辅助列宽度：选择列 `40px`、展开列 `40px`、序号列 `50px`；操作列默认 `180px`。这些结构列保持紧凑，默认不参与拖宽。未指定宽度的普通业务列按表头和显示内容测量基准，并按基准比例分配容器余量；空间不足时保留基准宽度，在表格内横向滚动。无需给某个名称或描述列单独配置填充行为：

```ts
const columns: TableColumn<Order>[] = [
  { type: 'selection' },
  { type: 'expand' },
  { type: 'index' },
  { key: 'name', title: '订单名称', minWidth: 220 }, // 自动测宽并参与余量分配
  { key: 'amount', title: '金额', width: 140 },
]
```

不需要给每张表写辅助列 CSS。显式列 `width / minWidth / maxWidth / fixed / className / cellProps` 保持生效；`config.display.columnWidth`（包括全局配置中的显式 `180`）仍表示统一列宽，完整表头下限始终优先。显式宽度、已保存的手动宽度及 `autoWidth: false` 列不参与余量分配，固定业务列仍可参与自动测宽。

所有业务列都显式定宽时，保留这些宽度，不挑选某一列吸收余量。数值列宽决定业务列及横向滚动范围；有固定右区时，画布同时覆盖可用视口。需要 Naive UI 原生布局及 `scrollX` 最小宽度语义时，显式传 `table-layout="fixed"` / `table-layout="auto"`；可见的百分比等非数值宽度同样沿用原生布局。横向虚拟化默认使用包内计算出的数值列宽。

独立的列 `renderExpand` 直接转交原生表格；配置 `config.expand.onLoadData / renderContent` 后由组件的加载、失败重试和内容渲染器接管展开区。不要同时配置两套展开内容并依赖原生渲染器优先。自动横向滚动宽度按最终可见列计算，包含辅助列、动态选择列和操作列，不再额外追加固定留白。

## 行拖拽的组合范围

`config.rowDrag: true` 按稳定 `rowKey` 重排当前页的顶层行。树表的子行、详情展开内容及合计行不参与拖拽；移动父行时其子树数据整体保留，不改变父子关系。过滤、排序与分页后的行位置会映射回原始数据，其余页和隐藏行保持不变。使用侧继续接收 `update:data` 和 `row-move`，无须自行计算 DOM 下标。

纵向 `config.virtualScroll` 或横向 `virtualScrollX` 开启时，行拖拽自动停用，避免局部窗口错误重排完整数据；退出虚拟模式后恢复。拖拽期间数据被替换或身份变化，会丢弃该次排序。行键必须唯一、稳定，数字与字符串按各自类型区分。空数据后加载、错误视图恢复等表体重新出现的场景会自动连接拖拽实例。

## 内容列宽与状态颜色（0.24）

`C_Table` 未声明 `width` 的业务列默认按表头和显示文字测宽，均匀抽样最多 100 条已加载数据，内容测量基准默认 80–360px。该范围不是最终显示宽度上限：少列时自动业务列可按基准比例扩展，长表头也可超过 360px。`minWidth/maxWidth` 可调整边界；显式列宽、原生百分比宽度、列设置后的宽度和 `display.columnWidth` 优先。`autoWidth: false` 恢复原统一默认 180px。横向虚拟化同样使用数值测宽，不依赖浏览器扫描所有行；长内容默认省略并提供 tooltip。

```ts
const columns = [
  { type: 'index' },
  { key: 'customer', title: '客户', maxWidth: 280 },
  {
    key: 'status',
    title: '状态',
    formatter: {
      type: 'enum',
      fn: value => statusLabels[value] ?? String(value ?? ''),
    },
    status: true,
  },
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

测宽不额外挂载或执行 render；图标、进度条和复杂自定义内容请显式指定 width。数据与列配置更新会触发新的有界测量，视口变化只复用已有基准分配空间，不重新扫描行。配置和缓存只属于当前组件实例。拖动只改变目标列，150ms 偏好提交后仍保留其他列的实际宽度；真实容器宽度变化或重置列设置后，自动列重新参与分配。 操作列默认固定右侧；缩列余量由内部画布承接，固定右区不跟随表尾左移。自动列保存宽度后仍保留原来的省略、完整提示和默认最小宽度；原生链接或按钮同样支持尾部省略，主动多行可设置 `ellipsis: false`。

表头默认完整展示，不随单元格 ellipsis 配置省略。所有业务列的最小宽度计入完整标题及排序/筛选控件；初始布局、显式窄列宽、恢复列设置与拖拽缩列均受此下限保护。360px 仅限制数据内容测宽；标题更长时允许超过该值，并使用表格内部横向滚动。复杂自定义标题请配置 minWidth。

## 表格偏好与作用域

每张需要持久化的表格只声明一个稳定的逻辑 ID：

```ts
const config = { persistKey: 'shipping', density: 'compact' } as const
```

应用启动时，通过轻量入口 `@robot-admin/naive-ui-components/config` 的 `TABLE_GLOBAL_CONFIG_KEY` 提供全局 `persistPrefix` getter，示例见 [README](../../README.md#表格偏好按账号隔离)。值由项目已有响应式状态生成，可包含租户、公司、用户等项目需要的维度；组件不读取认证服务，也不要求特定身份字段。

- 启动时就声明 getter 或响应式字段；切换时更新值，不新增、删除配置字段。`C_Density` 实时转发该范围，区域密度不会锁定先前账号。
- 有效范围与表 ID 以独立元组编码；相同表 ID 在不同范围互不继承列显隐、顺序和宽度。A 尚未提交的拖宽会写回 A，随后加载 B；返回 A 可恢复 A 的已保存偏好。重置只删除当前范围、当前表的设置。
- 已声明范围但值为 `undefined`、空串或空白时禁用存储；不读取、迁移或回退到旧的未分范围缓存。未配置 `persistPrefix` 的旧项目保持原键兼容。
- 不传 `persistKey` 不会生成默认存储键；临时列设置在范围变化时清空。偏好始终属于表格实例及其范围，不写回原始业务列定义，也不修改相邻实例。

传入的范围字符串只判空，不规范化身份 ID。按需导入与全量安装使用相同的配置键；全量安装时也可把同一配置对象放在 `app.use` 的 `table` 选项中。

## 异步导出的快照与卸载

`export.requestData` 开始前，表格会固定本次导出的列、列级 formatter、全局 formatter 与文件配置。等待期间切换报表，旧请求仍按原报表快照导出；下一次导出使用新配置。`persistKey` 只控制偏好存储，不是业务请求的取消范围。

组件卸载后，尚在等待的数据请求或 XLSX 模块加载不会继续发起下载。已经执行的同步下载无法撤销；服务端请求本身的取消由业务处理。数据请求或下载失败时，`exportData()` 会拒绝给调用方，任务锁随即释放，可以重试；请求与下载尚未完成时，重复导出不会再启动一份任务。
