# 工作流设计器

`C_WorkFlow` 用于编辑、校验和预览流程定义。它保留发起、审批、抄送、条件四类节点；或签、会签和顺序审批保存在审批节点配置中。无后端时，传入本地人员和流程数据即可演示编辑与保存。

组件输出设计数据，不执行审批任务、条件脚本、权限判断或通知投递。业务系统负责持久化与执行校验。平行网关、汇聚、任务调度、BPMN 导入等不属于当前模型。

## 最小接入

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_WorkFlow,
    type WorkflowData,
    type WorkflowConditionField,
  } from '@robot-admin/naive-ui-components/C_WorkFlow'
  import '@robot-admin/naive-ui-components/C_WorkFlow/style.css'

  const definition = ref<WorkflowData>({
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 160, y: 40 },
        data: { title: '发起申请', status: 'active' },
      },
    ],
    edges: [],
  })
  const fields: WorkflowConditionField[] = [
    {
      key: 'amount',
      label: '申请金额',
      type: 'number',
      operators: ['greater_than', 'less_than', 'equals'],
    },
    { key: 'urgent', label: '是否加急', type: 'boolean' },
  ]
  const users = [{ id: 'u1', name: '陈晨', department: '运营部', role: '主管' }]
  const save = (data: WorkflowData) => {
    localStorage.setItem('workflow-demo', JSON.stringify(data))
  }
</script>

<template>
  <div style="height: 640px">
    <C_WorkFlow
      v-model="definition"
      :users="users"
      :condition-fields="fields"
      :allowed-node-types="['approval', 'copy', 'condition']"
      :allow-cycles="false"
      @save="save"
    />
  </div>
</template>
```

点击节点设置人员或条件；节点下方的加号插入后续节点。拖动输出端口到另一节点顶部的输入端口建立连接。节点和连线均可按现有画布方式选择、移动、删除。首次打开节点配置时才加载配置面板和选人能力，关闭后丢弃未确认草稿。

新增连接禁止自连、重复边、无效端点和指向发起节点。`allowCycles` 默认为 `true`，维持通用流程的旧行为；无环审批业务应设为 `false`，同时限制连接与结构校验。该选项不会悄悄删除历史图中的环。

## 条件与实际分支

原有 `Condition.value` 始终是 `string`，旧消费者仍可直接使用字符串方法。`conditionFields` 为字段提供名称、类型与允许操作符；数字、布尔、日期使用对应编辑控件，分别保存为数值字符串、`'true' / 'false'`、`YYYY-MM-DD`。不传字段目录时继续使用原字段与校验方式；目录一旦传入，导入条件也必须使用目录中的字段。`operators` 可缩小该字段可选操作符。

条件可以使用以下可选属性：

| 属性           | 作用                                                         |
| -------------- | ------------------------------------------------------------ |
| `targetNodeId` | 本条分支指向的节点 ID；必须有一条同起点、同目标的实际连线    |
| `priority`     | 互不重复的非负整数，表达业务优先级；未指定时保留数组顺序     |
| `isDefault`    | 默认兜底声明，每个条件节点最多一个；其字段和值允许为空字符串 |

```ts
const conditions: Condition[] = [
  {
    id: 'large',
    name: '大额申请',
    field: 'amount',
    operator: 'greater_than',
    value: '10000',
    targetNodeId: 'finance',
    priority: 0,
  },
  {
    id: 'fallback',
    name: '其他申请',
    field: '',
    operator: 'equals',
    value: '',
    targetNodeId: 'manager',
    isDefault: true,
  },
]
// 此条件节点 ID 为 route；finance 与 manager 是现有下游节点。
const edges: WorkflowEdge[] = [
  { id: 'large-edge', source: 'route', target: 'finance' },
  { id: 'default-edge', source: 'route', target: 'manager' },
]
```

此处类型从 `@robot-admin/naive-ui-components/C_WorkFlow` 导入。选择目标定义条件含义，画布连线定义图结构，两者须一致。默认分支不是必填项；配置它时才检查唯一性，组件不推断条件是否覆盖所有业务输入。优先级不会在前端执行规则求值或重排已保存数组。

兼容规则：

- 旧条件未声明目标、默认标记和优先级时，保持原始数据。多出边只产生不阻断保存的兼容提示，单出边继续按原结构处理。
- 一个条件节点开始声明目标、默认标记或优先级后，其所有分支须填写有效目标；分支与出边逐一对应，重复目标、重复标识、无效优先级和多默认分支均会提示。
- 重连同一起点的分支会同步更新目标。移动已绑定连线的起点前须先解除旧绑定。
- 已绑定条件节点的通用“加号插入”会阻止把所有分支合并；在具体下游节点添加。删除引用节点时，单一下游可以接续；多个下游含义不明确时阻止操作。没有替代目标时保留失效引用并提示修复，避免静默丢失条件。
- 直接移除连线或从外部导入不一致数据后，通过“验证流程”定位问题，组件不会自动猜测或重写业务规则。

## 自定义节点外观

通过一个 `node` 插槽即可替换节点内容；端口、只读状态和节点操作仍由组件管理。不需要引用 Vue Flow 节点类型或注册另一套渲染器。

```vue
<C_WorkFlow v-model="definition" :users="users">
  <template #node="{ node, readonly, edit }">
    <article class="business-node">
      <strong>{{ node.data.title }}</strong>
      <span v-if="node.type === 'approval'">
        {{ node.data.approvers?.length ?? 0 }} 位审批人
      </span>
      <button
        v-if="!readonly"
        class="nodrag nopan"
        @click.stop="edit"
      >配置</button>
    </article>
  </template>
