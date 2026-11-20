<!-- 封面源文件与导出方式：docs/assets/README.md -->

![Naive UI Components — Robot 生态的 Vue 3 业务组件库](./docs/assets/naive-ui-components-banner.png)

<div align="center">
  <p><strong>面向 Vue 3 后台工作台的组件库</strong></p>
  <p>Naive UI · TypeScript · 78 个组件</p>
  <p>
    <a href="https://www.npmjs.com/package/@robot-admin/naive-ui-components"><img src="https://img.shields.io/npm/v/@robot-admin/naive-ui-components?style=flat-square&amp;color=249D70&amp;labelColor=183C2E" alt="npm version"></a>
    <a href="./package.json"><img src="https://img.shields.io/badge/Vue-3.5+-249D70?style=flat-square&amp;logo=vue.js&amp;logoColor=white&amp;labelColor=183C2E" alt="Vue 3.5+"></a>
    <a href="./docs/engineering.md#typescript-构建与消费"><img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white&amp;labelColor=183C2E" alt="Build: TypeScript 5.9.3"></a>
    <a href="https://github.com/ChenyCHENYU/naive-ui-components/actions/workflows/ci.yml"><img src="https://github.com/ChenyCHENYU/naive-ui-components/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-64748B?style=flat-square&amp;labelColor=183C2E" alt="MIT License"></a>
  </p>
  <p>
    <a href="#快速开始">快速开始</a> ·
    <a href="#能力地图">能力地图</a> ·
    <a href="#场景接入">场景接入</a> ·
    <a href="./docs/components.md">组件目录</a> ·
    <a href="https://www.tzagileteam.com/robot/components/preface">在线文档</a> ·
    <a href="https://robotadmin.cn">在线体验</a> ·
    <a href="./README_EN.md">English</a>
  </p>
</div>

## 项目定位

**Naive UI Components** 是从 [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin) 提炼的 Vue 3 组件库，以 `@robot-admin/naive-ui-components` 独立发布。表单、表格、实体选择和工作台可以通过类型化的配置接入。业务接口、权限和任务执行由宿主应用负责。

当前仓库版本 **0.41.0**，各版本的变化见[变更记录](./CHANGELOG.md)。

## 快速开始

### 安装

在 Vue 3 项目中使用现有包管理器安装。以下命令包含必需的 peer 依赖。

```bash
bun add @robot-admin/naive-ui-components vue@^3.5.3 naive-ui@^2.35.0
```

使用包根入口、`C_Breadcrumb` 或 `C_TagsView` 时安装 `vue-router@^4.6.4` 或 `^5.3.1`。启用 `C_Table` 行列拖拽时安装 `sortablejs@^1.15.7`。浏览器打包、声明及 SSR 的验证版本见[消费环境矩阵](./docs/engineering.md#消费环境矩阵)。

### 配置一个表单

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Form,
    defineFormOptions,
  } from '@robot-admin/naive-ui-components/C_Form'
  import '@robot-admin/naive-ui-components/C_Form/style.css'

  const draft = ref({ name: '' })
  const fields = defineFormOptions<typeof draft.value>([
    { type: 'input', prop: 'name', label: '姓名', required: true },
  ])
</script>

<template>
  <C_Form
    v-model="draft"
    :options="fields"
  />
