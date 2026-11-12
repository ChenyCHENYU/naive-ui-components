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
- 折叠只影响显示，条件和校验仍有效。操作区同行显示隐藏或折叠的有值条件数量，点击可查看字段名称。`0`、`false` 也计入数量。

## 控件与原始模型

支持 `input`、`autocomplete`、`select`、`number`、`number-range`、`date`、`month`、`date-range`、`time`、`custom`、`spacer`。

数字输入继续使用 Naive UI；`attrs` 可配置 `min`、`max`、`precision` 等。紧凑模式的单数字默认隐藏步进按钮，显式 `attrs.showButton` 可覆盖。范围模型为 `[number | null, number | null] | null`，允许先填写单边，两边清空时回到 `null`。范围先后、跨度上限等业务规则通过字段 `rules` 声明，组件不预设业务阈值。

数字控件只用于 `number` 模型。精确十进制字符串、超出安全范围的金额/编号应使用 `custom` 输入与明确的 codec，避免先转 `Number` 导致原值损失。搜索组件不负责计算税额或汇率。

日期、月份、日期范围和时间默认使用时间戳。字符串模型声明 `valueMode: 'formatted'`，包括初始值为 `null` 时。四类控件默认分别使用 `yyyy-MM-dd`、`yyyy-MM`、`yyyy-MM-dd HH:mm` 和 `HH:mm`，可通过 `attrs.format` 和 `attrs.valueFormat` 分别设置显示格式和模型格式。显式声明值类型后，清空仍保留原来的绑定方式。

`select` 保留字符串、数字、布尔值及多选数组的业务类型。内部布尔编码仅用于适配原生选择器，提交的 `false` 不会变成字符串或 `0`。

## 外部选项与自定义控件

字段通过 `list` 或 `attrs.options` 接收普通选项数组。外部加载状态可传 `optionsState: { loading, error, retry }`，选择器就地呈现错误和重试入口；这种外部受控方式不触发组件请求。重试只在用户点击时调用，接口、取消与共享缓存由项目负责。需要组件管理关键字查询时，使用下方的 `source`。

`custom` 可使用 `slot` 或 `render(context)`；必须声明类型正确的 `defaultValue`，使 reset 和 clear 有确定语义。上下文提供 `value`、只读 `model`、`prop`、`size`、`disabled`、`readonly` 和 `updateValue`。修改走 `updateValue`；`fixed`、`readonly`、`disabled` 字段会拦截控件回写。自定义按钮使用 `type="button"`，避免误触发表单提交。

## 草稿、执行结果和重置

- `v-model` / `formParams` 是可编辑草稿；字段配置或外部选项变化不拿旧 props 覆盖未提交输入。
- `@search` 是经过校验的执行通知，保留原有时机；它不表示后台查询成功。
- 使用 `config.onSearch` 返回任务 Promise 后，只有成功完成才更新 `appliedParams` 并发出 `@applied`。回调拒绝或显式返回 `false` 时，`searchFn()` 返回 `false`，保留上一次成功条件并允许重试。可直接返回 `useDataResource.reload()` 的 boolean 结果；接入自行收拢错误的其它控制器时，回调应检查其错误状态并返回 `false`。
- 仅使用旧 `@search` 的接入无法观察事件监听器异步结果，因此不会伪造 `appliedParams`；需要成功快照时使用 `onSearch`。
- 查询期间继续输入只改变草稿；成功快照仍是当次发送的条件。`hasUnappliedChanges` 可判断草稿与已执行条件是否不同。
- 默认点击重置或调用 `cleanFn()` 只重置草稿。`defaultValue: 0 / false` 保留原类型，未配置字段、隐藏上下文和分页参数保留。
- 需要重置后立即刷新列表时，配置 `{ onSearch: loadRows, searchOnReset: true }`。重置和手动查询共享校验、加载和成功快照。重置允许提交空条件，仍执行字段规则。`@reset` 可观察草稿重置，业务请求由 `onSearch` 执行一次。只监听 `@search` 的场景也可开启该选项，例如选择器的查询插槽。
- 正在执行的手动查询可被重置查询取代，旧成功和错误不会改写组件状态。连续重置只发起一次在途查询。重置查询失败时保留上一次成功快照。组件没有在途查询时，外部 `loading` 会阻止重置查询。实际请求取消和列表发布由查询执行器负责。
- `fixed: true` 的字段参与查询，但控件与 reset 不可改写。固定作用域切换时清空已执行快照，迟到请求不能在新作用域下标记成功。宿主仍应在执行器中取消失效请求，防止业务结果覆盖；`fixed` 不是后端授权机制。
- 同一个搜索区切换报表、业务类型或工位时，可把对应标识传给 `config.queryScope`。切换会清空上一范围的执行快照，保留草稿，并允许直接执行新范围的查询。旧请求的迟到结果和失败提示不会进入新范围。实际请求取消及列表更新仍由页面的查询控制器负责。

