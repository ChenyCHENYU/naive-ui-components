# 密集搜索区与查询快照

`C_FormSearch` 保留已有 `formItemList`、`v-model`、`formParams`、历史记录和 `@search` 接口。普通接入仍采用 `inline` 布局；复杂业务可显式开启容器网格。组件只管理搜索条件与执行状态，不绑定分页接口、租户规则或特定表格。

## 容器布局与字段

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_FormSearch,
    serializeSearch,
    type SearchFormItem,
    type SearchNumberRangeValue,
    type FormSearchExpose,
  } from '@robot-admin/naive-ui-components/C_FormSearch'

  interface Query {
    organization: string
    keyword: string
    amount: SearchNumberRangeValue
    month: string | null
    enabled: boolean | null
    customer: string
  }

  const query = ref<Query>({
    organization: '001',
    keyword: '',
    amount: null,
    month: null,
    enabled: false,
    customer: '',
  })
  const search = ref<FormSearchExpose<Query>>()
  const fields: SearchFormItem<Query>[] = [
    { type: 'input', prop: 'organization', label: '组织', fixed: true },
    { type: 'input', prop: 'keyword', label: '关键词' },
    {
      type: 'number-range',
      prop: 'amount',
      label: '金额范围',
      span: 2,
      query: { keys: ['minimumAmount', 'maximumAmount'] },
    },
    { type: 'month', prop: 'month', label: '月份', valueMode: 'formatted' },
    {
      type: 'select',
      prop: 'enabled',
      label: '状态',
      list: [
        { label: '启用', value: true },
        { label: '停用', value: false },
      ],
    },
    {
      type: 'custom',
      prop: 'customer',
      label: '客户',
      slot: 'customer',
      defaultValue: '',
    },
  ]

  async function execute(params: Query) {
    const request = serializeSearch(params, fields)
    // await api.list(request)，或交给已有的 useMachTableQuery 执行器。
    // 必须返回真实任务的 Promise；仅启动异步任务然后返回 void 无法等待业务完成。
    await Promise.resolve(request)
  }
</script>

<template>
  <C_FormSearch
    ref="search"
    v-model="query"
    :form-item-list="fields"
    :config="{
      density: 'compact',
      layout: 'grid',
      columns: 4,
      fieldMinWidth: 208,
      labelPlacement: 'left',
      labelWidth: 88,
      foldThreshold: 4,
      onSearch: execute,
    }"
  >
    <template #customer="{ value, model, disabled, updateValue }">
      <!-- 接入已有客户 Picker；选择结果通过 updateValue 回写。 -->
      <button
        type="button"
        :disabled="disabled"
        @click="updateValue(model.customer)"
      >
        {{ value || '选择客户' }}
      </button>
    </template>
  </C_FormSearch>
