[← 项目首页](../README.md) · [English](./architecture.en.md)

# 架构与隔离边界

本组件库继续作为 Naive UI 的独立适配包维护。未来 Element Plus 面向其他项目独立安装、独立发布；两套呈现层共享业务协议和经过实际验证的逻辑，不相互依赖组件、类型或样式。

## 本轮收敛范围

| 层级                                 | 当前职责                             | 边界                                    |
| ------------------------------------ | ------------------------------------ | --------------------------------------- |
| `src/core/`                          | 反馈／语言协议、默认语言和纯翻译函数 | 无 Vue、UI 库、浏览器环境与全局运行状态 |
| `src/context.ts`、`src/composables/` | Vue 注入键与语言上下文绑定           | 不承担 Naive 消息、弹窗实现             |
| `src/adapters/naive/`                | Naive Message / Dialog 适配          | Naive 消息／弹窗反馈留在适配层          |
| `src/components/`                    | 现有 `C_*` 组件、Naive 类型与呈现    | 保留稳定 API，不假装为通用 UI 内核      |
| `src/config.ts`                      | 原有配置导入的兼容入口               | 对已有消费者保留导出路径                |

目前 `core` 是仓库内部边界，尚未发布独立公共 core 包。未来通过 Element Plus 的真实场景提取共享包，不让新适配器依赖整个 Naive 包。现有表单的 `FormInst`、原生字段与表格的 `DataTableBaseColumn` 继续属于 Naive 层。

## 依赖与发布入口

- 组件子路径消费目标组件及其依赖，适合独立页面和路由加载。
- 全量插件使用公开的 `C_*` 名称注册组件，不以 SFC 的编译推断名注册，避免多个 `index.vue` 互相覆盖或覆盖宿主的 `index` 组件。
- 根入口聚合全部组件并保留全量安装语义，包含导航组件；运行时导入根入口需要安装可选 peer `vue-router`，即使只使用根入口中的非路由组件。无需路由的项目优先使用组件子路径。
- `sortablejs` 只在启用对应拖拽功能时需要。可选 peer 与 JS 按需加载不意味着普通运行依赖也按需安装。
- ESM 使用 `.d.ts`，CJS 使用 `.d.cts`；条件类型入口与相应 JavaScript 格式对应。
- 公共可达声明同时检查 ESM / CJS，不能引用 `naive-ui/es/*` 或 `naive-ui/lib/*` 内部路径。

新增消费者契约验证使用真实 tarball，在临时目录解包并接入仓库已解析的依赖；覆盖 Node16 / NodeNext 的 ESM / CJS 类型与缺失可选 peer 的子路径运行行为。它不联网重新安装依赖，因此不能代替最低／最新依赖版本矩阵或真实应用验收。

## 高亮实例

```ts
import {
  createHighlight,
  setupHighlight,
} from '@robot-admin/naive-ui-components'

const standalone = createHighlight({ autoDetect: true })
const application = setupHighlight(app, { autoDetect: false })
```

`createHighlight()`、每次 `setupHighlight()` 均独立持有 hljs、语言注册和加载状态。组件 `setup` 中的 `useHighlight()` 优先读取当前应用注入；独立上下文调用则创建自己的 API。需要跨调用复用时，保留并传递同一个 API，不能依赖模块单例。

默认不会写入 `window.hljs`。确实依赖旧窗口 API 的应用可显式使用 `setupHighlight(app, { exposeToWindow: true })`；卸载时按所有权恢复原属性，宿主后续覆盖的值不会被回收。现有 `highlightManager` 注入键及组件消费方式保留。

## 表单渲染器

```ts
import { createApp, h } from 'vue'
import { NInput } from 'naive-ui'
import Components, {
  createFormRendererRegistry,
} from '@robot-admin/naive-ui-components'
import App from './App.vue'

const renderers = createFormRendererRegistry({
  input: props => h(NInput, { ...props, clearable: true }),
})

createApp(App).use(Components, { formRenderers: renderers }).mount('#app')
```

全量插件默认为每个应用创建独立 registry；显式传入同一 registry 才共享。局部注册组件的应用可以使用 `app.provide(FORM_RENDERER_REGISTRY_KEY, registry)`，工厂和键也从 `C_Form` 子路径导出。

优先级为：组件实例的 `renderers` → 独立 registry → 内置 renderer。独立 registry 不回退到 legacy 全局注册表。`register()` 返回身份绑定的注销函数；覆盖后调用旧注销函数不会删除新注册，运行时增删也会更新组件。

`registerRenderer()` / `unregisterRenderer()` 仍作为显式 legacy 全局 API 保留，只用于没有独立 registry 的旧消费路径。已有全量插件项目应将自定义渲染器改为传入 `formRenderers`，或在同一个 registry 上注册；不再依赖全局注册影响已安装的其他应用。

## Element Plus 演进顺序

1. 保持 Naive 入口、样式和既有业务消费稳定，先收敛当前发布与状态隔离问题。
2. 新建独立 Element Plus 适配包，从表单、查询、表格、表单弹窗和操作栏选择真实业务试点。
3. 优先复用现有 `form-validate` 的 RuleSpec、`request-core/vue` 的 Headless CRUD，以及 `theme/core` / `theme/tokens`；不复制同一套数据状态机。
4. 由试点提取中立字段、列、校验和状态协议；具体 UI props、事件映射、实例与渲染器分别留在各适配包。
5. 两个包各自声明 UI peer、构建、发布和样式入口。独立应用安装其中一个时，不要求另一个 UI 库。

本轮不要求同一应用同时运行两套 UI。未来如果新增该需求，需要另验组件注册名、样式命名空间、弹层挂载与主题所有权；Element Plus 的[命名空间](https://element-plus.org/en-US/guide/namespace.html)需要 ConfigProvider 与 SCSS 配置一致，其[主题文档](https://element-plus.org/en-US/guide/theming.html)也建议按局部类作用域覆盖变量。

## 验收原则

测试验证实际行为：发布消费者、稳定公共类型、双应用配置、动态注册／注销、卸载与宿主状态恢复。源码结构守卫只负责依赖方向，不能代替实际运行测试。

`bun run verify` 覆盖本地完整质量门禁；`bun run check:audit` 保留独立执行与 CI 门禁。审计告警需按真实结果处理，不通过关闭门禁或未验证的主版本覆盖隐藏风险。
