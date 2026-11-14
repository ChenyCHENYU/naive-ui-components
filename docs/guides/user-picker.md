# 按组织选择人员

`C_UserPicker` 适合审批人、抄送人、负责人和参与者选择。组织树筛选候选人员，分页表格辨认人员，右侧保留跨页已选名单。它复用 `C_DataPicker` 的请求、草稿、回显和确认内核，业务接口只在应用中注册一次。

## 最小接入

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_UserPicker,
    type UserPickerSource,
    type UserPickerOrganization,
  } from '@robot-admin/naive-ui-components/C_UserPicker'
  import '@robot-admin/naive-ui-components/C_UserPicker/style.css'

  interface Person {
    userNo: string
    name: string
    departmentName: string
    position: string
    enabled: boolean
  }
  interface Department {
    id: number
    name: string
    children?: Department[]
  }
  interface Filters {
    departmentId?: number
  }

  const users = ref<string[]>([])
  // peopleClient 是应用自己的请求适配器。分页响应为 { rows, total }。
  const source: UserPickerSource<Person, string, Filters> = {
    rowKey: 'userNo',
    label: row => row.name,
    request: query => peopleClient.page(query),
    resolve: (ids, signal, context) =>
      peopleClient.byIds(ids, { signal, scope: context?.scope }),
  }
  const organization: UserPickerOrganization<Department, Filters> = {
    data: departments,
    field: 'departmentId',
    mode: 'org',
    actions: [],
  }
</script>

<template>
  <C_UserPicker
    v-model="users"
    multiple
    :source="source"
    :organization="organization"
    :fields="{ code: 'userNo', department: 'departmentName', job: 'position' }"
    :disabled-reason="person => (person.enabled ? undefined : '账号已停用')"
    :max-selection="20"
  />
</template>
```

多选直接绑定 `ref<string[]>([])`；单选省略 `multiple`，绑定 `ref<string | null>(null)`。数值编码对应 `number[]` / `number | null`。业务接口不需要索引签名或类型断言；`@select` 返回原始 `Person[]`。

`source.rowKey` 必须是稳定、唯一的字符串或数值字段；同名人员用编码区分，数值 `0` 有效。如果表格行键与提交值不同，增加 `value: row => row.userNo`，并让 `resolve` 按该提交值查询。也可用 `createUserPickerSource({ rowKey: 'userNo', label: (row: Person) => row.name, request })` 保留字段本来的编码类型；已经擦宽为 `DataPickerSourceInput` 的来源需在注册处明确身份映射。

## 组织、字段与业务边界

- 组织可省略。点击组织只把组织键写入 `filters[organization.field]`，重置候选页码；不会自动选择该组织或缓存中的所有人员。“全部分类”移除此筛选。
- `organization` 复用 `C_Tree` 的 `keyField`、`labelField`、`childrenField`、图标、懒加载和 `searchSource` 远程路径搜索配置。它固定为不可勾选的单选导航；应用无需另建一套选中状态。远程树范围变化应同时更新其 `searchSource.scope`。
- “包含下级组织”、在职范围、权限等由来源适配器解释筛选条件；可通过 `fixedFilters` 提供固定约束。组件不内置 HR 接口或授权规则。
- 默认姓名来自 `source.label`，可通过 `fields` 增加头像、编码、部门、岗位和状态；特殊业务直接传 `columns` 覆盖默认列。`#selected` 可替换右侧名单，获得全部 `items`、`remove(value)`、`move(value, offset)` 和 `disabled`。

## 草稿、顺序与确认

翻页、组织切换和搜索保留草稿。已有选中值的顺序保持稳定，新勾选值追加到末尾；`selection-order` 开启右侧上移/下移，适合依次审批。已选区每页展示 8 项，大名单仍可分页移除，包括暂时无法回显的编码。

取消、关闭、卸载只丢弃草稿，确认通过后才触发 `update:modelValue` 和 `select`。`disabledReason` 同时用于候选提示和可选性判断，`rowCheckable` 可补充布尔规则；`maxSelection` 和 `requireSelection` 分别限制上限与空选择。

提供 `source.resolve` 后，人员选择默认在确认时重新批量解析，已删除或已变为不可选的人员会阻止提交并显示错误，不会用旧行数据绕过复核。没有 `resolve` 时只能检查当前已知记录；服务端仍需在实际业务提交时验证权限与人员状态。仅在来源明确无需复核时设置 `:revalidate-on-confirm="false"`。

## 业务范围隔离

租户、账号或业务主体变化时更新 `scope`。它会取消旧请求，清空候选、回显缓存和未确认草稿，并传入 `request({ scope, signal, ... })` 与 `resolve(ids, signal, { scope })`。内嵌模式重新打开新范围；弹窗模式等待再次打开。应用应同步切换当前主体的受控选中值，并把 `signal` 透传给请求。

`fixedFilters` 变化同样使旧会话失效。启用 `history` 时仍须提供独立的 `history.storageKey` 与账号/业务 `history.scope`；组件级 `scope` 也参与历史隔离，未提供新属性的旧 DataPicker 历史键保持不变。

## 已有弹窗内嵌

`presentation="inline"` 自动打开并默认隐藏触发器。外层弹窗已经有保存/取消按钮时设置 `:show-actions="false"`，由外层保存统一等待 `confirm()`，避免两层确认栏。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import type { UserPickerExpose } from '@robot-admin/naive-ui-components/C_UserPicker'
  const picker = ref<UserPickerExpose>()
  const draft = ref<string[]>([])
  async function save() {
    if (!(await picker.value?.confirm())) return
    // update:modelValue / select 已同步发布到本弹窗的本地草稿。
    applyDraft(draft.value)
    closeDialog()
  }
  function cancel() {
    picker.value?.close()
    closeDialog()
  }
</script>

<template>
  <C_UserPicker
    ref="picker"
    v-model="draft"
    multiple
    :source="source"
    presentation="inline"
    :show-actions="false"
  />
</template>
```

每次外层打开时从业务值创建本地草稿；关闭后卸载该选择器或显式 `close()`，再次使用调用 `open()`。外层统一处理 Escape、遮罩和取消，不把本地草稿提前写入正式业务对象。`confirm()` 返回 `false` 时保留当前选择并展示错误；`reset()` 用于显式丢弃来源缓存与当前会话。

审批设计器的直接接入见[流程人员配置](./workflow-people.md)，通用实体选择见[远程实体选择器](./data-picker.md)。
