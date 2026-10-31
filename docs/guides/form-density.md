# 表单与搜索密度

`C_Form`、`C_FormSearch` 和 `C_Table` 使用同一项 `config.density`。同一个页面共享一个值即可同步字段、操作按钮和布局留白，不需要逐项传尺寸。

```vue
<C_FormSearch v-model="query" :form-item-list="filters" :config="{ density }" />
<C_Table :columns="columns" :data="rows" :config="{ density }" />
<C_Form v-model="model" :options="fields" :config="{ density }" />
```

```ts
import { ref } from 'vue'
import type { ComponentDensity } from '@robot-admin/naive-ui-components/C_Form'

const density = ref<ComponentDensity>('compact')
```

| 密度          | 字段与操作按钮 | 布局间距        | 卡片留白 | 表单反馈预留高度 |
| ------------- | -------------- | --------------- | -------- | ---------------- |
| `default`     | `medium`       | 16px            | 24px     | 24px             |
| `compact`     | `small`        | 横 8px / 纵 4px | 12px     | 2px              |
| `comfortable` | `large`        | 20px            | 28px     | 28px             |

反馈预留高度是最小值，校验错误可自然撑开。密度支持响应式切换，切换不会清空表单值、搜索草稿、折叠条件或分组展开状态；不同实例可以使用不同密度。

## 保留明确覆盖

已有项目未配置 `density` 时保留原来的字段、布局间距和默认 `medium` 尺寸；无校验职责的操作区不再保留空反馈行。显式配置的控件尺寸、字段尺寸和布局间距继续优先，不需要迁移旧用法。

响应式网格会根据容器宽度约束横向间距，避免 24 栅格的累计间距撑破窄弹窗；宽屏仍使用配置值，纵向间距独立，偏移继续交给 Naive UI 处理。`grid.responsive: false` 可保留固定的间距行为。

已有 `C_Form` 原生 `size` 透传继续按原有末尾覆盖顺序生效，并同步字段与操作按钮；新接入推荐统一使用 `config`。

```ts
// 布局紧凑，只有指定字段保持较大尺寸。
const formConfig = { density: 'compact', grid: { xGap: 12 } } as const
const fields = [
  { type: 'input', prop: 'name' },
  { type: 'select', prop: 'owner', attrs: { size: 'large' }, children: [] },
]

// Form: config.size 优先于 density 推导的尺寸。
const largeFields = { density: 'compact', size: 'large' } as const
```

`C_FormSearch` 的原 `size` 属性也保留优先级：

```vue
<C_FormSearch
  v-model="query"
  :form-item-list="filters"
  :config="{ density: 'compact' }"
  size="large"
/>
```

`C_Form` 的默认、内联、网格、卡片、标签页、步骤、动态和自定义布局均支持密度。步骤指示器只支持 Naive UI 原生的 `small`/`medium`；`comfortable` 下指示器使用 `medium`，字段和操作按钮使用 `large`。自定义渲染器和业务插槽由使用侧控制自身样式；密度不会强改业务内容或 `Rate` 等使用不同尺寸协议的组件。

卡片、网格等布局仍按需加载。密度预设仅为纯数据，不引入额外 UI 依赖。

`C_FormModal` 默认使用 `compact`，也继承应用级表单密度；紧凑弹窗的字段为 `small`，页脚按钮为 `tiny`，与紧凑操作栏一致。显式 `config.size` 仍同时控制字段和按钮；显式 `default` / `comfortable` 密度使用对应尺寸。表格编辑弹窗也会继承表格密度。

紧凑弹窗在标题底部与首行字段之间保留 10px，内容两侧为 12px；末行保留底部留白，不压缩实际校验提示。弹窗宽高受视口约束，长表单仅内容区滚动，标题和页脚保持可见。外壳使用原生 Card 分区样式，不修改内嵌业务卡片或插槽的间距，也不增加逐字段测量或监听。

## 按需设置应用默认值

