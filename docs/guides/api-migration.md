# 兼容 API 迁移

现有兼容入口继续工作，本轮不移除属性、事件或导出。新代码使用下表主 API；旧项目按页面逐步迁移，不需要增加业务类型包装或批量重写。

| 兼容写法                                                                                   | 主 API                                                               | 迁移要点                                                         |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `C_Date` 的 `singleDate` / `singleDateTime` / `dateRange` / `dateTimeRange` / `smartRange` | `v-model` 与 `mode`                                                  | 同步迁移对应 `update:*` 监听；保持原日期格式和模式               |
| `C_FormSearch :form-params`                                                                | `v-model` 或 `:model-value`                                          | 单向输入用 `:model-value`；需要父状态同步才用 `v-model`          |
| `C_Menu :value` / `v-model:value`                                                          | `:model-value` / `v-model`                                           | 路由决定的选中值继续单向传入；`@select` 导航逻辑保留             |
| 全局 `registerRenderer` / `unregisterRenderer`                                             | 应用自己的 `createFormRendererRegistry()`                            | 安装时传 `formRenderers`，或子路径接入时 `provide`               |
| `TableEditProps` / `TableExpandProps` / `TableSelectionProps`                              | `defineTableConfig<Row>()` 与 `config.edit` / `expand` / `selection` | 旧类型不代表组件当前 props；按现行配置字段迁移，不做类型断言强转 |

## 日期与查询

日期的模式和值保持对应关系，不要在一个组件上同时传新旧两份模型。`modelValue` 优先于兼容属性；重复监听新旧更新事件会让应用回调执行两次。

| 旧模型           | `mode`          |
| ---------------- | --------------- |
| `singleDate`     | `date`，可省略  |
| `singleDateTime` | `datetime`      |
| `dateRange`      | `daterange`     |
| `dateTimeRange`  | `datetimerange` |
| `smartRange`     | `smart-range`   |

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { C_Date } from '@robot-admin/naive-ui-components/C_Date'
  import { C_FormSearch } from '@robot-admin/naive-ui-components/C_FormSearch'

  const period = ref<[string, string] | null>(null)
  const query = ref({ keyword: '' })
</script>

<template>
  <C_Date
    v-model="period"
    mode="daterange"
  />
  <C_FormSearch
    v-model="query"
    :form-item-list="[{ type: 'input', prop: 'keyword' }]"
    :config="{ onSearch: params => loadRows(params.keyword) }"
  />
</template>
```

`loadRows` 代表应用自己的请求函数。`params` 从初始模型推导，业务不需要手写索引签名。原来仅用于同步父值的 `@change-params` 可在使用 `v-model` 后移除；其中的业务副作用要按原语义保留。请求只由 `config.onSearch` 或 `@search` 中的一处发起。

`searchRef.formParams` 是仍受支持的实例读取能力，**不是**被弃用的 `formParams` 输入属性。`C_Time` 的 `defaultStartTime` 等初始值与变更事件也没有被本轮废弃。

## 菜单

受路由控制的菜单只替换输入属性，保持原来的导航归属：

```vue
<C_Menu :model-value="route.name" :options="menus" @select="navigate" />
```

普通本地选择使用 `v-model="selected"`；显式监听则将 `@update:value` 改为 `@update:model-value`。不要为了改用 `v-model` 而给只读的路由计算值添加无意义 setter。

## 应用级表单渲染器

在每次创建应用时创建 registry。SSR、多应用或测试隔离场景不要在共享模块顶层创建同一份可变 registry，除非有意共享。

```ts
import type { App } from 'vue'
import {
  createFormRendererRegistry,
  FORM_RENDERER_REGISTRY_KEY,
  type FormRenderer,
} from '@robot-admin/naive-ui-components/C_Form'

export function setupFormRenderer(app: App, inputRenderer: FormRenderer) {
  const registry = createFormRendererRegistry()
  const unregister = registry.register('input', inputRenderer)
  app.provide(FORM_RENDERER_REGISTRY_KEY, registry)
  app.onUnmount(() => {
    unregister()
  })
  return registry
}
```

全量插件接入则使用 `app.use(ComponentLib, { formRenderers: registry })`。旧的全局注册表不会自动复制到应用 registry。动态替换时优先调用 `register` 返回的注销函数：旧注册的注销函数不会误删后续新注册。只有一个表单需要定制时，继续使用组件的 `renderers` 属性即可。

## 检查真实消费代码

工具在**组件库源码仓库**运行，使用该仓库已安装的 TypeScript 与 Vue SFC 编译器，不加载目标项目的构建配置、不执行业务代码、不修改文件，也不新增运行时依赖。它不是已发布 npm 包的 CLI。

```sh
# 在组件库根目录，先查看报告
bun scripts/check-legacy-usage.js /path/to/app/src --global-components

# CI：出现确定的旧入口时退出 1
bun scripts/check-legacy-usage.js /path/to/app/src --global-components --strict --json

# 只检查显式 import 的项目不加 --global-components
bun scripts/check-legacy-usage.js /path/to/app/src --strict

# 本仓库持续验证主 API 示例，旧兼容测试另行保留
bun scripts/check-legacy-usage.js tests/consumer/C_CurrentApi.vue --strict
```

- `--global-components` 仅用于已配置组件库 resolver 或全量注册的项目，同时允许自动导入的 `h`。本地同名声明和其他来源的 import 优先，不按名字硬判。
- 检查 Vue 模板属性、旧模型/更新事件、静态 `v-bind` 对象、`h` / `createVNode`、JSX、直接旧导出/类型导入；支持包根与组件子入口的命名别名和 namespace。普通业务对象、注释、字符串、实例 `formParams` 不会被当成违规。
- 动态 props、对象展开/动态键、动态组件、动态 import/require、外部 SFC script 和非 HTML 模板列入 `unverified`。工具不做跨模块转导出追踪、变量别名传播或运行时数据流分析；包装组件、Options API 的注册别名、模板表达式里的函数调用需人工核对。
- 默认有旧入口时只报告；`--strict` 阻断确定的旧入口。`unverified` 不被伪装为已验证，也不会被自动改写；需要结合报告人工处理。解析错误、无有效源码或无效参数始终退出 2。
- 默认忽略声明文件、依赖、构建产物和目录中的符号链接。传入实际源码目录；不要把整个兼容回归测试集当成必须零旧入口的消费目录。

迁移后运行应用自己的类型、构建和行为验证，检查清空值、路由选择、请求次数与渲染器隔离。静态零违规不能替代这些验证。
