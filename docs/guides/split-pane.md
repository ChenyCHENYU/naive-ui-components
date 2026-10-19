# 分割面板与复杂多表布局

`C_SplitPane` 是布局组件：`horizontal` 左右分栏，`vertical` 上下分栏，按相同方式嵌套即可组合左树右表、主从表、三表及工作台。两个 slot 都直接渲染，组件引用、表格选择和未保存编辑不会因拖动重建。

## 最少配置

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { C_SplitPane } from '@robot-admin/naive-ui-components/C_SplitPane'
  import '@robot-admin/naive-ui-components/C_SplitPane/style.css'

  const size = ref(30)
</script>

<template>
  <div class="workbench">
    <C_SplitPane
      v-model:size="size"
      :min-first-size="240"
      :min-second-size="320"
    >
      <template #first><DepartmentTree /></template>
      <template #second><OrderList /></template>
    </C_SplitPane>
  </div>
</template>

<style scoped>
  .workbench {
    height: 100%;
    min-height: 0;
    min-width: 0;
  }
</style>
```

省略 `size` 即使用内部状态，`defaultSize` 默认 50%。`v-model:size` 由应用持有当前百分比，适合与页面路由、用户偏好或业务布局状态组合。组件不直接访问 localStorage，避免多账号、多租户、页面之间污染。

`size/defaultSize/minSize/maxSize/step` 始终使用百分比；`minFirstSize/minSecondSize/gutterSize` 使用 px。百分比按**扣除手柄后的可用空间**计算，两个面板总比例为 100，手柄不再从两侧各扣半宽，折叠面板为合法的零宽/零高。

## 三表与树表组合

```vue
<C_SplitPane v-model:size="treeSize" :min-first-size="220" :min-second-size="520">
  <template #first><DepartmentTree /></template>
  <template #second>
    <C_SplitPane
      v-model:size="masterSize"
      direction="vertical"
      :min-first-size="220"
      :min-second-size="180"
    >
      <template #first="{ collapsed }">
        <OrderTable v-if="!collapsed" />
      </template>
      <template #second>
        <C_SplitPane :default-size="50" :min-first-size="220" :min-second-size="220">
          <template #first><OrderDetails /></template>
          <template #second><DeliveryDetails /></template>
        </C_SplitPane>
      </template>
    </C_SplitPane>
  </template>
</C_SplitPane>
```

每个 `C_SplitPane` 负责自己的约束、键盘焦点和滚动容器。页根、Tabs 内容、slot 内的卡片与表格父容器都需要可计算的高度；使用 flex 布局时，中间层设置 `min-height: 0; min-width: 0`。仅设置表格 `height:100%` 无法补齐上级容器缺失的高度。

两种滚动方式按内容选用：

- 表格工作区：slot 根节点撑满面板，`C_Table flex-height` 在该高度内滚动；工具栏、搜索区与分页占用工作区自身的空间。不要给每一层卡片重复添加页面滚动。
- 文档或纵向长工作台：保持面板内容的默认 `overflow:auto`，固定高度表格在内部滚动，面板负责其余纵向内容。

`#first/#second` 都提供 `{ size, collapsed }`。默认折叠只隐藏布局并设置 `inert/aria-hidden`，保留组件状态；大型表格可选择 `v-if="!collapsed"` 释放观察器与渲染工作，但卸载也会丢失未外置的选择、列状态与编辑状态。需要保留状态时保持挂载，通过表格自身的 ResizeObserver 感知展开；第三方表格要求显式 `doLayout` 时，在对应 Tab/dialog 激活后调用其公开布局方法。

不要在 SplitPane 内注入表格实例，也不要把 `@resize` 绑定成每个表格查询/数据刷新的触发器。拖动只改变容器尺寸，不应请求业务数据。

## 约束与边界

| 配置                               | 单位 / 默认  | 含义                                                     |
| ---------------------------------- | ------------ | -------------------------------------------------------- |
| `size` / `v-model:size`            | % / 未设置   | 受控首面板比例；父组件接受 `update:size` 后生效          |
| `defaultSize`                      | % / 50       | 非受控初值；`resetSize()` 也使用当前默认值               |
| `minSize / maxSize`                | % / 0 / 100  | 首面板可拖动比例范围；反向配置会自动排序                 |
| `minFirstSize / minSecondSize`     | px / 0       | 展开时各面板的实际宽度或高度下限                         |
| `direction`                        | `horizontal` | 左右；`vertical` 为上下                                  |
| `gutterSize`                       | px / 6       | 手柄占用空间，最小 4                                     |
| `step`                             | % / 2        | 方向键每次调整量                                         |
| `collapsible / showCollapseButton` | true / true  | 是否允许折叠、是否显示折叠按钮                           |
| `disabled`                         | false        | 禁止用户拖动、键盘调整及折叠按钮；公开方法仍可供应用控制 |

