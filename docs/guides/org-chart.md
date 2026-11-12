# C_OrgChart：组织卡片与汇报关系

`C_OrgChart` 展示单根、单父级的组织树：部门、负责人、岗位和下级关系。卡片布局、视窗和连线由组件管理。部门目录、授权勾选和虚拟滚动使用 `C_Tree mode="org"`；部门/人员表单选择使用 TreeSelect、Select 或 DataPicker。

## 最小接入

```vue
<script setup lang="ts">
  import { C_OrgChart } from '@robot-admin/naive-ui-components/C_OrgChart'
  import '@robot-admin/naive-ui-components/C_OrgChart/style.css'

  const company = {
    id: 0,
    label: '研发中心',
    subtitle: '负责人：陈经理',
    children: [{ id: 1, label: '平台部', subtitle: '6 人' }],
  }
</script>

<template>
  <div style="height: 480px">
    <C_OrgChart
      :data="company"
      fit-on-init
    />
  </div>
</template>
```

默认字段继续使用 `id/label/children/subtitle/avatar`。数字 `0` 是有效键，不与字符串 `"0"` 混淆。`className`、`collapsed` 和旧 `OrgChartNode.data` 均保留。键在整棵树中必须唯一；无效键、重复键和循环引用的分支会跳过，避免无限递归。

默认点击只触发 `node-click`，保留旧版没有选择背景的行为。传入 `selectedKey`、`defaultSelectedKey`，或显式调用 `locate()` 才启用选择反馈。原有 `node-click/node-expand/node-collapse` 事件继续返回原节点。

## 直接消费业务节点

业务 interface 不需要添加 `Record` 索引签名，也不需要先转成 `OrgChartNode`。`data` 推导插槽与事件中的业务类型，字段名由配置映射。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_OrgChart,
    type OrgChartExpose,
    type OrgChartKey,
  } from '@robot-admin/naive-ui-components/C_OrgChart'

  interface Department {
    code: number
    title: string
    leader: string
    portrait?: string
    headcount: number
    units?: Department[]
  }
  const department: Department = {
    code: 0,
    title: '研发中心',
    leader: '陈经理',
    headcount: 12,
    units: [{ code: 1, title: '平台部', leader: '张经理', headcount: 6 }],
  }
  const chart = ref<OrgChartExpose<Department>>()
  const selected = ref<OrgChartKey | null>(0)
  const expanded = ref<OrgChartKey[]>([0])
  const locatePlatform = () => chart.value?.locate(1)
</script>

<template>
  <button
    type="button"
    @click="locatePlatform"
    >定位平台部</button
  >
  <C_OrgChart
    ref="chart"
    v-model:selected-key="selected"
    v-model:expanded-keys="expanded"
    :data="department"
    key-field="code"
    label-field="title"
    children-field="units"
    subtitle-field="leader"
    avatar-field="portrait"
  >
    <template #node="{ node, isSelected, select }">
      <button
        type="button"
        :aria-pressed="isSelected"
        @click="select"
      >
        {{ node.title }} · {{ node.headcount }} 人
      </button>
      <div>{{ node.leader }}</div>
    </template>
  </C_OrgChart>
</template>
```

`#node` 在每一层生效，提供 `{ node, key, isLeaf, isExpanded, isSelected, select, toggle }`。`node` 是原业务对象，负责人、状态、人数等业务字段直接读取。自定义内容负责自身的可访问性；用原生按钮绑定 `select()` 可直接获得 Enter/Space 操作。独立的详情/管理按钮不会误触发节点选择，避免把按钮嵌套在另一个按钮内。

## 展开、选择和定位

| 配置/方法                              | 行为                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `selectedKey` / `defaultSelectedKey`   | 受控/初始选择；`null` 表示不选中                                       |
| `expandedKeys` / `defaultExpandedKeys` | 受控/初始展开键集合，空数组表示全部折叠                                |
| 未配置展开属性                         | 延续节点 `collapsed` 语义，默认展开；节点的 `collapsed` 后续改变会同步 |
| `update:selectedKey(key, node)`        | 点击或定位提出的选择变更，第二参数是原业务节点                         |
| `update:expandedKeys(keys, node)`      | 展开/折叠或定位提出的完整展开集合；定位时第二参数是目标节点            |
| `getNode(key)`                         | 在已提供的数据中查找原业务节点，未找到返回 `null`                      |
| `locate(key)`                          | 展开祖先、建议选中目标并居中，返回 `Promise<boolean>`                  |

组件不修改传入节点、子数组或受控键集合。受控模式只发出变更建议，父组件接受后才更新图。`locate()` 在父组件同步接受展开后会完成定位；目标不存在、仍被折叠、容器没有可测量尺寸、数据已被替换或操作被取消时返回 `false`。异步业务拒绝/延迟展开时，应在接受状态后再次调用定位。

`default*` 属性只负责初始化。显式 `defaultExpandedKeys` 使用键集合管理展开，不再跟随各节点 `collapsed`；二者不混用。非受控内部状态仍按稳定键保留，替换数据不会把手动展开写回业务对象。

## 布局、连线与主题

- `direction="vertical | horizontal"`：上下或左右层级。
- `lineStyle="straight | rounded | stepped"`：边缘锚点之间的直线、圆角折线、直角折线，默认 `rounded`。
- `nodeSpacing/levelSpacing`：兄弟间距/层级间距；`lineColor/lineWidth`：可选连线样式。
- 连线读取真实卡片尺寸；卡片内容、头像、方向和容器尺寸变化后按帧合并测量，缩放时与卡片共用坐标系。
- 默认卡片、选择态、连线与控件跟随 `NConfigProvider` 的明暗主题，变量限定在组件根内。

视窗支持滚轮缩放、空白区域拖动、`zoomIn()/zoomOut()/resetView()`、`fitView()`，并公开当前 `zoom`。`initialZoom/minZoom/maxZoom` 控制缩放范围。`fitOnInit` 会在初次显示和后续布局变化时适配内容；手动缩放、平移或定位后暂停自动全景适配，防止覆盖当前阅读位置。显式 `fitView()`、替换根数据或切换方向后恢复自动适配。`resetView()` 回到初始比例与位移。

## 能力边界

这是 DOM 卡片组织树，折叠会卸载隐藏子树，**没有图节点窗口化或懒加载请求引擎**。大组织建议先限制展示层级、按业务范围给数据，目录检索交给具备虚拟滚动/远程路径能力的 `C_Tree`。不要一次展开数千张复杂卡片。

组件不负责人员权限、部门负责人解析、后端组织变更、拖拽重组、多父级矩阵关系或审批引擎。本轮也未加入导出 API。需要复杂关系图时使用专门图能力，保持组织目录、表单选择和架构图之间的边界。

公开类型包括 `OrgChartNode/OrgChartProps/OrgChartKey/OrgChartDirection/OrgChartLineStyle/OrgChartSlots/OrgChartNodeSlotProps/OrgChartEmits/OrgChartExpose`。旧 `InstanceType<typeof C_OrgChart>` 实例引用仍可使用；业务节点实例可直接使用 `OrgChartExpose<Department>`。
