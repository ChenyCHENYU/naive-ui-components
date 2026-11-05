# 业务数据与多区域工作台

搜索、表单和表格共享值语义，应用保留接口、权限、缓存和业务事务。新增能力均按需接入；未配置时沿用既有行为。

## 搜索表单与弹窗组合

页面按业务模式用 `computed` 生成搜索字段、编辑字段和动作。字段用稳定的 `prop`，按钮用稳定的 `key`。临时折叠的搜索条件继续生效，固定条件继续随请求发送。如果切换业务类型后某个条件已失效，在应用中清除该值，或从当前适用字段构造一份新查询。`serializeSearch()` 会保留模型中未参与字段编码的键。

| 场景                 | 接入方式                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 搜索、分页、刷新     | `C_FormSearch` 的 `config.onSearch` 交给当前页面的查询控制器。C_Table 可直接返回 `useTableQuery().setQuery()` 的执行结果。MachTable 可使用自己的查询控制器和分页，页面负责提交查询快照并将执行结果返回搜索区。 |
| 列表操作、编辑弹窗   | `C_ActionBar` 按业务状态计算 `show` 和 `disabled`，动作返回实际的 Promise。新增、编辑共用 `C_FormModal` 和结构化 `editor`，保存成功后由页面刷新列表。                                                          |
| 字段联动和回填       | `C_Form` 用 `showWhen`、函数式 `readonly` / `disabled`、`dependsOn` 与 `asyncOptions`。简单实体查找用 `C_DataPicker`，在字段插槽中接入，确认后把选中行映射成业务字段。                                         |
| 主档、子表和分区弹窗 | `useDataResource` 按主记录标识管理从表请求，`useValidationScope` 聚合跨区校验。主档与子表的草稿、整单保存和操作权限由页面控制器统一持有。                                                                      |

搜索组件以 `onSearch` 的返回结果更新已执行快照。控制器返回 `false` 时，应把这个值原样传回搜索区。服务端分页用同一份已提交查询翻页，表格组件按各自公开属性绑定。

需要多条件筛选、固定业务上下文和多项回填的选择弹窗，可组合 `C_FormSearch`、表格与弹窗外壳。简单选择用 [C_DataPicker](./data-picker.md) 即可。需要先预览再发布时，在页面控制器中保存预览对应的输入快照，并在输入变更后使旧预览失效。

## 外部选项与格式化

组件库不注册、加载或订阅字典，也不约定第三方插件的字段或注入协议。项目可使用任意数据服务，组合成组件已有的普通配置：

- C_Form：`children` 为选项数组；`attrs.loading` 或 `optionsState.loading` 表示加载。
- C_FormSearch：`list` / `attrs.options` 为选项数组。
- C_Table：`formatter` / `render` 负责显示，`filterOptions` 负责筛选，`editType: 'select'` 和 `editProps.options` 负责编辑。

表单与搜索的 `optionsState` 只呈现外部受控的 `loading/error/retry`，不会主动调用重试或查询来源。错误就地显示，不修改业务模型或覆盖校验反馈；请求、共享缓存、身份切换与取消由项目的数据服务负责。组件自有 `asyncOptions` 保留原有取消和生命周期管理，`reloadOptions` 只重新加载这些字段。

布尔值只在原生选择器边界编码，提交仍保留 `false/true`；字符串、数字和前导零编码保持原样。配置项变化不会覆盖搜索草稿。

## 数值：存储、显示和校验分别定义

```ts
import { createNumberCodec } from '@robot-admin/naive-ui-components/data'
import { numeric } from '@robot-admin/form-validate'

const weight = createNumberCodec({
  storage: 'decimal-string',
  fractionDigits: 3,
  suffix: ' t',
})
const weightRules = [numeric({ totalDigits: 11, fractionDigits: 3, min: 0 })]

weight.parse('12345678.005') // '12345678.005'
weight.format('12.5004') // '12.500 t'，只舍入显示，不改原值
```

精确小数用文本控件保留编辑草稿，C_Form 直接消费 `weightRules`，提交前再调用 `parse`。不要在每次输入时解析半成品文本，也不要把 `precision` 当作提交校验。清空得到 null，0 仍为有效数值。默认 number 存储会拒绝不安全整数和不能十进制往返的转换；已经被上游 number 损坏的精度不能恢复，精确接口应传原始字符串。

`fractionDigits: 0` 有效；HALF_UP 处理负数中点。parse 接收普通十进制原始值，format 可加千分位、前后缀；带单位/货币符号的显示文本不是接口值。合计、精确排序、汇率和税费按业务数值策略处理，不拿格式化文本计算。