在应用启动时提供一次即可，局部的 `config.density` 优先，搜索只继承密度，不继承表单布局、回调或尺寸。

```ts
import { FORM_GLOBAL_CONFIG_KEY } from '@robot-admin/naive-ui-components/config'

app.provide(FORM_GLOBAL_CONFIG_KEY, { density: 'compact' })
```

紧凑搜索的字段默认宽度为 208px，窄屏自动占满可用宽度；显式字段 `attrs.style.width` 仍可覆盖。紧凑数字字段默认隐藏增减按钮，保留键盘 ↑ / ↓、步长、精度及上下限；需要按钮的字段配置 `attrs: { showButton: true }`。控件继续使用 Naive UI 的数值处理与主题，输入为文本，不叠加浏览器原生数字箭头；`attrs.inputProps` 可覆盖可访问名称和数值语义。

## 按容器安排字段

网格可显式设置 `config.grid.minItemWidth`，预算包含标签和控件整体，不是仅输入框宽度。根据当前分栏或弹窗容器的真实宽度调整默认跨度；已有显式 `span` 在宽度足够时保留，只有容纳不了该预算时才扩展，最多占满整行。`cols`、`offset`、`suffix` 与 Naive UI 换行规则不变。

```ts
const config = {
  density: 'compact',
  layout: 'grid',
  grid: { cols: 24, minItemWidth: 300, xGap: 16, yGap: 8 },
} as const
```

未设置该项时保持原有跨度行为；`responsive: false` 禁用自动扩展。容器比最小预算还窄时使用整行，不通过固定 `min-width` 撑破页面。宽度由局部 `ResizeObserver` 提供，停用、重新激活及销毁时管理自身订阅，无全局 resize 监听。

## 定位校验字段

实例方法 `await formRef.revealField(field)` 会先进入字段所在标签页、步骤或展开对应卡片分组，再滚动并聚焦真实可用控件；仅成功获得焦点才返回 `true`。找不到字段、字段隐藏/禁用/只读、布局尚未加载、切换前业务回调或已有校验阻止导航时返回 `false`。它不清除错误、不修改校验规则，也不会替业务切换编辑模式。

```ts
const focused = await formRef.value?.revealField('customer.name')
```

定位只使用当前表单实例的字段引用。卸载、KeepAlive 停用、布局改变或新定位请求会取消旧请求，迟到结果不会抢回焦点。自定义或虚拟控件可在字段上配置 `focusTarget`，异步准备后返回真实元素；由表单重新检查访问约束并执行 focus，适配器不要自行聚焦，也不要返回占位元素。

```ts
const fields = [
  {
    type: 'custom-customer',
    prop: 'customerId',
    focusTarget: async ({ signal }) => {
      await customerEditor.ensureMounted(signal)
      return signal.aborted ? null : customerEditor.inputElement
    },
  },
]
```

`focusTarget` 上下文还提供 `field`、字段表单项的 `element`（可能为空）和当前 `model`。即使异步适配器忽略取消，库也会拒绝旧元素；没有可聚焦目标时诚实返回 `false`，由使用侧保留错误摘要或提示导航限制。

## 密集录入与性能

紧凑表单与搜索默认纵向行距 4px，空反馈预留 2px；校验文案使用自然高度，多行错误不裁切、不盖住下一行。C_FormModal 的紧凑壳同步收紧，内容过高时在弹窗内部滚动，页脚保留可操作空间。显式的 grid.yGap / gutter 仍优先。

Grid 和 Dynamic 字段不再执行逐字段入场或布局尺寸动画，Inline 不再对尺寸设置 transition: all。保留控件自身的焦点、悬停及校验反馈。配置与字段定义稳定时，表单控件按自身响应式依赖更新；400 字段回归检查单字段输入不会重绘其余 399 个控件。v-model 仍按既有契约输出独立的完整模型快照，成本随模型大小增长；大量字段建议按业务使用现有 Tabs/Steps 分区，明细数据继续交给虚拟表格。
