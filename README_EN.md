<!-- Banner source and export instructions: docs/assets/README.md -->

![Naive UI Components — Vue 3 business components in the Robot ecosystem](./docs/assets/naive-ui-components-banner.png)

<div align="center">
  <p><strong>Turn recurring business interactions into composable components.</strong></p>
  <p>Vue 3 · Naive UI · TypeScript · 60 business components</p>
  <p>
    <a href="https://www.npmjs.com/package/@robot-admin/naive-ui-components"><img src="https://img.shields.io/npm/v/@robot-admin/naive-ui-components?style=flat-square&amp;color=249D70&amp;labelColor=183C2E" alt="npm version"></a>
    <a href="./package.json"><img src="https://img.shields.io/badge/Vue-3.5+-249D70?style=flat-square&amp;logo=vue.js&amp;logoColor=white&amp;labelColor=183C2E" alt="Vue 3.5+"></a>
    <a href="./package.json"><img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&amp;logo=typescript&amp;logoColor=white&amp;labelColor=183C2E" alt="TypeScript 5.9"></a>
    <a href="https://github.com/ChenyCHENYU/naive-ui-components/actions/workflows/ci.yml"><img src="https://github.com/ChenyCHENYU/naive-ui-components/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-64748B?style=flat-square&amp;labelColor=183C2E" alt="MIT License"></a>
  </p>
  <p>
    <a href="#quick-start">Quick start</a> ·
    <a href="#capability-map">Capabilities</a> ·
    <a href="./docs/components.en.md">Component catalog</a> ·
    <a href="https://www.tzagileteam.com/robot/components/preface">Online docs</a> ·
    <a href="https://robotadmin.cn">Live demo</a> ·
    <a href="./README.md">简体中文</a>
  </p>
</div>

## Overview

**Naive UI Components** is a Vue 3 business component library extracted from [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin), published independently as `@robot-admin/naive-ui-components`. Built on Naive UI, it provides `C_*` components and composables for forms, tables, editors, workflows, files and media. It can also be used in other Vue 3 applications.

| Design focus            | Available today                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Configuration           | Typed configuration for fields, columns, actions and dialogs; 8 form layouts                                                                                 |
| Connected types         | Field paths, columns, events and instance methods, with helpers such as `defineFormOptions`, `useCForm` and `useTableQuery`                                  |
| Selective loading       | 60 component entries, an auto-import resolver, component CSS and base styles for forms and tables                                                            |
| Application integration | Global registration or local imports; injectable feedback, locale and defaults; form dialogs compatible with structurally matching headless CRUD controllers |

The library handles UI and interaction. Applications supply business APIs, authentication, authorization, upload services and platform configuration. The current repository version is **0.23.0**; see the [changelog](./CHANGELOG.md) for release details.

Forms and search share `config.density: 'compact'`, reducing field spacing and empty validation space while allowing errors to expand naturally. Form modals default to compact density with 22px footer buttons, and search can inherit application density. Compact numeric fields hide step buttons by default while retaining keyboard interaction, precision and limits; individual fields can enable buttons. See [form density](./docs/guides/form-density.en.md) for on-demand defaults and explicit overrides.

Business workspaces can share dictionary providers, container-aware search, regional density, remote pickers, error navigation and batch results. Pure value utilities live at `/data`; opt-in composables live at `/workflows`. See the [data and workspace guide](./docs/guides/data-workflows.md), [search workflows](./docs/guides/search-workflows.md), [data picker](./docs/guides/data-picker.md) and [batch results](./docs/guides/batch-results.md).

## Capability map