MachTable 使用侧可在全局列类型中一次接入 `valueParser` 和 `valueFormatter`；精确字符串字段提供相应业务 comparator。输出策略通过公开的列格式化与导出选项定义，`summarizeRows` 可注入已有精确运算策略。Naive 库不会依赖或代替网格内核。

## 主从资源：本地空值与迟到响应

```ts
import { useDataResource } from '@robot-admin/naive-ui-components/workflows'

const details = useDataResource({
  key: () => activeOrderId.value,
  load: ({ key, signal }) => orderApi.details(key, { signal }),
})
```

更换 key 会取消旧请求、清除旧主记录数据；即使传输忽略 signal，旧结果也不能覆盖新记录。同 key 刷新失败保留原展示，`status: 'error'` 与 `stale` 明确表达旧快照，可通过 `reload()` 重试。reload 返回成功与否的 boolean，可直接交给 Search 的 `config.onSearch`。

可选 `source` 表示本地受控数据：undefined 才是未提供，`[]` 和 null 都是明确的本地源。本地源生效时不请求远端。组件卸载会清理 watcher/请求，KeepAlive 停用期间不开始新请求；恢复后按最新 key 继续。普通 effectScope 外使用时调用 `dispose()`。每个 panel 独立实例，互不共享请求状态；不缓存所有访问过的订单。

## 多区域校验和导航

```ts
import { useValidationScope } from '@robot-admin/naive-ui-components/workflows'

const validation = useValidationScope()
const unregister = validation.register({
  id: 'header',
  dirty: () => formRef.value?.isDirty ?? false,
  validate: () => formRef.value!.validate(),
  reveal: issue =>
    formRef.value?.revealField(issue.target?.field ?? '') ?? false,
})
```

原生 `validate(): Promise<void>` 无需转换器，拒绝的字段错误会被标准化。表格校验可返回 `{ key, source, message, target: { section, tab, rowKey, field } }[]`；行地址使用稳定业务 key。注册标识必须唯一；动态区域移除时调用 unregister，旧验证结果不会回填。`dirty` 仅聚合已注册区域，不深遍历整张业务单据。

`C_ErrorSummary` 接收 `validation.issues`，`@navigate="validation.reveal"` 定位问题，默认每页仅挂载8项。`C_SectionNav` 的 items 包含 key/label/errorCount/disabled，通过 `@select` 接入现有分区或折叠面板；它不查找全局 DOM、不监听全局滚动。

Form 的 `revealField` 保留 Tab/Step 原有导航和校验约束，禁用或只读目标不强行聚焦，受阻返回 false。自定义控件通过 `focusTarget` 准备并返回真实元素；迟到的异步定位不会抢走当前焦点。

校验协调不等于数据库事务。保存使用业务接口的版本、幂等和分项结果；结果未确认时保留原操作及请求快照，避免自动重复提交。

## 密度和重复行

```vue
<C_Density density="compact">
  <C_FormSearch ... />
  <C_Form ... />
  <C_Table ... />
  <C_Density density="comfortable">
    <!-- 工位操作区使用较大控件 -->
    <C_Form ... />
  </C_Density>
</C_Density>
```

C_Density 无额外 DOM，只提供子树默认值，不修改应用或兄弟区域。局部 config、显式 size 继续优先。MachTable 的密度由其公开 size/config 独立配置。

少量异构重复行使用 `useFormArray(initial, { maxRows })`：items 中每行有稳定 key 与独立 value，增删移动保留身份，`getValues()` 返回隔离副本。reset 使用初始快照；动态删除时同步移除该行校验参与者。大量同构明细使用虚拟表格，不挂载整页常驻输入框。

## 批改、结果和输出边界

`createBatchPatch` 把 keep/clear/set 转为明确的标量 payload：keep 不发送，clear 发送 null，set 保留空串、0、false。非标量子记录仍由领域协议定义，不自动猜测嵌套更新。

`C_BatchResult` 只呈现结果和发出可重试 key，不调用后端。重复 key 以最新结果为准，后续成功项不会因旧失败再次重试。批改范围、差异预览、服务端授权和乐观锁由应用负责。见 [批量结果](./batch-results.md)、[远程实体选择](./data-picker.md)。

显示、复制、CSV、XLSX 各 target 可以采用不同策略，但必须使用同一已执行查询、字典和精度快照。大数据导出使用后端任务，模板排版/分页打印使用报表产品。不要把当前加载页当筛选全量，也不要在同步 formatter/serializer 内发请求。