</template>
```

保存请求可以直接交给 `config.onSubmit`。需要在模板外读写表单或主动验证时，使用 `useCForm()`。完整示例见[表单与表格](./docs/guides/usage.md#c_form--c_table-推荐用法)。

### 直接使用公开 Props

普通组件直接传属性，例如 `<C_Progress :percentage="62.5" />`。把属性抽成对象时，可从组件子路径导入 `ProgressProps` 等公开类型，用 `satisfies` 检查配置。需要在插槽中保留业务字段时，参考[瀑布流的类型推导](./docs/guides/waterfall.md)。

## 能力地图

| 场景         | 代表组件                                                                       | 覆盖能力                                           |
| ------------ | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| 表单与表格   | `C_Form` · `C_FormModal` · `C_FormSearch` · `C_Table`                          | 配置化字段、校验、行列编辑、分页、选择与导出       |
| 搜索与选择   | `C_Select` · `C_AutoComplete` · `C_DataPicker` · `C_UserPicker` · `C_Tree`     | 远程选项、文本建议、表格选择、组织选人与树路径定位 |
| 审批与任务   | `C_WorkFlow` · `C_ApprovalViewer` · `C_NotificationInbox` · `C_TaskPanel`      | 流程定义、审批历史、待办列表与后台任务进度         |
| 数据作业     | `C_ImportWizard` · `C_BatchResult` · `C_ChangeReview` · `C_FilterBuilder`      | 导入预检、分项结果、字段差异与组合筛选             |
| 工作区与计划 | `C_Tabs` · `C_SplitPane` · `C_OrgChart` · `C_ResourceSchedule` · `C_TaskBoard` | 多面板布局、组织关系、资源排班和受控任务移动       |
| 内容与媒体   | `C_Editor` · `C_Markdown` · `C_Attachments` · `C_FilePreview` · `C_WaterFall`  | 内容编辑、附件与文档预览、长列表                   |

其余组件及依赖见[组件目录](./docs/components.md)。可以在 [Robot Admin](https://robotadmin.cn) 查看应用中的组件效果。

## 场景接入

| 需求                     | 可直接使用的入口                                                                                                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 用户按范围导出           | 给 `C_Table` 配置 `export.scopes`，区分本页、已选与全部匹配。远程全量导出接入 `requestData` 或 `onExportMatching`，用最近一次成功查询的条件创建文件或任务。[导出指南](./docs/guides/table-density.md#异步导出的快照与卸载) |
| 多个页签共享筛选         | 从 `/workflows` 导入 `useTabbedQuery`，提供活动页签、初始条件和一个请求函数。各页签保留独立分页，新筛选提交后统一回到第一页。[多页签共享查询](./docs/guides/data-workflows.md#多页签共享查询)                              |
| 选中实体时回填多个字段   | 用 `createDataPickerField({ source, columns, mapFields })` 接入表单。候选实体类型从 `source` 推导，主值和关联字段一次提交，重选同一实体保留手工修改。[实体选择与回填](./docs/guides/data-picker.md#表单内嵌选择)           |
| 编辑或切换记录时保护草稿 | 给 `C_FormModal` 配置 `beforeClose` 处理未保存确认；同一弹窗切换记录可复用 `requestDiscard()` 与 `sessionKey`。[表单弹窗](./docs/guides/usage.md#c_form--c_table-推荐用法)                                                 |
| 查看审批历史             | 为 `C_ApprovalViewer` 提供业务键和数据源，查看历次提交和处理记录。消息入口可传 `instance-id` 直接定位，可选流程图按需加载。[审批查看器](./docs/guides/approval-viewer.md)                                                  |
| 查看后台任务             | 给 `C_TaskPanel` 传任务列表并接入下载、重试事件。运行中的任务区分已知和未知进度，展开时再加载分项结果。[后台任务面板](./docs/guides/task-panel.md)                                                                         |

### 表格偏好按账号隔离

在应用级通过 `TABLE_GLOBAL_CONFIG_KEY` 提供响应式 `persistPrefix`，单表只声明稳定的 `config.persistKey`。完整接入见[表格偏好与作用域](./docs/guides/table-density.md#表格偏好与作用域)。

## 按需加载与样式

| 方式              | 样式入口                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| 组件子路径        | 按组件导入 `C_组件名/style.css`，会加载所需的组合样式与共享变量                           |
| 自动导入 Resolver | 在 Vite 的 `unplugin-vue-components` 中配置 `RobotNaiveUiResolver({ importStyle: true })` |
| 根入口或全量注册  | 按需导入对应样式，或统一导入包根的 `style.css`                                            |

使用内置富文本字段时导入完整样式。普通表单与表格可以选用 `C_Form/base.css` 和 `C_Table/base.css`，自动导入对应的选项为 `importStyle: 'base'`。配置方式见[导入指南](./docs/guides/usage.md#导入方式)。

## 文档导航

| 文档                                                                                                                 | 内容                                        |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [组件目录](./docs/components.md)                                                                                     | 公开组件、依赖和适用范围                    |
| [使用指南](./docs/guides/usage.md) · [场景组合](./docs/guides/scene-components.md)                                   | 组件配置、可复制的业务场景与组合示例        |
| [主题](./docs/guides/theme.md) · [架构](./docs/architecture.md) · [运行时性能](./docs/guides/runtime-performance.md) | 主题变量、实例隔离、大列表和按需加载        |
| [兼容迁移](./docs/guides/api-migration.md) · [变更记录](./CHANGELOG.md)                                              | 迁移指南与各版本的变化                      |
| [维护与发布](./docs/engineering.md) · [安全策略](./SECURITY.md) · [品牌资源](./docs/assets/README.md)                | 构建和发布检查、依赖审计、Logo 与封面源文件 |

## 本地开发

使用 Node.js 20.19+ 和仓库 `packageManager` 固定的 Bun 版本。

```bash
bun install --frozen-lockfile
bun run verify
```

`verify` 包含静态检查、单测、组件测试、打包消费检查与体积门禁。交互演示可先运行 `bun run build`，再运行 `bun run dev:search-workflows`，打开 [本地场景演示](http://127.0.0.1:4188/scenes.html)。浏览器回归在 `verify` 完成后通过 `bun run test:browser` 运行。

## Robot 生态

| 项目                                                                        | 职责                                   |
| --------------------------------------------------------------------------- | -------------------------------------- |
| [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin)                   | PC Web 工程模板与组件场景              |
| [robot-admin-packages](https://github.com/ChenyCHENYU/robot-admin-packages) | 请求、校验、主题、布局、文件和工程工具 |
| [Robot Cloud](https://github.com/ChenyCHENYU/Robot_Cloud)                   | 认证、公司上下文和权限服务             |

## 许可证

[MIT License](./LICENSE) · Made by [CHENY](https://github.com/ChenyCHENYU)