| Scenario              | Representative components                                        | Capabilities                                                                         |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Data entry            | `C_Form` · `C_FormModal` · `C_FormSearch`                        | Dynamic fields, validation, async submission, search and create/edit dialogs         |
| Data operations       | `C_Table` · `C_ActionBar` · `C_Tree` · `C_Transfer`              | Pagination, trees, row/cell editing, cross-page selection, exports and batch actions |
| Editing               | `C_Editor` · `C_Markdown` · `C_Cron` · `C_FormulaEditor`         | Rich text, Markdown, Cron previews and local formula evaluation                      |
| Workflow and planning | `C_AntV` · `C_WorkFlow` · `C_VtableGantt` · `C_FullCalendar`     | ER/BPMN/UML, approval flows, Gantt charts and calendars                              |
| Files and media       | `C_Upload` · `C_FilePreview` · `C_VideoPlayer` · `C_AudioPlayer` | Chunked uploads, PDF/Word/Excel previews and audio/video playback                    |
| Images and maps       | `C_Signature` · `C_ImageCropper` · `C_QRCode` · `C_Map`          | Signatures, cropping, QR codes, OpenStreetMap and AMap                               |
| Workspace             | `C_Menu` · `C_Tabs` · `C_TagsView` · `C_GlobalSearch`            | Menus, view switching, tab navigation and global search                              |
| Common interactions   | `C_Login` · `C_Captcha` · `C_Guide` · `C_PageLoading`            | Login UI, human verification, onboarding and navigation feedback                     |

