# 工作流的组织选人与节点配置

`C_WorkFlow` 的发起人、审批人、抄送人共用 `C_UserPicker`。它在节点配置弹窗中以内嵌面板呈现，只有外层一次确认，不再额外打开选人弹窗。

## 旧输入继续可用

```vue
<C_WorkFlow v-model="definition" :users="users" :departments="departments" />
```

旧的 `User`、`Department` 和节点保存记录保持兼容。包内适配器将部门的 `parentId` 恢复为层级，并通过可选 `User.departmentId` 匹配人员归属。只有同名部门唯一时才使用旧的 `User.department` 名称回退；重名且无部门编码的人员仍可从“全部”和搜索找到，不猜测其组织归属。

旧本地适配器明确设置 `fixedFilters: { includeDescendants: true }`，因此点击公司或父部门会查询其下级范围。这个判断使用完整的本地部门、人员目录，和异步树当前加载了哪些子节点没有关系。

候选为空且节点已保存人员时，旧输入仍能回显并原样保存该记录。传入非空候选目录时，以该目录为当前可用人员；严格的在职、权限和业务范围复核应通过远程来源实现。

## 注册人员来源

```ts
import type { WorkflowPeopleOptions } from '@robot-admin/naive-ui-components/C_WorkFlow'

const people: WorkflowPeopleOptions = {
  scope: companyId,
  source: {
    rowKey: 'id',
    label: person => person.name,
    request: ({ search, filters, page, pageSize, signal }) =>
      queryPeople({ search, filters, page, pageSize, signal }),
    resolve: (ids, signal) => resolvePeople(ids, signal),
  },
  organization: {
    data: departments,
    field: 'departmentId',
    keyField: 'id',
    labelField: 'name',
  },
  fixedFilters: { includeDescendants: true },
  rowCheckable: person => allowedPeople.has(person.id),
}
```

```vue
<C_WorkFlow v-model="definition" :people="people" />
```

来源返回现有 `User` 结构，节点的 `approvers/initiators/copyUsers` 仍是人员记录数组。组件不探测接口地址或猜测后端字段。`resolve` 返回本次范围内仍可使用的人员；不可用人员省略，由选择器阻止未解析选择提交。真实授权仍由后端决定。

人员来源、其请求/解析函数、组织范围或 `scope` 改变后，旧选人会话和等待中的配置保存失效。弹窗取消、关闭、切换节点、切为只读及卸载也不会提交等待中的旧结果。已选编码和回显缓存由通用选择器处理。

## 顺序审批

`approvalMode="sequence"` 使用已选面板中的明确顺序，并支持上移、下移。加载已有 B → A 的配置后，即使候选表格按 A、B 排序，保存仍保留 B → A。人员解析接口可以按任意顺序返回，包内始终按已选编码恢复最终记录。

或签、会签和抄送不需要重新实现选择机制。是否包含下级、禁选规则、最大选择数和人员有效性复核都通过同一配置控制。

## 条件配置

通过 `conditionFields` 配置字段名称、类型和允许操作符。编辑器为数字、布尔、日期提供对应控件，保存仍采用既有字符串值契约；与完整流程验证共用条件校验函数。

条件可以指定下一节点、优先级和默认分支。选择目标只定义条件语义，实际连接通过画布端口建立；完整流程验证会指出目标、连线、重复默认分支等问题。这里是设计配置，不执行审批任务或业务条件脚本。
