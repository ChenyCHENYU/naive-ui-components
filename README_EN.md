<!-- Banner source and export instructions: docs/assets/README.md -->

![Naive UI Components — Vue 3 business components in the Robot ecosystem](./docs/assets/naive-ui-components-banner.png)

<div align="center">
  <p><strong>A Vue 3 component library for administration interfaces</strong></p>
  <p>Naive UI · TypeScript · 78 components</p>
  <p>
    <a href="https://www.npmjs.com/package/@robot-admin/naive-ui-components"><img src="https://img.shields.io/npm/v/@robot-admin/naive-ui-components?style=flat-square&amp;color=249D70&amp;labelColor=183C2E" alt="npm version"></a>
    <a href="./package.json"><img src="https://img.shields.io/badge/Vue-3.5+-249D70?style=flat-square&amp;logo=vue.js&amp;logoColor=white&amp;labelColor=183C2E" alt="Vue 3.5+"></a>
    <a href="./docs/engineering.en.md#typescript-build-and-consumption"><img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white&amp;labelColor=183C2E" alt="Build: TypeScript 5.9.3"></a>
    <a href="https://github.com/ChenyCHENYU/naive-ui-components/actions/workflows/ci.yml"><img src="https://github.com/ChenyCHENYU/naive-ui-components/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-64748B?style=flat-square&amp;labelColor=183C2E" alt="MIT License"></a>
  </p>
  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="#capability-map">Capabilities</a> ·
    <a href="#integration-recipes">Integration recipes</a> ·
    <a href="./docs/components.en.md">Component catalog</a> ·
    <a href="https://www.tzagileteam.com/robot/components/preface">Online docs</a> ·
    <a href="https://robotadmin.cn">Live demo</a> ·
    <a href="./README.md">简体中文</a>
  </p>
</div>

## Overview

**Naive UI Components** is a Vue 3 library extracted from [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin) and published independently as `@robot-admin/naive-ui-components`. It provides typed configuration for forms, tables, entity pickers, and workspaces. The host application owns endpoints, permissions, and task execution.

The current repository version is **0.41.1**. See the [changelog](./CHANGELOG.md) for release details.

## Quick start

### Install

Install the library alongside its required peers in your Vue 3 project. Use your project's package manager.

```bash
bun add @robot-admin/naive-ui-components vue@^3.5.3 naive-ui@^2.35.0
```

The package root, `C_Breadcrumb`, and `C_TagsView` require `vue-router@^4.6.4` or `^5.3.1`. Table row and column dragging require `sortablejs@^1.15.7`. See the [consumer environment matrix](./docs/engineering.en.md#consumer-environment-matrix) for verified browser, declaration, and SSR combinations.

### Configure a form

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
    { type: 'input', prop: 'name', label: 'Name', required: true },
  ])
</script>

<template>
  <C_Form
    v-model="draft"
    :options="fields"
  />