原生表单提交（包括 Enter）共享搜索任务锁，验证期间与请求期间都防重；外部 `loading` 仍生效。

## 显式请求编码

`serializeSearch(params, fields, { omitEmpty: true })` 是纯辅助函数，组件不会隐式调用，也不会更改 `onSearch`、事件或 `v-model` 的类型。

字段 `query` 支持：

- `name`：仅将请求字段改名。
- `keys: ['start', 'end']`：将范围拆成两个请求字段，移除原范围键。
- `serialize(value)`：显式转换单个字段的传输格式；入参是隔离数据，不能改变草稿。

默认省略已配置字段的空值，保留 `0`、`false`、`'001'`。范围两端分别清理；`omitEmpty: false` 保留显式空值。未配置的上下文字段继续保留。重复目标键和不安全路径会报错，避免编码覆盖固定组织等条件。

不同模式使用不同的字段时，调用 `serializeSearch(params, fields, { scope: 'active' })`。请求仅保留当前配置中的可用字段和 `fixed` 条件。未配置字段与 `show: false` 的非固定条件留在草稿里，切回原模式可以继续编辑。折叠区域仍属于当前配置。建议由 `computed` 提供当前模式的字段列表，组织等必要上下文声明为 `fixed: true`，也可以由页面在构造请求时补入。

表格列表、合计与导出应使用同一次成功执行的条件快照，按各自 target 选择编码或标签。页面负责把该快照交给后端导出任务；不读取用户正在修改的草稿冒充已查询范围。

## 常用条件

通过公开实例的 `applyPreset(values)` 应用“今日”“待处理”等业务预设，无需再封装一个搜索组件。它只更新已声明且可编辑的字段，固定组织、隐藏上下文、只读字段与分页参数保持原值；0/false 不会被丢弃。传入值先隔离复制，失败不会部分改写模型。

```ts
searchRef.value?.applyPreset({ status: 'running', amountRange: [0, null] })
// 用户确认执行时再调用 searchFn()；应用预设本身不发请求、不更新 appliedParams。
```

动态日期和班次的定义留在业务预设中，点击时产生当次值；预设不引入全局存储、额外 watcher 或另一套查询规则。

## 远程选项与自由文本建议

三类入口共用 `{ search, page, pageSize, filters, signal } → { rows, total }` 请求契约，按需要选择展示方式：

| 入口             | 模型               | 适用场景                                               |
| ---------------- | ------------------ | ------------------------------------------------------ |
| `C_Select`       | 选项值或值数组     | 钢种、人员、货位、客户编码；候选可分页加载             |
| `C_AutoComplete` | 自由文本字符串     | 备注模板、企业名称、订单号输入；没有选中建议也保留文本 |
| `C_DataPicker`   | 实体标识或标识数组 | 多列比对、分类树、跨页多选；快捷浮层与完整选择共享草稿 |

`source` 只描述请求和实体映射，不绑定请求库、接口地址、后端响应信封或全局缓存。列表组件各自持有请求状态。防抖、取消、迟到响应隔离、错误重试、分页和初值回显留在包内；应用只需一次适配自己的接口。