Browse [all 60 components and dependencies](./docs/components.en.md), or explore scenarios in [Robot Admin](https://robotadmin.cn). Cron previews calculate times only; formulas run locally. Production human verification requires server validation. See the [usage guide](./docs/guides/usage.en.md).

## Quick start

### Install

Add the library and required peer dependencies to an existing Vue 3 application:

```bash
bun add @robot-admin/naive-ui-components
bun add vue@^3.5.3 naive-ui@^2.35.0
```

You can also use your project's npm or pnpm setup. Install optional peers only for the features that need them:

| Feature                                      | Additional dependency          |
| -------------------------------------------- | ------------------------------ |
| Root imports / `C_Breadcrumb` / `C_TagsView` | `vue-router@^4.6.4` / `^5.3.1` |
| `C_Table` row/column dragging                | `sortablejs@^1.15.7`           |

### Build a form from configuration

Place this example in `App.vue`. It uses a component subpath and its CSS entry, with no global registration required:

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import {
    C_Form,
    defineFormOptions,
    useCForm,
  } from '@robot-admin/naive-ui-components/C_Form'
  import '@robot-admin/naive-ui-components/C_Form/style.css'

  interface Contact {
    name: string
    email: string
  }

  const result = ref('')
  const { formRef, bindings } = useCForm<Contact>({
    initialValues: { name: '', email: '' },
    options: defineFormOptions<Contact>([
      { type: 'input', prop: 'name', label: 'Name', required: true },
      { type: 'input', prop: 'email', label: 'Email' },
    ]),
    config: {
      labelPlacement: 'top',
      onSubmit: ({ model }) => {
        result.value = `Validated: ${model.name}`
      },
    },
  })
</script>

<template>
  <C_Form
    ref="formRef"
    v-bind="bindings"
  />
  <p v-if="result">{{ result }}</p>
</template>
```

The form includes submission, reset and validation. For persistence, await your async request inside `config.onSubmit`; use `@submit` for completion notifications. See the [usage guide](./docs/guides/usage.en.md) for layouts, validation rules, dialogs and remote tables.

## Imports and styles

### Choose an import strategy

| Strategy             | Use case                                   | Styles                                      |
| -------------------- | ------------------------------------------ | ------------------------------------------- |
| Component subpaths   | Explicit control over each component entry | Import `C_Component/style.css`              |
| Auto-import resolver | Use components directly in templates       | Set `importStyle: true` explicitly          |
| Named root imports   | Existing Tree-Shaking setups               | Import the required CSS or full `style.css` |
| Global `app.use()`   | Register the entire library                | Import full `style.css`                     |

### Automatic imports

Install `unplugin-vue-components`, then add the resolver to your Vite configuration:

```bash
bun add -d unplugin-vue-components
```

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { RobotNaiveUiResolver } from '@robot-admin/naive-ui-components/resolver'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [RobotNaiveUiResolver({ importStyle: true })],
    }),
  ],
})
```

The resolver uses component subpaths by default. `importStyle` defaults to `false`, so enable automatic CSS explicitly. Both `true` and `'full'` load full component styles. `'base'` excludes built-in rich-text editor styles for `C_Form` / `C_Table`; other components retain full styles. Choose base styles only when not using built-in rich-text fields.

Each component CSS entry includes styles for its composed components. Manual imports can use `C_Form/base.css` and `C_Table/base.css`; full styles also have `full.css` aliases. Load heavy editors, flows, maps and media with their business routes. See [import strategies](./docs/guides/usage.en.md#import-strategies) for details and global registration examples.

Minimal consumer builds reduced initial JS gzip by 36.1% for the base form and 34.6% for the display table, including Vue and Naive UI. See the [measurement and automated budgets](./docs/performance-0.15.0.md) (Chinese) for scope and limitations.

Root imports aggregate navigation components and require `vue-router` at runtime. Applications without it should use component subpaths; their unrelated optional peers are not required.

## Documentation

| Document                                                       | Contents                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Architecture and isolation](./docs/architecture.en.md)        | Dependency boundaries, instance ownership and the independent Element Plus roadmap        |
| [Component catalog](./docs/components.en.md)                   | All 60 components, dependencies and behavior boundaries                                   |
| [Usage guide](./docs/guides/usage.en.md)                       | Imports, forms/tables, Cron/formulas, maps, onboarding, captcha, login and page loading   |
| [Density and workbenches](./docs/guides/table-density.md)      | Shared form/search/table density, edit modes, split panes and tree capabilities (Chinese) |
| [Lists and async tasks](./docs/guides/runtime-performance.md)  | Automatic list windows, chat scrolling, search indexes and media task ownership (Chinese) |
| [Waterfall lists](./docs/guides/waterfall.md)                  | Automatic windows, nested scrolling, measured cards and keyboard navigation (Chinese)     |
| [Compatible API migration](./docs/guides/api-migration.md)     | Standard models, application renderers and read-only migration checks (Chinese)           |
| [Production coverage review](./docs/wl-ui-produce-coverage.md) | wl-ui-produce capability mapping and adapter boundaries (Chinese)                         |
| [Development and build](./docs/engineering.en.md)              | Source structure, six-stage build, adding components, checks and releases                 |
| [Brand assets](./docs/assets/README.md)                        | Robot family logo, editable SVG sources and high-resolution PNGs                          |
| [Changelog](./CHANGELOG.md)                                    | Releases and compatibility changes                                                        |
| [Security policy](./SECURITY.md)                               | Vulnerability reporting and maintenance policy                                            |

The [2026-10-18 scan record](./docs/security-scan-2026-10-18.md) documents two outstanding upstream advisories; the [2026-10-06 record](./docs/security-scan-2026-10-06.md) is a historical archive. Both are in Chinese. Run `bun run check:audit` to assess the current dependency state.

## Local development

Maintaining this repository requires **Node.js ≥20.19.0** and **Bun ≥1.3.14**. The package manager is pinned to `bun@1.3.14`; CI uses `.node-version` and the frozen lockfile.

```bash
git clone https://github.com/ChenyCHENYU/naive-ui-components.git
cd naive-ui-components
bun install --frozen-lockfile
bun run dev
```

`dev` watches library builds and shared SCSS. Interactive demonstrations are provided by Robot Admin, which consumes the library.

```bash
bun run verify       # Lint, types, logic/component tests, exports, build and consumer types
bun run check:audit  # Separate dependency audit; CI runs this before verify
```

See [development and build](./docs/engineering.en.md) for individual checks and publishing. The CI workflow is defined in [ci.yml](./.github/workflows/ci.yml).

## Robot ecosystem

| Project                                                                     | Responsibility                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Naive UI Components**                                                     | Independently consumable Vue 3 business components and composables                |
| [Robot Admin](https://github.com/ChenyCHENYU/Robot_Admin)                   | PC Web application template, business pages and interactive demos                 |
| [robot-admin-packages](https://github.com/ChenyCHENYU/robot-admin-packages) | Requests, validation, themes, layouts, directives, file utilities and Git tooling |
| [Robot Cloud](https://github.com/ChenyCHENYU/Robot_Cloud)                   | Authentication, company context, system management and authorization services     |

## License

[MIT License](./LICENSE) · Made by [CHENY](https://github.com/ChenyCHENYU)
