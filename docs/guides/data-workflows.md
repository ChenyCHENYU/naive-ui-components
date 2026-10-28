# 业务数据与多区域工作台

搜索、表单和表格共享值语义，应用保留接口、权限、缓存和业务事务。新增能力均按需接入；未配置时沿用既有行为。

## 一个字典数据源

```ts
import Components from '@robot-admin/naive-ui-components'
import type { DictionarySource } from '@robot-admin/naive-ui-components/config'

const planState: DictionarySource = {
  getOptions: () => [
    { value: 'released', label: '已下达' },
    { value: 'running', label: '执行中' },
  ],
}
app.use(Components, {
  dictionaries: {
    getDictionary: name => (name === 'planState' ? planState : undefined),
  },
})
```

字段只写 `dictionary: 'planState'`。C_Form 的 `children`、`asyncOptions`，C_FormSearch 的显式 `list/attrs.options`，C_Table 的 `render/formatter/editProps.options` 仍按各自既有优先级生效，未使用的字典不会被加载。

按需安装可通过 `/config` 导出的 `DICTIONARY_PROVIDER_KEY` 注入同一个 Provider。不要因为使用表单而导入 MachTable 根包。

`DictionarySource` 支持：

- `getOptions()`：同步快照，编码保留 string/number/boolean 类型。
- `load({ signal })`：可选的异步准备；视图会忽略已失效的请求。
- `subscribe(listener)`：可选的更新通知，返回取消订阅函数。

应用已有 store/resolver 时直接桥接，不叠加第二套 TTL 缓存。源负责组织、租户、语言和业务参数隔离：请求开始时捕获作用域，参数切换后不得把旧响应写进新作用域。可由 `getDictionary` 返回该作用域的稳定源，或发布当前快照变更通知。组件仅管理可销毁的选项视图及派生索引。

选项必须是有效且唯一的原始编码、字符串标签及可选 boolean disabled。空数组是已提供的空选项，不回退到旧数据。未知编码原样回显；停用历史编码可以保留在源中供展示。重复标签在反向解析时报告歧义，不自动选择第一项。高频展示使用 `createDictionaryLabelResolver(options)`，快照变化时重建一次索引。

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

MachTable 使用侧可在全局列类型中一次接入 `valueParser` 和 `valueFormatter`；精确字符串字段提供相应业务 comparator。其 `createDictionaryColumn` 可显式设置各输出 target 的编码/标签/码名策略，`summarizeRows` 可注入已有精确运算策略。Naive 库不会依赖或代替网格内核。

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
