# C_Tree：树状态与原生能力

`C_Tree` 在 Naive UI Tree 上提供搜索、工具栏、菜单/文件/组织预设和节点操作。过滤、级联勾选、半选、键盘、拖拽与虚拟滚动继续由 `NTree` 实现。

## 最小接入与密度

```vue
<C_Tree
  v-model:selected-keys="selected"
  :data="departments"
  density="compact"
  :addable="false"
  :refreshable="false"
  @node-select="loadDepartmentRecords"
/>
```

默认字段仍是 `id`、`name`、`children`，已有调用不需要改数据。`data` 接受普通业务对象数组，不要求业务 interface 添加字符串索引签名或强制转型。身份、标题和子级字段由 `keyField/labelField/childrenField` 映射；事件与方法继续提供原生节点上下文，不会为了适配复制或修改输入数据。`density="default | compact | comfortable"` 与表单、搜索表单、表格使用同一协议；对应树节点高度为 34/28/40px，工具栏控件使用 medium/small/large。

主题颜色来自 `NConfigProvider`。长标题省略并保留原生 title；操作在悬停和键盘聚焦时显示，在触屏/窄屏始终显示。工具栏按容器宽度换行，不需要为左树右表侧栏写固定搜索宽度。

## 官方能力放进一个 treeProps

```vue
<C_Tree
  v-model:selected-keys="selected"
  v-model:expanded-keys="expanded"
  v-model:checked-keys="checked"
  v-model:search-pattern="keyword"
  :data="departments"
  :tree-props="{
    keyField: 'uuid',
    labelField: 'title',
    childrenField: 'nodes',
    disabledField: 'inactive',
    checkable: true,
    cascade: true,
    checkStrategy: 'child',
    showIrrelevantNodes: false,
    expandOnClick: true,
  }"
/>
```

除 `data` 以外，`treeProps` 使用已安装 Naive UI 的 `TreeProps` 类型。`multiple`、`allowDrop`、`nodeProps`、`overrideDefaultNodeClickBehavior`、`getChildren`、`renderSwitcherIcon`、`indeterminateKeys` 等均直接交给官方组件。无需给每个功能新增包装层属性，也不需要再封装一层业务树。

**配置优先级**：显式包装层属性 > `treeProps` > `mode` 预设 > 包装层默认值。这个优先级适用于重叠的字段、拖拽、连线、默认状态与受控状态。`actions: []` 能明确关闭预设操作；`draggable: false`、`showLine: false` 能覆盖菜单预设。图标 `typeMap/colorMap` 按键合并。`treeProps.themeOverrides` 能覆盖密度对应的原生节点高度。

新增状态不受控时，保留 `defaultSelectedKeys/defaultExpandedKeys/defaultCheckedKeys` 的初始化语义；后续要响应外部变更请使用三个 `v-model`。官方的 `watchProps` 也被保留。外部替换数据时，包装层保留 key 状态，不裁剪暂时不在当前数据中的受控 key，适用于分批加载和恢复选择。

`defaultExpandAll`、工具栏和实例 `expandAll()` 只展开已经加载的父节点，避免一次操作递归拉取整棵后端树。非受控“全部展开”期间新出现的已加载父节点会加入展开；手动折叠后不再自动打开。受控时新增节点的展开 keys 由父组件维护。搜索展开和清空后恢复交给 Naive UI。

`searchPattern` 是真正受控值：空字符串表示清空。未提供时搜索框使用内部状态。若在 `treeProps.pattern` 中控制关键词，同样通过 `update:searchPattern` 接收输入。

## 事件与方法

三个 `update:selectedKeys`、`update:expandedKeys`、`update:checkedKeys` 都保留官方的 `(keys, options, meta)`。`meta` 保留操作节点和 select/unselect、expand/collapse/filter、check/uncheck 动作；实例命令没有具体操作节点时 `meta.node` 为 null。已有 `node-select`、`node-action`、`node-drop`、`add`、`refresh` 保留。

`treeProps` 内的官方回调仍会调用一次。不要把同一个业务副作用同时绑定到包装事件和原生回调。

实例提供：

- `expandAll()`、`collapseAll()`、`selectNode(key)`、`clearSelection()`。
- `setCheckedKeys(keys)`、`clearChecked()`；输入 keys 交给官方级联/半选规则，不自行模拟“全选所有后端节点”。
- `getSelectedNode()`、`getCheckedData()`、`getIndeterminateData()`。
- 官方 `scrollTo()` 的所有重载，以及 `expandedKeys/selectedKeys/checkedKeys` 引用。

`getCheckedData()` 返回官方的完整已勾选数据；`checkStrategy` 影响更新回调 keys，二者不能假设恒等。受控模式下实例方法发出更新建议，最终状态仍由父组件接受的值决定。

## 渲染与空态

```vue
<C_Tree :data="nodes" :tree-props="{ nodeProps: bindContextMenu }">
  <template #label="{ option, selected, checked }">
    <span>{{ option.name }}</span>
  </template>
  <template #suffix="{ option }"><NodeActions :node="option" /></template>
  <template #empty><EmptyState title="暂无匹配的部门" /></template>
  <template #toolbar-actions><NButton @click="reload">刷新部门</NButton></template>
</C_Tree>
```