```ts
import type { OptionSource } from '@robot-admin/naive-ui-components/data'

interface Person {
  id: number
  name: string
  department: string
}

const people: OptionSource<Person, number> = {
  request: query => personClient.page(query),
  value: row => row.id,
  label: row => `${row.name} · ${row.department}`,
  resolve: (ids, signal) => personClient.byIds(ids, { signal }),
}
```

```vue
<C_Select v-model="assigneeId" :source="people" clearable />
<C_AutoComplete v-model="assigneeText" :source="people" @select="applyPerson" />
```

选择器提交实体标识；文本建议插入 `source.label(row)`，`@select` 返回完整实体用于回填 ID、信用代码等关联字段。不要用企业名称或订单号代替不唯一的实体身份。`C_Select` 的 `@select` 在单选时返回完整行或 `null`，多选时返回已解析行数组；未知初值仍保留在模型里。

默认 `debounce=250ms`、`minChars=0`、`pageSize=20`，由 `source` 统一覆盖。低于最小字符数不发候选请求。远程模式由接口过滤；组件不再次用前端字符串规则过滤后端的模糊匹配结果。`resolve(values, signal)` 用于批量回显初值，不代表自动选择候选或替换当前输入。

本地文本建议默认按展示名过滤。备注模板需要始终展示完整候选时，设置 `:filterable="false"`；空输入聚焦也能选择模板，任意自写文本仍会保留。

已有原生 `remote` / `onSearch` 和外部 `optionsState` 接入继续可用；不要同时配置两套请求入口。新接入优先使用一个 `source`。

### 配置式联动

普通搜索字段直接放 `source`；联动字段用 `(model) => source` 派生上下文，模型由字段配置推导。

```ts
const fields: SearchFormItem<Query>[] = [
  { type: 'select', prop: 'warehouseId', label: '仓库', source: warehouses },
  {
    type: 'select',
    prop: 'locationId',
    label: '货位',
    source: model => ({
      ...locations,
      filters: { warehouseId: model.warehouseId },
    }),
  },
  {
    type: 'autocomplete',
    prop: 'remark',
    label: '说明',
    attrs: { options: templates },
  },
]
```

`C_Form` 使用相同的 `source` 和 `autocomplete` 字段类型。依赖变化会取消旧候选和回显请求，旧响应不能进入新上下文。仓库切换后是否清空货位等业务规则仍由模型联动或 `valueWhen` 明确表达；组件不会猜测应该改写哪些业务字段。

需要选择一项后回填多个关联字段时，`C_Form` 提供 `createSelectField` / `createAutoCompleteField`，并与 `createDataPickerField` 使用同一种局部 renderer 组合方式。`onSelect` 的行类型从来源推导，不需要使用侧书写多层泛型。

字段助手立即回写主字段；`onSelect` 和额外模型观察回调在受控模型完成同步后的 `nextTick` 执行。因此回调可以直接修改关联字段，不会把外部尚未同步的旧主值写回来。

```ts
import { createSelectField } from '@robot-admin/naive-ui-components/C_Form'

const renderers = {
  assignee: createSelectField({
    source: people,
    onSelect: person => {
      form.assigneeName = person?.name ?? ''
      form.department = person?.department ?? ''
    },
  }),
}
const options = [{ prop: 'assigneeId', type: 'assignee', label: '经办人' }]
// 将 options、renderers 和 v-model 交给 C_Form；标识字段由字段助手回写。
```

### 库内交互验证

在组件库源码仓库根目录运行 `bun run build` 后执行 `bun run dev:search-workflows`，打开 `http://127.0.0.1:4188`。演示完全在本组件库内，不依赖 Robot_Admin，也不需要后端。

覆盖仓库/货位联动、编码回显、分页候选、自由备注、快捷/完整实体选择、分类导航、数量限制和禁选行。页面还提供错误重试、记录失效、固定工厂切换、紧凑/默认密度及深浅色检查入口。`bun run check:search-workflows` 验证该使用示例的公开类型和生产构建。

验收正式构建时，执行 `bun run check:search-workflows && bun run preview:search-workflows`，在 `http://127.0.0.1:4189` 操作；生产预览不会受到开发依赖预构建或热更新重载的影响。