像素约束随容器 ResizeObserver 和方向变化重新计算；`minSize/maxSize/minFirstSize/minSecondSize/step` 动态修改后立即使用新值。显式折叠可越过展开时的最小尺寸。容器比两个像素下限之和更小时，按两者比例分配可用空间，再遵守百分比范围，避免负尺寸和溢出；这时应用应视实际业务切换单表/Tab 布局，而不是宣称小屏仍可完整容纳任意多表。

已有非受控用法保持兼容。百分比在旧实现中包含整条手柄，现在按剩余空间分配，可消除边缘负尺寸；默认 6px 手柄下，50/50 布局不变，非对称布局只有几个像素的修正。

## 交互与无障碍

手柄采用细轨道与居中胶囊握柄，默认长 80px、厚 16px，保留三点拖动提示。悬停和键盘聚焦时，在握柄两侧显示折叠入口，并以局部描边和轻阴影提示当前状态；折叠后入口持续显示。横向、纵向使用相同视觉规则，主题颜色复用 `--c-primary / --c-bg-card / --c-border / --c-text-3`。

胶囊是独立的实际拖动区域，其视觉厚度不会改变 `gutterSize` 占用的布局空间。触屏下握柄厚度增至 24px、折叠按钮增至 28px，并保持按钮常驻；折叠到边缘时控件向容器内部停靠，避免被裁切。箭头使用本地 SVG，不请求远程图标。

键盘交互与 separator 语义参照 [W3C APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)。可用 `aria-label="订单主表"` 设置面板对应的可访问名称。

- 拖动支持鼠标、触控笔和触屏 Pointer Events，不接管宿主的 `document.onmousemove`。
- 拖动结束、pointercancel、窗口失焦、页面隐藏、动态禁用、方向切换和卸载都会移除监听、恢复此前的光标与文本选择样式。
- 左右布局使用 Left/Right，上下布局使用 Up/Down；Shift 将 `step` 放大 10 倍，Home/End 到当前可用边界。
- Enter 折叠首面板，已折叠时还原；双击手柄折叠/展开首面板。按钮有明确的展开状态、目标面板、可见焦点和触屏常驻入口。
- `role="separator"` 提供 orientation、当前百分比、真实上下限和唯一的受控面板 ID。折叠内容不能通过 Tab 获取焦点。

`resize(first, second)` 表示实际显示比例变化，`update:size(size)` 用于受控状态更新；`drag-start/drag-end` 可记录拖动会话。`collapse/expand` 表示实际折叠状态变化。暴露 `setSize/resetSize/collapse/expand/toggle/getPanelInfo`，应用无需查找或操作内部 DOM。

## 与 wl-ui-produce 的对应关系

本轮只读对比 `wl-ui-produce` 的真实 `jh-drag-row` 调用（3 个 Vue 文件；当前 src 未发现 col 标签）、`@jhlc/common-core` 安装源码/声明以及本地布局规范 14，未修改该项目，也未更换其 BaseTable/AG Grid 或 Element Plus 技术栈。

| 生产项目证据                                                                       | C_SplitPane 对应能力 / 边界                                                                                                                |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 规范 14 的 `jh-drag-col` 左树右表示例、`leftWidth=240`（当前 src 无真实 col 调用） | 同类左右布局。这里保留百分比初值与双向绑定，新增各面板 px 最小值；**不提供** `leftWidth/rightWidth` 固定像素初值别名                       |
| `c_steelMasterDetail` 使用 `jh-drag-row`，`top-height=390/470`                     | 同类上下主从布局，`direction="vertical"`；默认比例应按页面高度设计，精确 px 初值可由应用测量后换算，不把 px 值直接传给百分比 `defaultSize` |
| 本地规范 14：原生 slot、多层嵌套和完整高度链                                       | 直接渲染 slot；组件自身包含 min-height/min-width:0，页面和 Tabs 的外部高度链仍由应用保证                                                   |
| `c_steelListPanel` 自己观察 panel 并调用 `table.doLayout`                          | 同样保持布局与表格职责分离；原生 C_Table 的 flexHeight 负责表内尺寸适配                                                                    |
| `c_steelWorkstation` 还有多 Tab 表单、流别/物料表和页面级纵向滚动                  | 这是工作台业务组合；分割面板能提供尺寸布局，不能替代查询/编辑/主从关系/Tab 状态与流程管理                                                  |
| 规范 FAQ 提及 common-core 可配置像素阈值                                           | 安装包部分源码/声明被裁剪，未据此推断其完整实际 API；本库的像素约束以自身实现和测试为准                                                    |

因此两者的分割手柄属于同一类机制；C_SplitPane 能作为复杂多表布局基础，但不能保证“任意业务场景零配置覆盖”。交叉冻结列、树表权限、主从联动、编辑提交、业务事务和超长工作台仍由各自组件与应用组合完成。