</C_WorkFlow>
```

插槽得到 `{ node, readonly, edit, remove }`。`node` 是隔离的公开快照，按 `node.type` 即可缩窄数据类型，直接改它不会改动图。需要交互的按钮加 `nodrag nopan` 并阻止点击冒泡，避免拖动画布或重复打开配置。操作方法会再次检查只读状态，发起节点仍不能删除。

`allowedNodeTypes` 只控制添加菜单，不删除或拒绝已有节点；省略时保留原菜单。主题默认跟随 Naive UI，也可用 `theme="light" / "dark"` 明确指定。节点样式变量限制在本组件容器内。

## 只读、校验与快照

`readonly` 禁止拖动、连接、删除、修改和保存，隐藏添加/删除按钮；点击节点仍保留 `node-click` 事件以供详情使用。运行中切为只读、替换流程数据或关闭配置都会作废当前编辑会话，等待中的旧选择结果不会回写。点击连线通过 `edge-click` 返回隔离的 `WorkflowEdge` 快照，只读模式仍可查看详情，不包含 SDK 运行态引用。

`change`、`update:modelValue`、`save` 和 `getCurrentWorkflowData()` 输出公开模型快照，保留显式业务配置和连线端口，排除画布 SDK 注入的运行态引用。外部 v-model 原样回填不会反复触发数据变更。拖动结束及用户结构操作才提交画布变更，尺寸测量和选中状态变化不会触发保存。

`validateWorkflow()` 返回完整问题数组，`type === 'warning'` 是兼容提示，其他问题阻断保存。通过组件实例类型 `WorkflowExpose` 调用公开方法，无需声明引擎实例类型。“保存”只发出 `save` 数据；服务端写入由使用侧完成。

## 预览的含义

“流程设计预览”按图结构排列节点，并展示人员、审批模式、条件和目标。分支会标明默认路由和失效目标；它是设计清单，不代表分支将依次执行，也不根据表单值模拟命中路径。循环、并行执行、多人审批完成规则和兜底策略仍需业务执行端验证。

外部流程定义发生实质变化时，已打开的设计预览会关闭，避免确认一个未完整展示的新定义；等值的 `v-model` 回填保留预览。确认动作还会再次核对当前模型，旧预览按钮不会触发保存。

## 组织选人

本地人员、组织树、远程解析、范围切换、顺序审批和失效选人会话的配置，见 [工作流的组织选人与节点配置](./workflow-people.md)。独立人员选择使用 [C_UserPicker 指南](./user-picker.md)，两者复用同一选择能力。

`roles` 保留为历史输入兼容项，当前配置面板按人员选择，不会自动把角色展开为审批人。角色成员解析与授权由业务来源完成，再通过 `people.source` 提供人员，无需接入另一套流程引擎。