</template>
```

- `layout: 'grid'` 按**搜索区容器**宽度分栏，`columns` 是最大列数。窄分栏中即使浏览器很宽也会减少列数；不使用视口宽度判断可用空间。
- `fieldMinWidth` 为基础轨道预算，字段 `span` / `minWidth` 可申请更多空间；实际跨度不会超过容器当前列数。操作区自然位于最后一列。
- `labelPlacement: 'left' | 'top'` 与 `labelWidth` 对应 Naive UI 表单标签。省略字段 `label` 保持旧的无标签外观。
- `density` 与表单共用，字段显式 `attrs.size` 和组件 `size` 保持优先。
- 折叠只影响显示，条件和校验仍有效。隐藏/折叠且有值的字段会显示生效数量；`0`、`false` 也是有效条件。

## 控件与原始模型

支持 `input`、`select`、`number`、`number-range`、`date`、`month`、`date-range`、`custom`、`spacer`。

数字输入继续使用 Naive UI；`attrs` 可配置 `min`、`max`、`precision` 等。紧凑模式的单数字默认隐藏步进按钮，显式 `attrs.showButton` 可覆盖。范围模型为 `[number | null, number | null] | null`，允许先填写单边，两边清空时回到 `null`。范围先后、跨度上限等业务规则通过字段 `rules` 声明，组件不预设业务阈值。

数字控件只用于 `number` 模型。精确十进制字符串、超出安全范围的金额/编号应使用 `custom` 输入与明确的 codec，避免先转 `Number` 导致原值损失。搜索组件不负责计算税额或汇率。

日期/月默认使用时间戳；已有 `date-range` 时间戳模型保持兼容。字符串模型声明 `valueMode: 'formatted'`，包括初始值为 `null` 时。默认格式分别为 `yyyy-MM-dd`、`yyyy-MM`、`yyyy-MM-dd HH:mm`，可通过 `attrs.format` / `attrs.valueFormat` 显式覆盖。展示格式与回写类型分开，清空不会将字符串日期改成时间戳。

`select` 保留字符串、数字、布尔值及多选数组的业务类型。内部布尔编码仅用于适配原生选择器，提交的 `false` 不会变成字符串或 `0`。

## 字典与自定义控件

字段可配置 `dictionary: 'orderStatus'`，由应用已提供的字典 Provider 解析；也可直接传入 `DictionarySource`。搜索不另建字典缓存，使用同一来源的选项、订阅与可取消加载。

显式 `list`（包括空数组）和 `attrs.options` 优先于字典，且不会加载未使用的字典。加载失败在选择器中显示重试入口；字典标签更新不会重置输入草稿。组织切换和字典加载策略仍由应用 Provider 决定。

`custom` 可使用 `slot` 或 `render(context)`；必须声明类型正确的 `defaultValue`，使 reset 和 clear 有确定语义。上下文提供 `value`、只读 `model`、`prop`、`size`、`disabled`、`readonly` 和 `updateValue`。修改走 `updateValue`；`fixed`、`readonly`、`disabled` 字段会拦截控件回写。自定义按钮使用 `type="button"`，避免误触发表单提交。

## 草稿、执行结果和重置

- `v-model` / `formParams` 是可编辑草稿；字段配置或字典选项变化不拿旧 props 覆盖未提交输入。
- `@search` 是经过校验的执行通知，保留原有时机；它不表示后台查询成功。
- 使用 `config.onSearch` 返回任务 Promise 后，只有成功完成才更新 `appliedParams` 并发出 `@applied`。回调拒绝或显式返回 `false` 时，`searchFn()` 返回 `false`，保留上一次成功条件并允许重试。可直接返回 `useDataResource.reload()` 的 boolean 结果；接入自行收拢错误的其它控制器时，回调应检查其错误状态并返回 `false`。
- 仅使用旧 `@search` 的接入无法观察事件监听器异步结果，因此不会伪造 `appliedParams`；需要成功快照时使用 `onSearch`。
- 查询期间继续输入只改变草稿；成功快照仍是当次发送的条件。`hasUnappliedChanges` 可判断草稿与已执行条件是否不同。
- `cleanFn()` 只重置草稿，不主动执行查询，也不把重置值标记为成功查询。`defaultValue: 0 / false` 保留原类型；未配置字段、隐藏上下文、分页参数不被清除。
- `fixed: true` 的字段参与查询，但控件与 reset 不可改写。固定作用域切换时清空已执行快照，迟到请求不能在新作用域下标记成功。宿主仍应在执行器中取消失效请求，防止业务结果覆盖；`fixed` 不是后端授权机制。

原生表单提交（包括 Enter）共享搜索任务锁，验证期间与请求期间都防重；外部 `loading` 仍生效。

## 显式请求编码

`serializeSearch(params, fields, { omitEmpty: true })` 是纯辅助函数，组件不会隐式调用，也不会更改 `onSearch`、事件或 `v-model` 的类型。

字段 `query` 支持：

- `name`：仅将请求字段改名。
- `keys: ['start', 'end']`：将范围拆成两个请求字段，移除原范围键。
- `serialize(value)`：显式转换单个字段的传输格式；入参是隔离数据，不能改变草稿。

默认省略已配置字段的空值，保留 `0`、`false`、`'001'`。范围两端分别清理；`omitEmpty: false` 保留显式空值。未配置的上下文字段继续保留。重复目标键和不安全路径会报错，避免编码覆盖固定组织等条件。

表格列表、合计与导出应使用同一次成功执行的条件快照，按各自 target 选择编码或标签。页面负责把该快照交给后端导出任务；不读取用户正在修改的草稿冒充已查询范围。

## 常用条件

通过公开实例的 `applyPreset(values)` 应用“今日”“待处理”等业务预设，无需再封装一个搜索组件。它只更新已声明且可编辑的字段，固定组织、隐藏上下文、只读字段与分页参数保持原值；0/false 不会被丢弃。传入值先隔离复制，失败不会部分改写模型。

```ts
searchRef.value?.applyPreset({ status: 'running', amountRange: [0, null] })
// 用户确认执行时再调用 searchFn()；应用预设本身不发请求、不更新 appliedParams。
```

动态日期和班次的定义留在业务预设中，点击时产生当次值；预设不引入全局存储、额外 watcher 或另一套查询规则。
