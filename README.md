<div align="center">

# @robot-admin/naive-ui-components

**基于 Naive UI 的 Vue 3 企业级组件库**

从 Robot Admin 中提炼的 55 个高质量业务组件，支持全量注册、按需导入（Tree-Shaking）和子路径独立导入。

[![NPM Version](https://img.shields.io/npm/v/@robot-admin/naive-ui-components)](https://www.npmjs.com/package/@robot-admin/naive-ui-components)
[![License](https://img.shields.io/npm/l/@robot-admin/naive-ui-components)](./LICENSE)

[在线文档](https://www.tzagileteam.com/robot/components/preface) · [GitHub](https://github.com/ChenyCHENYU/naive-ui-components) · [NPM](https://www.npmjs.com/package/@robot-admin/naive-ui-components)

[English](./README_EN.md)

</div>

---

## 📦 安装

```bash
bun add @robot-admin/naive-ui-components
```

必需的对等依赖：

```bash
bun add vue@^3.5.0 naive-ui@^2.35.0
```

### 🚀 快速开始

#### 全局注册

```typescript
import { createApp } from 'vue'
import NaiveUIComponents from '@robot-admin/naive-ui-components'
import '@robot-admin/naive-ui-components/style.css'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

#### 按需导入（主入口 Tree-Shaking）

```vue
<script setup lang="ts">
  import { C_Icon, C_Table, C_Form } from '@robot-admin/naive-ui-components'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

#### 子路径独立导入（推荐，最小打包体积）

每个组件都提供独立的子路径入口，仅加载目标组件的代码和类型：

```vue
<script setup lang="ts">
  import { C_Form } from '@robot-admin/naive-ui-components/C_Form'
  import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
  import { C_Icon } from '@robot-admin/naive-ui-components/C_Icon'
  import { createMenuOptions } from '@robot-admin/naive-ui-components/C_Menu'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

> 子路径导入提供完整的 TypeScript 类型支持（`.d.ts`），IDE 可自动补全 props / emits / slots。组件相关工具函数（如 `createMenuOptions`）也从对应组件子路径导出，避免为了单个工具加载组件库根入口。

#### Composables 单独使用

```typescript
import {
  useTableManager,
  useFormState,
  usePlayerCore,
} from '@robot-admin/naive-ui-components'
```

#### 自动按需导入（推荐）

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

### Cron 与公式工作区

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

### C_Guide 配置引导

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

### C_Form / C_Table 推荐用法

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

### C_Map 推荐用法

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

### C_Captcha 服务端校验

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

开启 `require-server-verification` 后，成功响应必须包含服务端 token。该 token 应短期、一次性使用，并绑定当前会话或业务请求。`C_Login` 可通过 `captchaProvider`、`captchaChallengeUrl`、`captchaVerifier`、`requireCaptchaServerVerification` 和 `captchaVerificationTimeout` 透传同一安全策略，并在 `submit` 数据中通过 `captchaType` 与 `captchaVerifiedBy` 标识验证类型和来源。更多边界说明见 [SECURITY.md](./SECURITY.md)。

`C_Login` 的“记住我”只保存用户名，不保存密码。短信验证码仅对格式正确的手机号触发事件；组件会立即开始本地倒计时，发送结果和服务端限流仍由宿主处理。`C_City` 在首次打开时才加载城市索引，字母跳转只作用于当前实例；默认触发器、字母和城市项均可用键盘操作。

### 表格加载态

`C_Table` 默认显示跟随主题主色的数据光环 SVG 加载动画：环形轨道、数据行和细光束提示等待状态，保留已有数据，并遵循系统减少动态效果设置，无需页面配置。内置异步展开行同样复用 `C_Loading`；自定义展开内容仍由使用侧决定展示。可通过 `loading` 插槽替换默认内容。独立的 `C_Loading` 支持 `size`（16–120，默认 48）、`label`（可选说明）和 `color`（可选颜色）；原生 `NSpin` 使用时请关闭旋转，避免 SVG 整体转动：

```vue
<NSpin :show="loading" :size="48" :rotate="false">
  <template #icon><C_Loading /></template>
  <section>页面内容</section>
</NSpin>
```

### 📋 组件清单（55 个）

> 💡 所有组件均提供 **在线交互演示**，访问 [组件文档](https://www.tzagileteam.com/robot/components/preface) 可直接在页面中体验真实效果（通过 iframe 嵌入 Robot Admin 生产环境）。

#### 基础组件

| 组件             | 说明                    | 外部依赖                      |
| ---------------- | ----------------------- | ----------------------------- |
| `C_Icon`         | Iconify 图标封装        | `@iconify/vue`                |
| `C_Loading`      | 主题化 SVG 加载态       | -                             |
| `C_PageLoading`  | 主题化页面切换加载      | -                             |
| `C_Code`         | 代码高亮显示            | `highlight.js`                |
| `C_Barcode`      | 条形码生成器            | `@chenfengyuan/vue-barcode`   |
| `C_Captcha`      | 拼图/ALTCHA 人机验证    | `vue3-puzzle-vcode`、`altcha` |
| `C_Cascade`      | 级联面板选择器          | -                             |
| `C_Guide`        | 新手引导                | `driver.js`                   |
| `C_Progress`     | 增强进度条              | -                             |
| `C_Steps`        | 步骤条                  | -                             |
| `C_ActionBar`    | 操作按钮栏              | -                             |
| `C_Theme`        | 主题切换器              | -                             |
| `C_Language`     | 语言切换器              | -                             |
| `C_Date`         | 日期选择器增强          | -                             |
| `C_City`         | 省市区三级联动          | -                             |
| `C_Breadcrumb`   | 面包屑导航              | -                             |
| `C_Menu`         | 导航菜单                | -                             |
| `C_Tabs`         | 数据驱动标签页/场景切换 | -                             |
| `C_TagsView`     | 标签页导航              | -                             |
| `C_GlobalSearch` | 全局搜索面板            | -                             |
| `C_AvatarGroup`  | 头像组合展示            | -                             |
| `C_OrgChart`     | 组织架构图              | -                             |
| `C_Skeleton`     | 骨架屏占位组件          | -                             |

#### 内容 & 编辑组件

| 组件              | 说明                         | 外部依赖                  |
| ----------------- | ---------------------------- | ------------------------- |
| `C_Editor`        | 富文本编辑器                 | `@wangeditor-next/editor` |
| `C_Markdown`      | Markdown 编辑器/预览         | `md-editor-v3`            |
| `C_FormulaEditor` | 公式编辑器（安全表达式引擎） | 内置                      |
| `C_Signature`     | 电子签名                     | -                         |
| `C_QRCode`        | 二维码生成器                 | `qrcode`                  |
| `C_ImageCropper`  | 图片裁剪器                   | `vue-cropper`             |

#### 数据展示组件

| 组件             | 说明                                      | 外部依赖                   |
| ---------------- | ----------------------------------------- | -------------------------- |
| `C_Table`        | 高级数据表格（CRUD/行列编辑/动态行/打印） | `print-js`、`html2canvas`  |
| `C_Map`          | 地图组件（OSM/高德）                      | `leaflet`                  |
| `C_VtableGantt`  | 甘特图                                    | `@visactor/vtable-gantt`   |
| `C_AntV`         | 图编辑器（ER/BPMN/UML）                   | `@antv/x6`、`html2canvas`  |
| `C_WaterFall`    | 瀑布流布局                                | -                          |
| `C_FullCalendar` | 日历事件                                  | `@fullcalendar/*`          |
| `C_VideoPlayer`  | 视频播放器（HLS/字幕/书签/章节）          | `xgplayer`、`xgplayer-hls` |
| `C_AudioPlayer`  | 音频播放器（波形/进度/播放列表）          | -                          |
| `C_FilePreview`  | 文件预览（PDF/Word/Excel）                | `xlsx`、`mammoth`          |
| `C_Timeline`     | 时间线（垂直/水平/可折叠）                | -                          |

图片/日历类组件的使用边界：`C_ImageCropper` 翻转会更新实际图片源并重置当前裁剪位置，加载和导出失败通过 `error: Error` 报告；`C_Signature` 的 `readonly` 只禁止用户交互，暴露方法仍可用于加载历史数据，其 SVG 导出是保留画布效果的栅格嵌入 SVG；`C_QRCode` 带 Logo 的 SVG 同样采用栅格嵌入，以保持预览与导出一致。`C_FullCalendar` 使用本地日历日期创建当日事件；`C_WaterFall` 会根据图片实际宽高比自动重排，建议以稳定唯一的 `id` 标识每项。

#### 表单 & 布局组件

| 组件              | 说明                                              | 外部依赖             |
| ----------------- | ------------------------------------------------- | -------------------- |
| `C_Form`          | 动态表单引擎（Grid/Tabs/Steps/Card/Dynamic 布局） | -                    |
| `C_FormModal`     | 数据驱动的新增/编辑表单弹窗                       | -                    |
| `C_FormSearch`    | 搜索表单                                          | -                    |
| `C_CollapsePanel` | 折叠面板                                          | -                    |
| `C_SplitPane`     | 分割面板                                          | -                    |
| `C_Draggable`     | 拖拽排序                                          | `vue-draggable-plus` |
| `C_Tree`          | 高级树形控件                                      | -                    |
| `C_Time`          | 时间选择器增强                                    | -                    |
| `C_Cron`          | Cron 表达式编辑器                                 | -                    |
| `C_Transfer`      | 穿梭框（搜索/全选/批量操作）                      | -                    |

#### 交互 & 业务组件

| 组件            | 说明                                   | 外部依赖 |
| --------------- | -------------------------------------- | -------- |
| `C_Chat`        | 聊天组件（联系人/消息气泡/输入框）     | -        |
| `C_ContextMenu` | 右键菜单（嵌套子菜单/快捷键/危险操作） | -        |
| `C_Login`       | 登录组件（5种模式/验证码/记住用户名）  | -        |

#### 流程 & 通知组件

| 组件                   | 说明                                 | 外部依赖         |
| ---------------------- | ------------------------------------ | ---------------- |
| `C_WorkFlow`           | 工作流编辑器（审批/抄送/条件节点）   | `@vue-flow/core` |
| `C_NotificationCenter` | 通知中心（WebSocket/轮询）           | -                |
| `C_Upload`             | 大文件上传（分片/断点续传/哈希校验） | `spark-md5`      |

### 🔌 依赖说明

`C_FilePreview` 的 URL 入口仅接受 HTTPS 或当前站点同源 HTTP（便于本地开发）；不接受脚本、数据 URL、带凭据 URL 或跨站明文 HTTP。`autoPreview` 会在有文件源时自动打开预览，已打开时切换文件源会刷新内容。重复预览会释放旧 PDF 对象 URL，并忽略过期加载结果。Excel 单元格的 `0` 与 `false` 会原样保留。

`C_AntV` 的 BPMN 对外数据保持 `{ nodes, flows }` 领域结构；组件内部转换为 X6 单元格，并在 `data-change` / `getData()` 中还原节点位置、类型、属性和连线条件。BPMN/UML 仅在未提供 `data` 时加载内置示例；显式传入空数据会显示空画布。

`C_VtableGantt` 合并预设与 `options` 时会保留未覆盖的嵌套配置、以新数组整体替换旧数组，并忽略原型相关键；全屏按钮状态仅反映该甘特图容器的实际全屏状态。

`C_AudioPlayer` 只在浏览器确认 `play()` 成功后进入播放状态并触发 `play`；自动播放被拒绝时会触发 `error`，空播放列表不会产生虚假的播放事件。静音、曲目和进度条均可用键盘操作。

`C_CollapsePanel` 与 `C_TagsView` 会校验本地持久化数据结构；损坏或旧格式数据会安全回退，不会阻断组件初始化。持久化标签仅恢复站内路径，特殊字符路径的定位不会拼接 CSS 选择器。

`C_Table` 列设置只恢复有效的列键、可见性、列宽和固定方向；损坏的 `persistKey` 存储会回退到传入列。列设置在本地副本上操作，不会修改调用方的列对象。`C_Upload` 的默认文件列表同样会复制后再管理，文件选择、拖拽和粘贴共用 `accept` 过滤，图片操作可通过键盘识别和访问；并发计算哈希时，各文件显示自己的进度。分片上传在查询断点、请求或合并阶段取消后，不会继续派发请求或发出过期的完成事件。自定义上传请求的 `abort()` 即使不回调，也会释放分片等待任务。

`C_WorkFlow` 会在首次渲染时加载传入的 `modelValue`，并在 `getCurrentWorkflowData()` / `save` / `change` / `node-click` 中输出隔离的数据快照，避免调用方意外修改内部节点。条件编辑弹窗在保存前不会修改画布数据，未填完整的条件不会被静默丢弃。`readonly` 禁止节点拖拽、连线、配置、增删与保存，但仍允许预览、验证和适应视图；节点与条件 ID 在同一时刻连续创建时保持唯一。

类型验证同时覆盖 TypeScript 源码、Vue 单文件组件模板和发布后的使用侧示例。`C_Table` 合计行的 `summary.render` 应返回按列键组织的对象（`{ columnKey: { value, colSpan? } }`）；`C_FormSearch` 的日期范围兼容原有数字时间戳数组，也支持格式化字符串数组，两种值会分别绑定 Naive UI 对应的值接口。

组件运行依赖已由本包声明，安装组件库时会自动解析。所有场景都需要：

```bash
bun add vue naive-ui
```

按功能安装可选 peer：使用 `C_Breadcrumb`/`C_TagsView` 时安装 `vue-router`；启用 C_Table 行/列拖拽时安装 `sortablejs`。子路径导入不会要求无关的可选 peer。公式编辑器使用组件库内置的受限表达式解析器，不执行动态 JavaScript。

### 🏗️ 构建架构

#### 六阶段构建流水线

```
bun run build
  ├── 1. tsdown          → 多入口打包（55 组件 ESM/CJS/DTS）
  ├── 2. sass CLI        → 编译共享变量入口 → global-scss.css
  ├── 3. merge-css.js    → 合并 Vue 编译后的 SFC CSS + 全局变量 → style.css
  ├── 4. gen-exports.js  → 自动生成 package.json exports 映射
  ├── 5. check:dist      → 校验根入口、子路径、SSR 及 DTS 公共导出
  └── 6. check:size      → 校验全量/基础样式与发布包体积预算
```

#### 技术要点

- **构建引擎**：[tsdown](https://github.com/rolldown/tsdown)（基于 Rolldown），55 个独立入口并行编译
- **SCSS 处理**：自定义 `scssTransformPlugin` 在 Rolldown 管线内编译 SFC SCSS，独立 Sass CLI 仅编译共享变量入口
- **CSS 合并**：构建后将 Vue 已完成 scoped 转换的 per-chunk CSS 与共享变量合并为单一 `style.css`，避免重复样式和原始 `:deep()` 选择器泄漏
- **类型导出**：统一 `export *` barrel 模式，自动生成完整 `.d.ts`
- **子路径导出**：`gen-exports.js` 自动扫描 `dist/` 并写入 `package.json` 的 `exports` 字段
- **导出冲突检测**：`check-export-conflicts.js` 确保组件间无命名冲突
- **产物入口校验**：`check-dist-entries.js` 防止内部 chunk 覆盖根声明，并保证组件工具的子路径类型完整
- **包契约校验**：禁止 Naive UI 内部类型路径、隐式可选依赖和插件控制台副作用
- **体积预算**：`check-size-budget.js` 阻止全量样式、C_Form/C_Table 样式和 dist 总量意外膨胀

#### 输出产物

```
dist/
├── index.js / index.cjs / index.d.ts     # 主入口
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # 子路径入口（55 组件）
├── C_Form.base.css / C_Form.full.css      # 基础/完整样式层级
├── C_Table.base.css / C_Table.full.css    # 基础/完整样式层级
├── style.css                              # 合并后的全量样式
├── images/                                # Leaflet Marker/图层控件资源
└── [chunk].js                             # 共享代码块
```

### 🔧 开发

环境基线为 Node.js 20.19.0+ 与 Bun 1.3.14；仓库通过 `.node-version`、`packageManager`、`engines` 和冻结锁文件保持本地/CI 一致。

```bash
bun install --frozen-lockfile # 严格按锁文件安装依赖
bun run dev              # 开发模式（SCSS watch + tsdown watch）
bun run build            # 完整构建
bun run build:scss       # 仅编译全局 SCSS
bun run build:css        # 合并 tsdown 刚生成的 CSS chunk；已完成的 dist 会安全跳过
bun run build:exports    # 仅生成 exports 映射
bun run check:exports    # 检测导出命名冲突
bun run check:dist       # 校验构建后的 JS / DTS 公共入口
bun run check:package    # 校验依赖、导出和源码公共边界
bun run check:quality    # 防止 any、console 与类型抑制债务反弹
bun run check:audit      # 审计直接与传递依赖漏洞
bun run check:size       # 校验发布产物体积预算
bun run type-check       # TypeScript 类型检查
bun run test             # 运行 Bun 单元测试
bun run lint:check       # 强制 Oxlint 正确性检查
bun run lint:eslint      # ESLint 存量规则审计
bun run verify           # 类型、测试、导出和构建全量验证
```

#### 项目结构

```
naive-ui-components/
├── src/
│   ├── index.ts                     # 库入口（全量注册 + export * barrel）
│   ├── styles/
│   │   ├── variables.scss           # CSS 变量 (--c-*)
│   │   └── global.scss              # 自动生成的共享变量入口
│   ├── components/
│   │   └── C_[Name]/
│   │       ├── index.vue            # 组件主文件
│   │       ├── index.ts             # Barrel 导出
│   │       ├── index.scss           # 组件样式
│   │       ├── types.ts             # 类型定义
│   │       ├── constants.ts         # 常量
│   │       ├── data.ts              # 静态数据
│   │       ├── composables/         # 组合式函数
│   │       ├── components/          # 子组件
│   │       └── layouts/             # 布局变体（C_Form/C_AntV）
│   ├── plugins/                     # highlight.js 等插件
│   └── utils/                       # 工具函数
├── scripts/
│   ├── gen-global-scss.js           # 生成 global.scss（仅共享变量）
│   ├── watch-global-scss.js         # 开发模式 SCSS 监听
│   ├── merge-css.js                 # 合并 CSS 产物
│   ├── gen-exports.js               # 自动生成 package.json exports
│   └── check-export-conflicts.js    # 导出命名冲突检测
├── types/
│   └── env.d.ts                     # .vue / .scss 模块声明
├── tsdown.config.ts                 # 构建配置（多入口 + SCSS 插件 + Vue 插件）
└── tsconfig.json
```

#### 添加新组件

1. 创建 `src/components/C_NewComponent/` 目录
2. 编写 `index.vue`、`index.ts`（barrel）、`types.ts`
3. 在 `src/index.ts` 中添加 `export * from './components/C_NewComponent'`
4. 运行 `bun run build`—构建脚本会自动生成子路径入口和 exports 映射

#### 发布

```bash
bun run changeset       # 记录变更及版本级别
bun run version         # 更新版本号与 CHANGELOG
bun run verify          # 发布前完整验证
bun run release         # 发布 Changesets 中待发布版本
```

本仓库的 GitHub 变更日志生成器要求在执行 `bun run version` 时提供 `GITHUB_TOKEN`，不要将令牌写入仓库。Windows 下如果 `bun run release` 在 npm 的 `prepublishOnly` 重复验证阶段停滞，可先单独确认 `bun run verify` 成功，再在 PowerShell 中用 `$env:npm_config_ignore_scripts='true'; bun run release` 发布；该设置仅跳过已手动完成的重复生命周期验证，不应省略前一步。

## 发布后的安全扫描记录（2026-10-06）

`0.13.5` 的 npm 产物与已验证产物内容一致。随后安全扫描更新了开发工具和解析依赖的锁文件，并将仓库 overrides 中的 `@xmldom/xmldom`、`fast-uri` 固定到 `0.8.15`、`3.1.8`；这部分仓库维护不覆盖已经发布的 npm 产物。

当前扫描仍报告 [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 和 [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) 两项上游尚无发布修复版本的告警，`bun run check:audit` 仍非零退出。保留 CI 安全门禁和真实扫描结果；待上游发布修复后更新锁文件并复验。

本机完整 `verify` 通过。同步后的 [GitHub CI](https://github.com/ChenyCHENYU/naive-ui-components/actions/runs/37463121552) 因账号 billing issue 未启动，不能将其写成远端验证通过；账号恢复后需重新运行。

## 📄 许可证

MIT License

---

## 🔗 链接

- [组件在线文档（含交互演示）](https://www.tzagileteam.com/robot/components/preface)
- [Robot Admin 主项目](https://github.com/ChenyCHENYU/robot_admin)
- [Robot Admin 在线体验](https://www.robotadmin.cn)
- [GitHub](https://github.com/ChenyCHENYU/naive-ui-components)
- [NPM](https://www.npmjs.com/package/@robot-admin/naive-ui-components)

### C_Login 扩展表单

`password-fields` 插槽位于密码输入框下方，提供 `username`、`loading`，可配置工作空间或其他业务字段。`username-change` 在初始预填、恢复记住的账号和输入变化时同步触发。宿主通过 `submitDisabled` 阻止扩展字段尚未就绪时的按钮与回车提交；`loading` 期间凭据输入禁用。公司查询、成员关系和权限始终由宿主认证服务处理，组件不保存业务上下文。

### 页面切换加载

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
