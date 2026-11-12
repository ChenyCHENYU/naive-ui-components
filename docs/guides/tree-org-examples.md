# 组织目录与架构图

`C_Tree` 适合侧栏检索、层级选择和节点操作；`C_OrgChart` 适合展示组织关系、折叠分支和画布定位。两者独立导入、独立持有状态。需要联动时由页面组合公开事件和 `locate()`，组件之间没有依赖。

库内演示使用独立页面，不改动业务项目：

```sh
bun run build
bun run dev:search-workflows
# http://127.0.0.1:4188/organization.html
```

演示通过发布包子路径导入构建产物。新增或修改组件实现后，先更新 `dist`；`check:search-workflows` 会检查演示类型并构建所有独立 HTML 入口。

## 先用配置，复杂展示再用插槽

目录中的公司、部门、负责人和人员可以直接使用原业务字段。`type-field` 负责读取节点类型；`icon-config.resolve` 可以根据展开、选中、叶子和加载状态决定图标，不需要把这些状态复制到业务节点。

```vue
<C_Tree
  :data="departments"
  key-field="code"
  label-field="name"
  children-field="nodes"
  type-field="kind"
  density="compact"
  :addable="false"
  :refreshable="false"
  :icon-config="{
    typeMap: { company: 'mdi:office-building-outline' },
    resolve: ({ option, expanded }) => {
      if (option.kind !== 'department') return undefined
      return {
        name: expanded ? 'mdi:folder-open-outline' : 'mdi:folder-outline',
        color: '#16837b',
      }
    },
  }"
/>
```

`undefined` 沿用 `icon-field`、`typeMap` 和默认图标；`null` 明确隐藏图标。`resolve` 也可以直接返回图标名。业务状态由 `option` 读取，例如用待入职、已停用等状态切换人员图标。

需要头像时使用 `#prefix`；需要人数等复合文字时使用 `#label`。插槽接管对应展示位置，因此 `#prefix` 会替代默认图标，`#suffix` 会替代默认操作区。演示仅在启用“人员头像”时提供 prefix，并在该插槽中保留部门状态图标。默认关闭头像时完全使用图标配置。

`prefix`、`label`、`suffix` 与 `tree-props` 的节点 renderer 均可读取 `option`、`selected`、`checked`、`expanded`、`isLeaf`、`loading`，其中 `option` 根据 `data` 推导业务类型。纯展示无需额外声明一套组件节点类型。

## 节点操作保留业务边界

权限和请求由页面管理，组件只呈现并拦截禁用或忙碌的操作：

```vue
<C_Tree
  :data="departments"
  :actions="[
    {
      key: 'sync',
      text: '同步',
      icon: 'mdi:refresh',
      disabled: node => !canManage || node.locked,
      loading: node => busyKey === node.id,
    },
  ]"
  @node-action="handleAction"
/>
```

`disabled` 和 `loading` 也接受布尔值。`loading` 自动阻止重复触发；带确认框的操作在确认时仍检查当前权限与忙碌状态。隐藏操作使用原有 `show(node)`。前端按钮状态不能代替服务端鉴权。

## 架构图直接消费原模型

默认字段为 `id / label / children / subtitle / avatar`，只传 `data` 即可展示默认卡片。不同业务字段使用扁平 props 映射，无需接入侧递归转换：

```vue
<C_OrgChart
  ref="chart"
  v-model:selected-key="selectedKey"
  v-model:expanded-keys="expandedKeys"
  :data="company"
  key-field="code"
  label-field="title"
  children-field="nodes"
  subtitle-field="role"
  avatar-field="picture"
  direction="vertical"
  line-style="rounded"
  fit-on-init
/>
```

`selected-key` 是单个 `string | number | null`；`expanded-keys` 是展开节点键数组。两者都是可选受控能力，不传时保持原有默认选择展示与节点 `collapsed` 行为。受控状态由使用侧接收更新，组件不修改传入节点或数组。

- `direction`：`vertical` 或 `horizontal`。
- `line-style`：`straight` 直线、`rounded` 圆角折线、`stepped` 直角折线。
- `fit-on-init`：按真实内容适配画布；公开 `fitView()` 可再次适配。
- `locate(key)`：展开祖先、选择并居中目标，返回 `Promise<boolean>`。受控展开时需要页面接受组件发出的更新；未接受且目标仍隐藏时返回 `false`。
- `getNode(key)`、节点事件与插槽均保留原业务节点，不附加 UI 状态。