`label/prefix/suffix` 插槽优先于 `treeProps.renderLabel/renderPrefix/renderSuffix`，最后使用包装层默认渲染。原生节点的 `prefix/suffix` 函数也会保留。上下文信息是官方的 `{ option, selected, checked }`。状态标签和预设按钮属于默认渲染，自定义插槽可完全接管。

## 异步加载：保持官方协议和数据所有权

在 `treeProps.onLoad` 中返回 Promise，未加载节点设为 `isLeaf: false`。成功时由使用侧更新响应式树数据；包装层不修改传入数组，也不把 Promise 返回值擅自塞到 children。官方负责同节点加载去重与加载图标。

```vue
<C_Tree
  :data="nodes"
  :tree-props="{ onLoad: loadChildren }"
  @load-error="showLoadFailure"
/>
```

拒绝会触发 `load-error(error, node)`，并转为官方支持的 `false` 结果，结束加载状态且不产生无人处理的 Promise rejection。按官方交互折叠后再次展开即可重试。替换根数据或卸载后，旧加载失败不再向当前页面报错。

**后端请求的取消和过期写入由请求所有者处理**。包装层无法取消使用侧闭包中已经发出的请求，也无法拦截闭包直接修改数据的行为。切换公司、切换查询、换根节点或卸载时，应取消旧请求，并在提交数据前检查请求代次。例如：

```ts
let generation = 0
let abort = new AbortController()

function invalidateLoads() {
  generation++
  abort.abort()
  abort = new AbortController()
}

async function loadChildren(node: TreeNodeData) {
  const current = generation
  const signal = abort.signal
  try {
    const children = await fetchChildren(node.id, { signal })
    if (signal.aborted || generation !== current) return false
    // 在使用侧基于最新数据不可变更新；不要写回已替换的旧节点引用。
    nodes.value = replaceNodeChildren(nodes.value, node.id, children)
  } catch (error) {
    if (signal.aborted || generation !== current) return false
    throw error
  }
}

onBeforeUnmount(invalidateLoads)
```

示例中的 `fetchChildren/replaceNodeChildren` 是应用自身的请求和树数据更新方法。空结果应写入 `children: []` 并将该节点置为 `isLeaf: true`。搜索已加载数据不能替代服务端全树搜索，未加载节点的权限全选也需要后端契约。

## 大树与验证边界

```vue
<C_Tree
  style="height: 480px"
  :data="nodes"
  density="compact"
  :tree-props="{ virtualScroll: true, animated: false }"
/>
```

空数据或隐藏无关节点时的零搜索匹配会自动退回普通原生树，保证最低版本的虚拟列表也显示官方空态。匹配探针使用已有索引且不会生成另一棵树；自定义 filter 应保持纯函数。

必须给容器确定的高度。组件不额外设置行 margin/min-height，虚拟列表测量与 `themeOverrides.nodeHeight` 使用同一高度。自定义插槽若换行或使用可变高度，需改为非虚拟模式，或保证内容不会超过配置高度。

辅助遍历采用共享迭代索引，避免深层递归及宽树的展开参数溢出；没有深度 watch 和跨数据集的历史节点缓存。这不意味着浏览器渲染无限量节点：大树仍应开启虚拟滚动并按需加载。

已验证自定义字段、冻结输入、受控/非受控状态、原生级联/禁用勾选、模式覆盖、插槽/原生事件、失败重试、同节点加载去重、替换/卸载后的过期失败、主题与密度高度。15 万个同层节点及 2 万层数据仅验证包装层辅助索引的迭代安全，**不是 NTree 的渲染承诺**。输入交给官方前仍需保证唯一 key、合法且无环的树结构。浏览器拖拽、超大数据真实帧率和具体业务权限树需在应用中验证。

## 官方依据

核对日期：2026-10-19。已对 Naive UI 2.35.0、2.44.1、2.45.3 分别运行同一组 14 项真实挂载契约；最低版与 2.44.1 的原生类型也单独核对。构建使用 Naive UI 2.45.3；原生选项是否可用取决于使用侧安装版本，不能把当前官网的新选项默认视为所有 `^2.35.0` 版本都支持。

- [Naive UI Tree API（官方源码文档）](https://github.com/tusen-ai/naive-ui/blob/main/src/tree/demos/zhCN/index.demo-entry.md)
- [Naive UI Tree 实现](https://github.com/tusen-ai/naive-ui/blob/main/src/tree/src/Tree.tsx)
- [官方异步加载示例](https://github.com/tusen-ai/naive-ui/blob/main/src/tree/demos/zhCN/async.vue)

`wl-ui-produce` 目前是 Element Plus 技术栈，其本地 `C_Tree` 提供 Tab、搜索、节点插槽和选中高亮。截至本次只读检索未发现 `src/views` 对该本地树的直接调用，不能据此宣称真实业务已完成迁移。标签切换仍由应用的 `NTab`/`C_Tabs` 组合，后端树权限、全量搜索与数据请求保留在页面逻辑中。