</template>
```

Pass a save handler to `config.onSubmit`. Use `useCForm()` when code outside the template needs to read, update, or validate the form. See [forms and tables](./docs/guides/usage.en.md#recommended-c_form--c_table-setup) for full examples.

### Use public props directly

Pass simple props directly, as in `<C_Progress :percentage="62.5" />`. When you extract props into a configuration object, import its public type, such as `ProgressProps`, from the component subpath and check it with `satisfies`. See the [waterfall guide](./docs/guides/waterfall.md) for business fields inferred in slots.

## Capability map

| Area                    | Representative components                                                      | Capabilities                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Forms and tables        | `C_Form` · `C_FormModal` · `C_FormSearch` · `C_Table`                          | Configurable fields, validation, inline editing, pagination, selection and export            |
| Search and selection    | `C_Select` · `C_AutoComplete` · `C_DataPicker` · `C_UserPicker` · `C_Tree`     | Remote options, suggestions, table pickers, organization-based selection and tree navigation |
| Approvals and tasks     | `C_WorkFlow` · `C_ApprovalViewer` · `C_NotificationInbox` · `C_TaskPanel`      | Workflow definitions, approval history, inbox lists and background task progress             |
| Data operations         | `C_ImportWizard` · `C_BatchResult` · `C_ChangeReview` · `C_FilterBuilder`      | Import preflight, itemized results, field diffs and combined filters                         |
| Workspaces and planning | `C_Tabs` · `C_SplitPane` · `C_OrgChart` · `C_ResourceSchedule` · `C_TaskBoard` | Pane layouts, organization charts, resource schedules and controlled task moves              |
| Content and media       | `C_Editor` · `C_Markdown` · `C_Attachments` · `C_FilePreview` · `C_WaterFall`  | Content editing, attachments, document preview and long lists                                |

See the [component catalog](./docs/components.en.md) for the remaining components and dependencies. Explore how the components are used in [Robot Admin](https://robotadmin.cn).

## Integration recipes

| Goal                               | Public entry                                                                                                                                                                                                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export a chosen range              | Set `C_Table`'s `export.scopes` for current page, selected rows, or all matching results. Use `requestData` or `onExportMatching` for remote export and pass the last successful query to the host. [Export guide](./docs/guides/table-density.md#异步导出的快照与卸载)                   |
| Share a query across tabs          | Import `useTabbedQuery` from `/workflows` and provide the active tab, initial criteria, and a request callback. Each tab keeps its pagination, and a newly submitted query resets all pages. [Tabbed queries](./docs/guides/data-workflows.md#多页签共享查询)                             |
| Fill fields from a selected record | Use `createDataPickerField({ source, columns, mapFields })`. The source determines the row type. The selected value and related fields commit together. Selecting the same entity preserves manual edits. [Entity selection and field mapping](./docs/guides/data-picker.md#表单内嵌选择) |
| Protect an unsaved draft           | Configure `beforeClose` on `C_FormModal`. Use `requestDiscard()` and `sessionKey` to apply the same guard when switching records in an open dialog. [Form dialogs](./docs/guides/usage.en.md#recommended-c_form--c_table-setup)                                                           |
| Review approval history            | Pass a business key and data source to `C_ApprovalViewer`. It displays submissions and handling records. An inbox can pass `instance-id` to open a specific instance. The optional diagram loads on demand. [Approval viewer](./docs/guides/approval-viewer.md)                           |
| Track background jobs              | Pass tasks to `C_TaskPanel` and handle download and retry events. Running tasks distinguish known progress from unknown progress, and itemized results load when opened. [Task panel](./docs/guides/task-panel.md)                                                                        |

### Scope table preferences per account

Provide a reactive `persistPrefix` via `TABLE_GLOBAL_CONFIG_KEY`, then give each table a stable `config.persistKey`. See [table preference scoping](./docs/guides/table-density.md#表格偏好与作用域) for the full setup.

## Imports and styles

| Strategy                            | Styles                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| Component subpaths                  | Import `C_Component/style.css` for the component, composed styles, and shared tokens                |
| Resolver                            | Set `RobotNaiveUiResolver({ importStyle: true })` in Vite's `unplugin-vue-components` configuration |
| Package root or global registration | Import the individual styles you need or the package root's `style.css`                             |

Use full styles for built-in rich-text fields. Ordinary forms and tables can use `C_Form/base.css` and `C_Table/base.css`, or `importStyle: 'base'` with the resolver. See [import strategies](./docs/guides/usage.en.md#import-strategies) for configuration examples.

## Documentation

| Document                                                                                                                                  | Coverage                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Component catalog](./docs/components.en.md)                                                                                              | Public components, dependencies, and usage boundaries                  |
| [Usage guide](./docs/guides/usage.en.md) · [Business scenes](./docs/guides/scene-components.md)                                           | Component configuration and composition examples                       |
| [Theme](./docs/guides/theme.md) · [Architecture](./docs/architecture.en.md) · [Runtime performance](./docs/guides/runtime-performance.md) | Theme tokens, instance isolation, long lists, and deferred loading     |
| [API migration](./docs/guides/api-migration.md) · [Changelog](./CHANGELOG.md)                                                             | Adoption notes and release history                                     |
| [Maintenance and releases](./docs/engineering.en.md) · [Security](./SECURITY.md) · [Brand assets](./docs/assets/README.md)                | Build and release checks, dependency auditing, logo and banner sources |

## Local development

Use Node.js 20.19+ and the Bun version pinned in the repository's `packageManager` field.

```bash
bun install --frozen-lockfile
bun run verify
```

`verify` runs static checks, unit and component tests, packaged-consumer checks, and bundle budget checks. For interactive demos, run `bun run build` followed by `bun run dev:search-workflows` and open the [local scene gallery](http://127.0.0.1:4188/scenes.html). Run `bun run test:browser` after `verify` to check browser interactions.

## Robot ecosystem

| Project                                                                     | Role                                                                |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin)                   | PC web starter and component scenarios                              |
| [robot-admin-packages](https://github.com/ChenyCHENYU/robot-admin-packages) | Requests, validation, themes, layouts, files, and engineering tools |
| [Robot Cloud](https://github.com/ChenyCHENYU/Robot_Cloud)                   | Authentication, company context, and authorization services         |

## License

[MIT License](./LICENSE) · Made by [CHENY](https://github.com/ChenyCHENYU)