复杂卡片可使用节点插槽。使用插槽提供的 `select()` 和 `toggle()`，避免接入侧重新实现选择或展开协议：

```vue
<C_OrgChart
  :data="company"
  key-field="code"
  label-field="title"
  children-field="nodes"
>
  <template #node="{ node, isSelected, select }">
    <article>
      <button type="button" :aria-pressed="isSelected" @click="select">
        {{ node.title }}
      </button>
      <span>{{ node.memberTotal }} 人</span>
    </article>
  </template>
</C_OrgChart>
```

插槽自行提供键盘可访问的主操作；原生按钮支持 Enter 和空格。不要嵌套按钮。默认卡片已有选择与折叠的键盘操作。

## 离线演示的业务边界

- 共 10 个演示节点，组织成员为 128 人。成员数来自独立业务统计，不能由当前 `children.length` 推断；成员明细不代表完整花名册。
- 两种数据模型在进入组件前冻结。选择、折叠、定位、权限开关和 busy 状态都由页面单独持有，交互回执检查原始数据未被改写。
- 所有头像使用本地生成 SVG 或 CSS，图标注册本地 MDI 子集。没有远程头像、Iconify API 或后端请求。
- “同步”只模拟约 1 秒的忙碌操作，用于验证按钮状态；不实现组织编辑、权限系统、成员查询或审批流程。

## 手动验收

1. 打开独立页面，目录显示公司、3 个部门和成员；总人数与实际展示节点数分别显示，卡片与目录的负责人、状态、人数一致。
2. 切换人员头像与紧凑模式；关闭头像后，部门图标随展开变化，待入职与停用人员使用对应状态图标。切换深色主题，文字、卡片、连线和操作均清晰可读。
3. 搜索部门或成员，选择结果；右侧展开对应祖先并定位。清空搜索后目录恢复，选择状态仍可理解。
4. 悬停或用键盘进入节点操作，执行同步；按钮出现 loading 并阻止重复触发。关闭管理权限后同步禁用；公司和停用人员始终禁用。查看资料仍可用。
5. 切换默认模型与业务字段卡片，分别切换横纵方向和三种连线；检查多个兄弟节点的连线完整且无断裂。点击“适应视野”可恢复完整可见范围。
6. 全部收起后定位“陆言”；工程研发部祖先展开，目标选中并居中。点击卡片标题或用 Enter / 空格选择，左侧目录与下方选择信息同步更新。
7. 滚轮缩放、拖动画布空白平移；节点选择与折叠按钮不误触平移。重复操作后回执仍显示“原始数据未改写”，网络面板无外部业务、图片或图标请求。

## 0.34.0 发布验证

- 完整 `bun run verify` 通过：525 项单测、692 项组件回归，以及源码、组件、消费者类型、公开导出、代码质量、构建和打包消费检查。Tree 专项包括 55 项挂载回归。
- 最低与最新依赖均全新安装验证。最低组合的原生 Node ESM 限制沿用既有说明；最低浏览器构建纳入 8 个公开组件和样式入口，双格式声明按 Node16/NodeNext 检查。
- 独立入口实测（含 Vue 等运行依赖）：Tree 首屏 JS gzip 约 125.5 KiB、CSS 1.1 KiB；OrgChart 约 38.4 KiB、CSS 1.6 KiB。新增 135/45 KiB 的 JS 门槛及双向依赖隔离断言，其他入口预算不变。双格式物理产物比 0.33.0 增加约 22 KiB，使用原有余量后追加 16 KiB 总包限额。
- 浏览器已操作图标/头像切换、节点折叠、操作 busy 与权限禁用、深层节点定位、横纵布局、三种 SVG 路径、旧默认数据、自定义卡片空格选择、明暗主题和 390px 视口；控制台无错误或警告。窄屏概况区域采用独立标题行与三列统计，页面没有横向溢出。

组织图仍是 DOM 卡片布局；大规模节点的窗口化、组织关系编辑及真实后端接入不在本轮范围。生产接入应继续按业务范围和展示层级控制数据量。
