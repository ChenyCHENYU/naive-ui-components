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

| 密度          | 字段与操作按钮 | 布局间距 | 卡片留白 | 表单反馈预留高度 |
| ------------- | -------------- | -------- | -------- | ---------------- |
| `default`     | `medium`       | 16px     | 24px     | 24px             |
| `compact`     | `small`        | 8px      | 12px     | 12px             |
| `comfortable` | `large`        | 20px     | 28px     | 28px             |

反馈预留高度是最小值，校验错误可自然撑开。密度支持响应式切换，切换不会清空表单值、搜索草稿、折叠条件或分组展开状态；不同实例可以使用不同密度。

## 保留明确覆盖

已有项目未配置 `density` 时保留原来的间距和默认 `medium` 尺寸。显式配置的控件尺寸、字段尺寸和布局间距继续优先，不需要迁移旧用法。

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

`C_FormModal` 的 `config.density` 同步控制表单与页脚按钮，也继承应用级表单密度；未配置密度时保留弹窗原有 `small` 字段默认值。表格编辑弹窗也会继承表格密度。
