[← 项目首页](../../README.md) · [English](./usage.en.md)

# 使用指南

按需导入、组件配置与业务场景的详细接入示例。

## 本页导航

- [导入方式](#导入方式)
- [Cron 与公式工作区](#cron-与公式工作区)
- [C_Guide 配置引导](#c_guide-配置引导)
- [C_Form / C_Table 推荐用法](#c_form--c_table-推荐用法)
- [常用组件约定](#常用组件约定)
- [C_Map 推荐用法](#c_map-推荐用法)
- [C_Captcha 服务端校验](#c_captcha-服务端校验)
- [表格加载态](#表格加载态)
- [C_Login 扩展表单](#c_login-扩展表单)
- [页面切换加载](#页面切换加载)
- [应用级扩展与迁移](#应用级扩展与迁移)

## 导入方式

### 全局注册

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import NaiveUIComponents from '@robot-admin/naive-ui-components'
import '@robot-admin/naive-ui-components/style.css'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

根入口聚合全部组件，运行时需要 `vue-router`；无需导航能力时请选择组件子路径。

### 按需导入（主入口 Tree-Shaking）

```vue
<script setup lang="ts">
  import { C_Icon, C_Table, C_Form } from '@robot-admin/naive-ui-components'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

### 子路径独立导入（推荐，最小打包体积）

每个组件都提供独立的子路径入口，仅加载目标组件的代码和类型：

```vue
<script setup lang="ts">
  import { C_Form } from '@robot-admin/naive-ui-components/C_Form'
  import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
  import { C_Icon } from '@robot-admin/naive-ui-components/C_Icon'
  import { createMenuOptions } from '@robot-admin/naive-ui-components/C_Menu'
  import '@robot-admin/naive-ui-components/C_Form/base.css'
  import '@robot-admin/naive-ui-components/C_Table/base.css'
  import '@robot-admin/naive-ui-components/C_Icon/style.css'
</script>
```

> 子路径导入提供完整的 TypeScript 类型支持（`.d.ts`），IDE 可自动补全 props / emits / slots。组件相关工具函数（如 `createMenuOptions`）也从对应组件子路径导出，避免为了单个工具加载组件库根入口。

### Composables 单独使用

```typescript
import { useTableManager } from '@robot-admin/naive-ui-components/C_Table'
import { useFormState } from '@robot-admin/naive-ui-components/C_Form'
import { usePlayerCore } from '@robot-admin/naive-ui-components/C_VideoPlayer'
```

### 自动按需导入（推荐）

Resolver 默认从组件子路径加载，避免只使用少量组件时把整个组件库及重型运行依赖带入首屏：

```typescript
import Components from 'unplugin-vue-components/vite'
import { RobotNaiveUiResolver } from '@robot-admin/naive-ui-components/resolver'

Components({
  resolvers: [RobotNaiveUiResolver({ importStyle: true })],
})
```

`importStyle: true`（等价于 `'full'`）保持原有完整样式行为。只使用 C_Form/C_Table 基础字段、不使用内置富文本编辑器时，可设置 `importStyle: 'base'`，避免带入编辑器样式；其他组件会安全回退到标准样式入口。如需兼容旧项目的主入口导入，可显式设置 `importOnDemand: false`。

每个 `C_*/style.css` 都是可独立消费的完整组件样式入口：如果组件内部组合了 `C_Icon`、`C_Captcha` 等其他公共组件，对应依赖样式会自动包含，无需使用侧重复导入，也不会依赖全量 `style.css` 兜底。

`C_Menu` 会在鼠标进入或键盘聚焦叶子菜单时触发 `intent` 事件；宿主可将其绑定到路由预取函数，点击与 `select` 行为保持不变。

也可以手动选择样式层级：

```typescript
import '@robot-admin/naive-ui-components/C_Form/base.css'
import '@robot-admin/naive-ui-components/C_Table/base.css'
// 完整模式也可显式使用 C_Form/full.css、C_Table/full.css
```

## Cron 与公式工作区

一个模型加一份扁平配置即可。原有独立属性继续兼容，组件内部统一处理模板、校验、预览与初始状态重置。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Cron,
    type CronConfig,
  } from '@robot-admin/naive-ui-components/C_Cron'
  import {
    C_FormulaEditor,
    type FormulaEditorConfig,
  } from '@robot-admin/naive-ui-components/C_FormulaEditor'
  import '@robot-admin/naive-ui-components/C_Cron/style.css'
  import '@robot-admin/naive-ui-components/C_FormulaEditor/style.css'

  const expression = ref('0 30 8 * * ?')
  const cronConfig: CronConfig = { previewCount: 5 }
  const formula = ref('IF([完成值] > 0, 100 / [完成值], 0)')
  const formulaConfig: FormulaEditorConfig = {
    variables: [{ name: '完成值', field: 'completed', type: 'number' }],
    sampleData: { completed: 5 },
    editableSampleData: true,
  }
</script>
<template>
  <C_Cron
    v-model="expression"
    :config="cronConfig"
  />
  <C_FormulaEditor
    v-model="formula"
    :config="formulaConfig"
  />
</template>
```

Cron 支持秒到星期的六个数字字段、范围、间隔、列表及日/星期 `?` 互斥，不实现 L/W/# 扩展；预览按浏览器本地时区计算，不会调度任务。公式试算只在本地进行，不修改传入的 `sampleData`；校验和计算复用有界解析器，条件分支按需执行。通过 `showPreview`、`showKeyboard`、`showVariablePanel` 控制嵌入布局，`disabled` 同时保护试算输入。重置恢复初始模型及数据；切换独立记录时使用新 key 重新挂载。

公式键盘默认展开，可手动收起。数字、运算、比较与条件按键直接插入当前光标位置；选中文字会被替换，退格可整体删除变量，清空后继续输入。函数快捷键复用 `functions` 配置及签名说明，不需要项目额外配置；隐藏键盘仍使用 `showKeyboard: false`。

## C_Guide 配置引导

项目只需要提供目标和步骤，组件内置主题、可选 SVG 示意图及退出清理，不依赖项目的路由或 Store：

```vue
<script setup lang="ts">
  import {
    C_Guide,
    type GuideStep,
  } from '@robot-admin/naive-ui-components/C_Guide'
  import '@robot-admin/naive-ui-components/C_Guide/style.css'

  const steps: GuideStep[] = [
    {
      element: '[data-guide="search"]',
      popover: {
        title: '搜索',
        description: '快速查找功能。',
        illustration: 'search',
      },
    },
  ]
</script>

<template>
  <C_Guide :steps="steps" />
</template>
```

在 `NConfigProvider` 内会自动跟随亮暗主题和主色。目标支持选择器、元素或解析函数；默认跳过不可见目标，不传目标可展示居中步骤。引擎在打开时加载。启用 `persistence` 后，只有完成引导才记住状态；点击入口仍可重看。每一步默认显示“跳过引导”，跳过会发出 `skip` 和 `close` 事件，不记录为完成；可用 `showSkipButton` 和 `skipBtnText` 控制入口与文案。通过 `GuideExpose` 可调用 `startGuide(force?)`、`stopGuide()`、`isCompleted()` 和 `resetCompleted()`，宿主可在路由切换时主动停止。

## C_Form / C_Table 推荐用法

推荐使用类型助手和绑定助手：业务模型只声明一次，字段路径、字段值、列 key、保存回调和实例方法即可保持同一套类型推导。字段支持 `profile.name`、`contacts.0.email` 这类嵌套路径。

```vue
<script setup lang="ts">
  import {
    C_Form,
    defineFormConfig,
    defineFormOptions,
    useCForm,
  } from '@robot-admin/naive-ui-components/C_Form'

  interface UserForm {
    name: string
    departmentId: number | null
    profile: { email: string }
  }

  const fields = defineFormOptions<UserForm>([
    {
      type: 'input',
      prop: 'name',
      label: '名称',
      required: true,
    },
    {
      type: 'select',
      prop: 'departmentId',
      label: '部门',
      asyncOptions: async (_model, context) =>
        fetch('/api/departments', { signal: context?.signal }).then(response =>
          response.json()
        ),
    },
    { type: 'input', prop: 'profile.email', label: '邮箱' },
  ])
  const config = defineFormConfig<UserForm>({
    mode: 'edit',
    validateOnChange: true,
    onSubmit: async ({ model: validatedModel }) => save(validatedModel),
    onError: (error, context) => reportError(error, context),
  })
  const { model, formRef, bindings } = useCForm<UserForm>({
    initialValues: {
      name: '',
      departmentId: null,
      profile: { email: '' },
    },
    options: fields,
    config,
  })
</script>

<template>
  <C_Form
    ref="formRef"
    v-bind="bindings"
  />
</template>
```

表单已内置 `@robot-admin/form-validate`，使用侧无需另写类型适配，也不用重复安装验证依赖。`rules` / `rulesWhen` 直接接受 Naive UI 原生规则、验证库的 `NaiveRule` 和框架无关的 `RuleSpec`，可以混用；`required: true` 同样复用验证库的空值判断，`0` 和 `false` 不会被误判为空。

```ts
import {
  defineFormOptions,
  PRESET_RULES,
  NAIVE_COMBOS,
  SPEC_RULES,
} from '@robot-admin/naive-ui-components/C_Form'

const fields = defineFormOptions([
  {
    type: 'input',
    prop: 'name',
    label: '名称',
    required: true,
    rules: [SPEC_RULES.length('名称', 2, 20)],
  },
  {
    type: 'input',
    prop: 'email',
    label: '邮箱',
    rules: NAIVE_COMBOS.email('邮箱'),
  },
  {
    type: 'input',
    prop: 'mobile',
    label: '手机号',
    rules: [PRESET_RULES.mobile('手机号')],
  },
])
```

普通表单默认提供提交与重置，步骤表单最后一步默认提供提交按钮。只需配置 `submitText`、`resetText` 和 `onSubmit`；要增加预览等业务操作，使用 `action-extra` 插槽即可保留默认按钮和加载管理。需要完全定制时仍可覆盖 `action` / `step-actions`，并调用插槽的 `submit()`，不要用 `validate()` 代替提交。

异步保存放在 `config.onSubmit` 中并等待完成；`@submit` 是完成后的通知事件，不等待监听器返回的 Promise。第二参数提供 `context?.signal`，可直接传给支持取消的请求；组件卸载会发出取消信号，并停止晚到的提交事件和提示。`submitSuccessText` / `resetSuccessText` 为可选反馈文案，默认不显示成功提示，也不代表数据已持久化。

新增/编辑场景推荐用 `C_FormModal` 直接消费 Headless CRUD 的结构化 `editor`。字段、校验和布局继续由 `C_Form` 配置驱动，页面不再重复编写 Modal、按钮、loading 和草稿状态；默认采用紧凑小尺寸表单和右下角带图标操作按钮，宽度、表单尺寸与动作文案仍可覆盖：

```vue
<script setup lang="ts">
  import { C_FormModal } from '@robot-admin/naive-ui-components/C_FormModal'
  import type { FormModalEditor } from '@robot-admin/naive-ui-components/C_FormModal'
  import {
    defineFormConfig,
    defineFormOptions,
  } from '@robot-admin/naive-ui-components/C_Form'

  interface UserForm {
    name: string
  }

  defineProps<{ editor: FormModalEditor<UserForm> }>()

  const fields = defineFormOptions<UserForm>([
    { type: 'input', prop: 'name', label: '名称', required: true },
  ])
  const formConfig = defineFormConfig<UserForm>({ labelPlacement: 'top' })
</script>

<template>
  <C_FormModal
    :editor="editor"
    :options="fields"
    :config="formConfig"
  />
</template>
```

`editor` 采用结构类型，不要求组件库依赖某个请求库；任何提供 `visible/mode/model/title/loading/setModel/close/submit` 的 Headless 控制器都可接入。弹窗默认保留关闭按钮、遮罩关闭和 Esc 行为，也可按高风险表单显式关闭。

远程表格推荐交给 `useTableQuery` 管理请求取消、竞态、分页和 loading；只需把 `bindings` 绑定给组件。`rowKey` 必须稳定且唯一，默认会检测缺失和重复键。

```vue
<script setup lang="ts">
  import {
    C_Table,
    defineTableColumns,
    defineTableConfig,
    useTableQuery,
  } from '@robot-admin/naive-ui-components/C_Table'

  interface UserRow {
    id: string
    name: string
  }

  const columns = defineTableColumns<UserRow>([
    { key: 'name', title: '名称', editable: true },
  ])
  const config = defineTableConfig<UserRow>({
    selection: { enabled: true },
    edit: {
      enabled: true,
      mode: 'row',
      onSave: row => saveRow(row),
      onError: error => reportError(error),
    },
  })
  const { bindings } = useTableQuery<UserRow, { keyword: string }>({
    initialQuery: { keyword: '' },
    columns,
    config,
    rowKey: 'id',
    request: async ({ page, pageSize, query, signal }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ page, pageSize, ...query }),
        signal,
      })
      return response.json() as Promise<{ data: UserRow[]; total: number }>
    },
  })
</script>

<template>
  <C_Table v-bind="bindings" />
</template>
```

将 Headless CRUD 绑定到 `:crud` 时，表格会识别操作结果中的 `{ error }`：失败不会触发删除成功事件，也不会重复展示 CRUD 控制器已经展示的反馈。自定义 `actions.delete` 可返回 Promise，或返回 `{ data, error }` 结构。

树形数据可直接使用 `<C_Table :data="rows" :columns="columns" :config="{ tree: { defaultExpandAll: true }, pagination: false }" />`；`children` 是默认子节点字段，也可通过 `tree.childrenKey` 指定。默认展开会初始化所有父节点，并在异步追加新父节点时展开新节点，不会重新展开用户手动收起的旧节点。

`C_Tabs` 是面向页面场景切换的统一数据驱动标签页，名称与全局 `C_*` 体系保持一致。默认使用紧凑
`small` 尺寸、延迟呈现面板并支持受控/非受控状态；只做筛选或视图切换时启用 `tabsOnly`，组件
不会执行面板内容，避免隐藏内容产生渲染开销或副作用。常规场景只维护数组，复杂内容可以按需使用 `render`、`pane` 或
`pane-{key}` 插槽：

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { C_Tabs, defineTabs } from '@robot-admin/naive-ui-components/C_Tabs'

  const activeView = ref('basic')
  const views = defineTabs([
    { key: 'basic', label: '基础表格', icon: 'mdi:table' },
    { key: 'tree', label: '树形表格', icon: 'mdi:file-tree-outline' },
  ])
</script>

<template>
  <C_Tabs
    v-model="activeView"
    :items="views"
    type="segment"
    tabs-only
  />
</template>
```

| API                           | 说明                                                                      |
| ----------------------------- | ------------------------------------------------------------------------- |
| `items`                       | `key/label` 为必填，支持 `icon`、`badge`、禁用、关闭及 `renderTab/render` |
| `modelValue` / `defaultValue` | 同时支持受控和非受控状态                                                  |
| `type` / `size` / `placement` | `line/card/bar/segment` 与常用尺寸、方向；默认 `line/small/top`           |
| `tabsOnly`                    | 只呈现标签导航，适合表格场景和查询条件切换                                |
| `beforeChange`                | 支持同步或异步切换守卫；返回 `false` 或抛错均保留当前页                   |
| 插槽                          | `tab`、`pane` 和 `pane-{key}`，均提供当前 item 与 active 状态             |
| 事件                          | `change`、`close`、`add` 及标准 `update:modelValue`                       |

页面级和表格级按钮统一使用 `C_ActionBar`，无需再维护另一套 Toolbar。操作栏默认采用带图标的 `tiny` 紧凑按钮和 `6px` 间距；`add`、`refresh`、`export`、`columns`、`settings` 等语义 key 会自动补齐一致的文案、图标与按钮类型，自定义动作未传图标时使用中性操作图标。`show`、`disabled`、`loading` 可直接传布尔值、`Ref` 或 getter，异步操作默认防重复点击并自动展示 loading。`C_Table` 可在 `toolbar.actions` / `toolbar.rightActions` 中直接复用同一份动作配置，同时保留原有左右插槽；需要更大按钮时，通过 `actionBar.size` 或单个动作的 `size` 覆盖：

```ts
import { defineActions } from '@robot-admin/naive-ui-components/C_ActionBar'
import { defineTableConfig } from '@robot-admin/naive-ui-components/C_Table'

const actions = defineActions([
  { key: 'add', onClick: openCreate },
  { key: 'refresh', disabled: () => loading.value, onClick: refresh },
  { key: 'settings', group: 'right', onClick: openSettings },
])

const config = defineTableConfig({
  toolbar: {
    actions,
    actionBar: { size: 'small' }, // 可选；默认是 tiny
  },
})
```

固定高度场景使用 `flex-height + wrapper-class`，根容器负责工具栏、表格与分页的高度分配。根容器自身或父容器必须有确定高度；组件不猜测页面可用高度。`wrapper-class` 支持 Vue 字符串、数组和对象 class 绑定，应用 scoped 样式可直接命中根容器，无需引用内部 CSS 类。普通 `class` / `style` 与其他原生表格属性保持原行为，继续传给内部 `NDataTable`。

```vue
<template>
  <C_Table
    wrapper-class="inventory-table"
    flex-height
    :columns="columns"
    :data="rows"
  />
</template>
<style scoped>
  .inventory-table {
    height: 480px;
  }
</style>
```

选择列须显式配置 `{ type: 'selection' }`，通过 `@selection-change="(keys, rows) => ..."` 接收结果；主动清空时使用公开实例方法 `clearSelection()`，不观察内部 manager 状态。

`C_Table` 继续由当前 Naive UI 表格实现负责；需要 MachTable 时应由业务入口完整渲染 MachTable 及其原生配置，避免在两套列定义、事件和实例 API 之间做隐式转换。二者只共享 `C_ActionBar` 这类框架无关的页面动作模型，不互相污染。

## 常用组件约定

### 表单读写与校验

延续上例的 `useCForm()`，优先使用助手读写模型，减少手写双向同步和等待渲染的代码：

```ts
const { formRef, bindings, setValues, getValues, reset, submit } =
  useCForm<UserForm>({
    initialValues: { name: '', departmentId: null, profile: { email: '' } },
    options: fields,
    config,
  })

async function loadUser(user: UserForm) {
  await setValues(user)
  formRef.value?.markAsClean() // 将已加载记录设为重置基线
}

function preview() {
  return getValues() // 独立快照；刚编辑的值无需等待父模型下一轮更新
}
```

`setValues(values, shouldValidate = false)` 在挂载后直接调用表单实例，挂载前更新绑定模型；`getValues()` 返回副本。`reset()` 恢复当前干净快照，`markAsClean()` 可更新该基线。设置嵌套对象时传完整对象，或使用实例的 `setFieldValue('profile.email', value)` 修改单个路径。

组件模板 ref 的公开状态已由 Vue 解包：脚本中读取 `formRef.value?.isSubmitting`、`formRef.value?.isDirty` 和 `formRef.value?.formModel`，无需再取一层 `.value`。助手返回的 `model`、`formRef`、`bindings` 本身仍是 Vue ref。

普通、行内、网格布局同步提供；卡片、标签、步骤、动态和自定义布局按需加载。异步布局尚未挂载时，`submit()` 返回 `false`，`validate()` 拒绝执行，避免把未呈现的字段当成通过校验。标签和步骤布局就绪后会挂载各面板字段，整表提交也校验未访问的面板；异步选项请求按字段隔离，更新请求后晚到的旧结果不会覆盖新选项。

### 表格分页、选择与导出

新页面统一通过 `config.pagination` 配置分页；远程表格直接使用上例 `useTableQuery().bindings`，分页、总数、loading 与请求只维护一份状态。兼容路径 `:pagination="..."` 由 Naive 原生分页负责；只要显式传入该 prop（包括 `false`），它就优先于 `config.pagination`，组件不会再显示第二个分页器。原生远程模式同时传 `remote` 并自行管理请求及原生更新事件。

本地数据先筛选、排序，再分页；远程模式显示服务器返回的这一页，不再次切片。`crossPageSelection: true` 保留已访问远程页中选中的行对象；`selectAll()` 只追加当前加载页，不能代表选中尚未获取的全部服务器记录。批量操作用 `getSelectedRows()`／`@selection-change` 的行对象；需要服务器“全部命中”操作时由业务提供查询条件或服务端任务。

导出范围应显式选择：

| `config.export` 配置      | 数据来源                                                   |
| ------------------------- | ---------------------------------------------------------- |
| `scope: 'source'`（默认） | 当前传入的完整数据源；远程模式通常只有当前加载页           |
| `scope: 'page'`           | 当前呈现页，本地模式包含当前筛选、排序及分页结果           |
| `scope: 'selected'`       | 当前选中的可用行对象，包含跨页保留的已访问记录             |
| `requestData`             | 点击导出时显式请求数据，优先于 `scope`，适合服务器全量导出 |

```ts
const config = defineTableConfig({
  export: {
    scope: 'page',
    filename: 'users',
    format: 'csv',
  },
})

// 全量数据由业务显式提供；表格不会在导出时自动遍历服务器分页。
const fullExport = defineTableConfig({
  export: { requestData: () => fetchAllUsers(), filename: 'all-users' },
})
```

异步展开失败后保留错误状态，默认展开内容提供重试入口。也可使用公开实例方法 `retryExpand(key)` 重新加载；`invalidateExpand(key?)` 清除指定行或全部缓存及错误状态，本身不发请求。同一行并发加载复用一次请求；替换数据行后旧缓存失效，晚到的旧结果不会重新写入。

动态行新增、复制必须生成与表格一致的唯一键。优先传字符串 `row-key="uuid"`；若表格必须传函数 `:row-key="row => row.uuid"`，同时指定 `config.dynamicRows.rowKey: 'uuid'`，让新增和复制知道应生成哪个字段。组件不推断任意复合键；键缺失或重复时拒绝插入，关闭动态行后相关实例方法不修改数据。

### 搜索与远程表格连接

搜索表单使用 `C_FormSearch`，推荐 `v-model`；旧 `formParams` 继续兼容。业务请求放在 `config.onSearch`，`@search` 用于通知；两处同时发请求会由业务执行两次。下面将请求、分页和 loading 交给一份表格控制器：

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_FormSearch,
    type SearchConfig,
    type SearchFormItem,
    type SearchFormParams,
  } from '@robot-admin/naive-ui-components/C_FormSearch'
  import {
    C_Table,
    useTableQuery,
  } from '@robot-admin/naive-ui-components/C_Table'
  import '@robot-admin/naive-ui-components/C_FormSearch/style.css'
  import '@robot-admin/naive-ui-components/C_Table/base.css'

  const filters = ref<SearchFormParams>({ keyword: '' })
  const searchFields: SearchFormItem[] = [
    { type: 'input', prop: 'keyword', placeholder: '关键词' },
  ]
  const { bindings, loading, setQuery } = useTableQuery({
    initialQuery: { keyword: '' },
    columns,
    rowKey: 'id',
    request: loadUsers,
  })
  const applyQuery = async (params: SearchFormParams) => {
    await setQuery({ keyword: String(params.keyword ?? '') })
  }
  const searchConfig: SearchConfig = {
    requireValue: false,
    onSearch: applyQuery,
  }
</script>

<template>
  <C_FormSearch
    v-model="filters"
    :form-item-list="searchFields"
    :config="searchConfig"
    :loading="loading"
    @reset="applyQuery"
  />
  <C_Table v-bind="bindings" />
</template>
```

搜索按钮、原生表单提交（含输入框 Enter）和实例 `searchFn()` 走同一校验与防重路径；仅当前挂载的搜索控件参与 Naive 表单校验。异步校验期间条件改变、外部 loading 开启或组件卸载，会取消本次派发，成功校验的快照才进入请求。默认要求至少一个非分页条件；需要空条件查询时设置 `requireValue: false`。

`reset(params)` 事件先同步更新 v-model，再通知重置后的完整快照；不带参数的旧回调继续可用。默认仅恢复字段默认值并保留 `pageNum/pageSize`，不自动查询、不添加 debounce。上例通过显式 `@reset="applyQuery"` 刷新，并由 `setQuery()` 将表格页码归一；不要在重置回调里读取一份另行维护的旧查询对象。

### 动作配置与异步执行

保留稳定语义 key 和 Promise 回调即可获得文案、图标与互斥执行，不必为每个按钮维护 loading：

```ts
const actions = defineActions([
  { key: 'save', onClick: () => saveCurrentUser() },
  { key: 'refresh', disabled: () => loading.value, onClick: reload },
  {
    key: 'more',
    dropdown: [{ key: 'export', label: '导出', onClick: exportUsers }],
  },
])
```

同一 ActionBar 中重复 key 共享执行锁；重建动作对象、切换左右分组都保留该 key 的 busy 状态。未提供 key 时按分组和位置识别，因此动态列表应显式提供 key。更多菜单与普通按钮遵守相同的 disabled、loading 和异步互斥规则；`autoLoading: false` 只关闭自动 spinner，执行期间继续阻止重复触发。

`action-click`／`dropdown-click` 是通知，不等待事件监听器的 Promise；异步命令应放在动作 `onClick`。失败发出 `action-error(error, action, item?)`，原始错误继续交给 Vue `errorHandler`／错误捕获边界。`buttonProps.disabled/loading` 与动作状态合并，不能关闭内部 busy 保护；`buttonProps.onClick` 保留为原生点击观察者，不覆盖动作执行器。表格行操作复用轻量执行锁，无需为每行再包一层完整操作栏。

## C_Map 推荐用法

`C_Map` 统一以 `[纬度, 经度]` 接收中心点和标记坐标；切换高德地图时会在组件内部转换为其要求的 `[经度, 纬度]`，使用侧无需维护两套数据。非法标记会被隔离，组件只清理自己创建的 Marker，不会误删通过 `ready` 事件添加的业务图层。

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Map,
    type MapExpose,
    type MapMarker,
  } from '@robot-admin/naive-ui-components/C_Map'
  import '@robot-admin/naive-ui-components/C_Map/style.css'

  const mapRef = ref<MapExpose>()
  const markers: MapMarker[] = [
    { id: 'beijing', lat: 39.9042, lng: 116.4074, popup: '北京' },
  ]
</script>

<template>
  <C_Map
    ref="mapRef"
    :markers="markers"
    fit-markers-on-init
    :tile-config="{ maxZoom: 18 }"
    @error="reportError"
  />
  <button @click="mapRef?.fitToMarkers({ maxZoom: 14 })">定位全部标记</button>
</template>
```

组件实例提供 `getMap()`、`refresh()` 和 `fitToMarkers()`，适合标签页显示、容器尺寸变化和业务图层扩展。OpenStreetMap 模式会在组件内部兼容 Leaflet 的 ESM 命名空间和 CommonJS `default` 形态，宿主无需为正确性配置整包预构建。使用 `map-type="amap"` 时必须提供 `amap-key`；2021-12-02 之后申请的 Key 还必须按[高德官方安全密钥说明](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode)配置 `:amap-security-config="{ serviceHost: '/_AMapService' }"`（生产推荐，由服务端代理保管安全密钥），或仅在开发环境传 `{ securityJsCode: '...' }`。安全配置会在 SDK 脚本加载前写入，并拒绝同页混用不同 Key。宿主应用还需在 CSP 的 `script-src` 中允许 `https://webapi.amap.com`，同时在高德控制台配置域名白名单和配额限制。

`C_Date`、`C_Time`、`C_Menu`、`C_FormSearch` 均支持标准 `v-model`。组件可直接放在没有 `NMessageProvider` / `NDialogProvider` 的页面；如需统一提示、确认和文案，可在安装时传入 `feedback`、`locale`、`form` 与 `table.defaults`。

## C_Captcha 服务端校验

验证码入口使用组件库内置 SVG 状态图标，不依赖操作系统 Emoji 或在线图标服务；默认、校验中、成功和失败状态均保持一致的尺寸与语义颜色。`C_Login` 会把验证入口放在提交按钮之前并显示明确操作文案，同时透传 `captcha-visible-change`，宿主可在拼图交互期间暂停高开销背景动画。品牌接入可在外层通过 `--cc-height`、`--cc-radius`、`--cc-color`、`--cc-icon-color`、`--cc-bg`、`--cc-bg-hover`、`--cc-border`、`--cc-border-hover` 和 `--cc-focus` 调整外观，无需穿透组件内部 DOM。

默认本地模式仅证明浏览器内的拼图交互已经完成，不能作为登录、支付等敏感操作的安全凭证。生产场景应传入 `verifier`，并开启 `require-server-verification`；组件会处理超时、取消和竞态，只在独立的服务端/验证码提供商确认后发出 `success`。请求中的 `token`、`timestamp` 都由客户端生成，只能用于关联和日志，服务端绝不能把它们本身当作可信证明。

需要国内网络可用且长期免费的方案时，可显式选择开源 MIT 的 ALTCHA 自托管模式。该模式仅在使用时懒加载，不增加默认拼图入口的首屏执行成本；组件会强制服务端校验，缺少 `challenge-url` 或 `verifier` 时失败关闭。应用后端必须签发新鲜的一次性挑战、验证 PoW payload、阻止重放并限流；密钥只存于服务端。

```vue
<C_Captcha
  provider="altcha"
  challenge-url="/api/auth/captcha/challenge"
  :verifier="
    async ({ token, signal }) => {
      const response = await fetch('/api/auth/captcha/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: token }),
        signal,
      })
      return response.json() // { valid: boolean, token: '服务端一次性登录令牌' }
    }
  "
/>
```

```vue
<C_Captcha
  require-server-verification
  :verification-timeout="8000"
  :verifier="
    async ({ signal }) => {
      // providerProof 必须来自服务端或可信验证码提供商，不能由本地拼图结果伪造。
      const providerProof = await obtainTrustedCaptchaProof({ signal })
      const response = await fetch('/api/captcha/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ providerProof }),
        signal,
      })
      return response.json() // { valid: boolean, token: 'server-issued-token' }
    }
  "
  @verify-error="reportError"
/>
```

开启 `require-server-verification` 后，成功响应必须包含服务端 token。该 token 应短期、一次性使用，并绑定当前会话或业务请求。`C_Login` 可通过 `captchaProvider`、`captchaChallengeUrl`、`captchaVerifier`、`requireCaptchaServerVerification` 和 `captchaVerificationTimeout` 透传同一安全策略，并在 `submit` 数据中通过 `captchaType` 与 `captchaVerifiedBy` 标识验证类型和来源。更多边界说明见 [SECURITY.md](../../SECURITY.md)。

`C_Login` 的“记住我”只保存用户名，不保存密码。短信验证码仅对格式正确的手机号触发事件；组件会立即开始本地倒计时，发送结果和服务端限流仍由宿主处理。`C_City` 在首次打开时才加载城市索引，字母跳转只作用于当前实例；默认触发器、字母和城市项均可用键盘操作。

## 表格加载态

`C_Table` 默认显示跟随主题主色的数据光环 SVG 加载动画：环形轨道、数据行和细光束提示等待状态，保留已有数据，并遵循系统减少动态效果设置，无需页面配置。内置异步展开行同样复用 `C_Loading`；自定义展开内容仍由使用侧决定展示。可通过 `loading` 插槽替换默认内容。独立的 `C_Loading` 支持 `size`（16–120，默认 48）、`label`（可选说明）和 `color`（可选颜色）；原生 `NSpin` 使用时请关闭旋转，避免 SVG 整体转动：

```vue
<NSpin :show="loading" :size="48" :rotate="false">
  <template #icon><C_Loading /></template>
  <section>页面内容</section>
</NSpin>
```

## C_Login 扩展表单

`password-fields` 插槽位于密码输入框下方，提供 `username`、`loading`，可配置工作空间或其他业务字段。`username-change` 在初始预填、恢复记住的账号和输入变化时同步触发。宿主通过 `submitDisabled` 阻止扩展字段尚未就绪时的按钮与回车提交；`loading` 期间凭据输入禁用。公司查询、成员关系和权限始终由宿主认证服务处理，组件不保存业务上下文。

## 页面切换加载

路由生命周期只需要关联 `start()` / `finish(id)`；动画、主题和减少动态效果由组件库处理。默认延迟 160ms 显示，快速切换不闪烁，旧任务完成不会关闭新任务。

```vue
<C_PageLoading :show="loading.visible.value" />
```

```ts
import { createPageLoading } from '@robot-admin/naive-ui-components/C_PageLoading'
const loading = createPageLoading({ delay: 160 })
const id = loading.start()
// 路由完成、取消或失败后
loading.finish(id)
```

## 应用级扩展与迁移

`createHighlight()`、`setupHighlight()` 各自持有独立高亮实例；组件中的 `useHighlight()` 读取应用注入，独立调用创建新的 API。默认不写入 `window.hljs`，只有兼容旧窗口用法时显式开启 `exposeToWindow: true`。

全量插件为每个应用持有独立表单 registry。已有全局 `registerRenderer()` 用法应迁移到 `createFormRendererRegistry()` 与插件的 `formRenderers` 选项；子路径接入可以显式提供 `FORM_RENDERER_REGISTRY_KEY`。示例、优先级和所有权规则见[架构与隔离](../architecture.md)。
