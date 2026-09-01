<div align="center">

# @robot-admin/naive-ui-components

**Enterprise-grade Vue 3 component library built on Naive UI**

51 production-ready business components extracted from Robot Admin, supporting global registration, on-demand imports (Tree-Shaking), and subpath imports.

[![NPM Version](https://img.shields.io/npm/v/@robot-admin/naive-ui-components)](https://www.npmjs.com/package/@robot-admin/naive-ui-components)
[![License](https://img.shields.io/npm/l/@robot-admin/naive-ui-components)](./LICENSE)

[Live Demo](https://www.tzagileteam.com/robot/components/preface) · [GitHub](https://github.com/ChenyCHENYU/naive-ui-components) · [NPM](https://www.npmjs.com/package/@robot-admin/naive-ui-components)

[中文](./README.md)

</div>

---

## 📦 Installation

```bash
bun add @robot-admin/naive-ui-components
```

Required peer dependencies:

```bash
bun add vue@^3.5.0 naive-ui@^2.35.0
```

### 🚀 Quick Start

#### Global Registration

```typescript
import { createApp } from 'vue'
import NaiveUIComponents from '@robot-admin/naive-ui-components'
import '@robot-admin/naive-ui-components/style.css'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

#### On-demand Import (Tree-Shaking)

```vue
<script setup lang="ts">
  import { C_Icon, C_Table, C_Form } from '@robot-admin/naive-ui-components'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

#### Subpath Import (Recommended, Smallest Bundle)

Each component provides an independent subpath entry that loads only the target component's code and types:

```vue
<script setup lang="ts">
  import { C_Form } from '@robot-admin/naive-ui-components/C_Form'
  import { C_Table } from '@robot-admin/naive-ui-components/C_Table'
  import { C_Icon } from '@robot-admin/naive-ui-components/C_Icon'
  import { createMenuOptions } from '@robot-admin/naive-ui-components/C_Menu'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

> Subpath imports provide full TypeScript support (`.d.ts`) with IDE auto-completion for props / emits / slots. Component-specific utilities such as `createMenuOptions` are exported from the same component subpath, so consumers do not need the root entry for one helper.

#### Standalone Composables

```typescript
import {
  useTableManager,
  useFormState,
  usePlayerCore,
} from '@robot-admin/naive-ui-components'
```

#### Automatic On-demand Imports (Recommended)

The resolver loads component subpaths by default, preventing unused components and heavyweight runtime dependencies from entering the initial bundle:

```typescript
import Components from 'unplugin-vue-components/vite'
import { RobotNaiveUiResolver } from '@robot-admin/naive-ui-components/resolver'

Components({
  resolvers: [RobotNaiveUiResolver({ importStyle: true })],
})
```

`importStyle: true` (an alias of `'full'`) preserves the existing complete style behavior. When C_Form/C_Table only use base fields and no built-in rich-text editor, set `importStyle: 'base'` to avoid editor CSS; other components safely fall back to their standard style entry. Set `importOnDemand: false` only when a legacy project still requires the package root.

The style tiers can also be imported explicitly:

```typescript
import '@robot-admin/naive-ui-components/C_Form/base.css'
import '@robot-admin/naive-ui-components/C_Table/base.css'
// Full mode is also available as C_Form/full.css and C_Table/full.css.
```

### Recommended C_Form / C_Table setup

Declare the business model once and keep nested field paths, values, column keys, callbacks, and exposed methods type-safe:

```ts
import {
  defineFormConfig,
  defineFormOptions,
  useCForm,
} from '@robot-admin/naive-ui-components/C_Form'

interface UserForm {
  name: string
  profile: { email: string }
}

const options = defineFormOptions<UserForm>([
  { type: 'input', prop: 'name', required: true },
  { type: 'input', prop: 'profile.email' },
])
const config = defineFormConfig<UserForm>({
  onSubmit: ({ model }) => save(model),
})
const { model, formRef, bindings } = useCForm({
  initialValues: { name: '', profile: { email: '' } },
  options,
  config,
})
```

For remote tables, `useTableQuery` owns cancellation, latest-request-wins behavior, pagination, and loading. Destructure its `bindings` and use `<C_Table v-bind="bindings" />`:

```ts
import {
  defineTableColumns,
  useTableQuery,
} from '@robot-admin/naive-ui-components/C_Table'

interface UserRow {
  id: string
  name: string
}
const columns = defineTableColumns<UserRow>([{ key: 'name', title: 'Name' }])
const { bindings } = useTableQuery<UserRow, { keyword: string }>({
  initialQuery: { keyword: '' },
  columns,
  rowKey: 'id',
  request: ({ page, pageSize, query, signal }) =>
    fetchUsers({ page, pageSize, ...query }, signal),
})
```

`C_Date`, `C_Time`, `C_Menu`, and `C_FormSearch` support standard `v-model`. Message/dialog providers are optional; application-wide feedback, locale, form defaults, and `table.defaults` can be supplied through plugin options.

### C_Captcha Server Verification

The default local mode only proves that the browser-side puzzle interaction completed. It is not a security credential for login, payment, or other sensitive actions. In production, provide a `verifier` and enable `require-server-verification`. Timeout, cancellation, and stale attempts are handled by the component, and `success` is emitted only after approval by an independent server/provider challenge. Request `token` and `timestamp` values are client-generated telemetry and must never be trusted as proof by the server.

```vue
<C_Captcha
  require-server-verification
  :verification-timeout="8000"
  :verifier="
    async ({ signal }) => {
      // This proof must come from a trusted server/provider challenge.
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

With `require-server-verification`, a successful response must include a server token. Server tokens should be short-lived, single-use, and bound to the current session or operation. `C_Login` forwards the same policy through `captchaVerifier`, `requireCaptchaServerVerification`, and `captchaVerificationTimeout`, and its `submit` payload identifies the result through `captchaVerifiedBy`. See [SECURITY.md](./SECURITY.md) for trust-boundary details.

### 📋 Component List (51 Components)

> 💡 All components provide **interactive live demos**. Visit the [Component Docs](https://www.tzagileteam.com/robot/components/preface) to try them out in real-time (rendered via iframe from Robot Admin production).

#### Basic Components

| Component        | Description              | External Deps               |
| ---------------- | ------------------------ | --------------------------- |
| `C_Icon`         | Iconify icon wrapper     | `@iconify/vue`              |
| `C_Code`         | Code highlighting        | `highlight.js`              |
| `C_Barcode`      | Barcode generator        | `@chenfengyuan/vue-barcode` |
| `C_Captcha`      | Puzzle captcha           | `vue3-puzzle-vcode`         |
| `C_Cascade`      | Cascade panel selector   | -                           |
| `C_Guide`        | User guide / tour        | `driver.js`                 |
| `C_Progress`     | Enhanced progress bar    | -                           |
| `C_Steps`        | Step bar                 | -                           |
| `C_ActionBar`    | Action button bar        | -                           |
| `C_Theme`        | Theme switcher           | -                           |
| `C_Language`     | Language switcher        | -                           |
| `C_Date`         | Enhanced date picker     | -                           |
| `C_City`         | Province / city selector | -                           |
| `C_Breadcrumb`   | Breadcrumb navigation    | -                           |
| `C_Menu`         | Navigation menu          | -                           |
| `C_TagsView`     | Tab-based navigation     | -                           |
| `C_GlobalSearch` | Global search panel      | -                           |
| `C_AvatarGroup`  | Avatar group display     | -                           |
| `C_OrgChart`     | Organization chart       | -                           |
| `C_Skeleton`     | Skeleton placeholder     | -                           |

#### Content & Editor Components

| Component         | Description                  | External Deps             |
| ----------------- | ---------------------------- | ------------------------- |
| `C_Editor`        | Rich text editor             | `@wangeditor-next/editor` |
| `C_Markdown`      | Markdown editor/preview      | `md-editor-v3`            |
| `C_FormulaEditor` | Formula editor (safe parser) | Built in                  |
| `C_Signature`     | Electronic signature         | -                         |
| `C_QRCode`        | QR code generator            | `qrcode`                  |
| `C_ImageCropper`  | Image cropper                | `vue-cropper`             |

#### Data Display Components

| Component        | Description                                  | External Deps              |
| ---------------- | -------------------------------------------- | -------------------------- |
| `C_Table`        | Advanced data table (CRUD/inline edit/print) | `print-js`, `html2canvas`  |
| `C_Map`          | Map component (OSM/AMap)                     | `leaflet`                  |
| `C_VtableGantt`  | Gantt chart                                  | `@visactor/vtable-gantt`   |
| `C_AntV`         | Graph editor (ER/BPMN/UML)                   | `@antv/x6`, `html2canvas`  |
| `C_WaterFall`    | Waterfall layout                             | -                          |
| `C_FullCalendar` | Calendar events                              | `@fullcalendar/*`          |
| `C_VideoPlayer`  | Video player (HLS/subtitles/bookmarks)       | `xgplayer`, `xgplayer-hls` |
| `C_AudioPlayer`  | Audio player (waveform/progress/playlist)    | -                          |
| `C_FilePreview`  | File preview (PDF/Word/Excel)                | `xlsx`, `mammoth`          |
| `C_Timeline`     | Timeline (vertical/horizontal/collapsible)   | -                          |

#### Form & Layout Components

| Component         | Description                                       | External Deps        |
| ----------------- | ------------------------------------------------- | -------------------- |
| `C_Form`          | Dynamic form engine (Grid/Tabs/Steps/Card layout) | -                    |
| `C_FormSearch`    | Search form                                       | -                    |
| `C_CollapsePanel` | Collapse panel                                    | -                    |
| `C_SplitPane`     | Split pane                                        | -                    |
| `C_Draggable`     | Drag & drop sorting                               | `vue-draggable-plus` |
| `C_Tree`          | Advanced tree control                             | -                    |
| `C_Time`          | Enhanced time picker                              | -                    |
| `C_Cron`          | Cron expression editor                            | -                    |
| `C_Transfer`      | Transfer / shuttle box                            | -                    |

#### Interactive & Business Components

| Component       | Description                                   | External Deps |
| --------------- | --------------------------------------------- | ------------- |
| `C_Chat`        | Chat (contacts / message bubbles / input box) | -             |
| `C_ContextMenu` | Context menu (nested / shortcuts / danger)    | -             |
| `C_Login`       | Login panel (5 modes / captcha / remember me) | -             |

#### Workflow & Notification Components

| Component              | Description                              | External Deps    |
| ---------------------- | ---------------------------------------- | ---------------- |
| `C_WorkFlow`           | Workflow editor (approval/CC/conditions) | `@vue-flow/core` |
| `C_NotificationCenter` | Notification center (WebSocket/polling)  | -                |
| `C_Upload`             | Large file upload (chunked/resumable)    | `spark-md5`      |

### 🔌 Dependency Notes

Runtime component dependencies are declared by this package and resolved automatically. Every consumer needs:

```bash
bun add vue naive-ui
```

Install optional peers per feature: `vue-router` for `C_Breadcrumb`/`C_TagsView`, and `sortablejs` for C_Table row/column dragging. Subpath imports do not require unrelated optional peers. The formula editor uses a bounded built-in parser and does not execute dynamic JavaScript.

### 🏗️ Build Architecture

#### Six-stage Build Pipeline

```
bun run build
  ├── 1. tsdown          → Multi-entry bundling (51 components ESM/CJS/DTS)
  ├── 2. sass CLI        → Compile global.scss → global-scss.css
  ├── 3. merge-css.js    → Merge SFC CSS + global SCSS → style.css
  ├── 4. gen-exports.js  → Auto-generate package.json exports map
  ├── 5. check:dist      → Validate root, subpath, SSR, and DTS public exports
  └── 6. check:size      → Enforce full/base CSS and package-size budgets
```

#### Key Technical Details

- **Build engine**: [tsdown](https://github.com/rolldown/tsdown) (Rolldown-based), 51 independent entries compiled in parallel
- **SCSS processing**: Custom `scssTransformPlugin` compiles SFC SCSS within the Rolldown pipeline; standalone Sass CLI for global styles
- **CSS merging**: Post-build merges per-chunk CSS with `global-scss.css` into a single `style.css`
- **Type exports**: Unified `export *` barrel pattern with auto-generated `.d.ts`
- **Subpath exports**: `gen-exports.js` auto-scans `dist/` and writes the `exports` field in `package.json`
- **Export conflict detection**: `check-export-conflicts.js` ensures no naming collisions between components
- **Artifact entry validation**: `check-dist-entries.js` prevents internal chunks from replacing root declarations and verifies component utility subpath types
- **Package contract validation**: blocks Naive UI internal type paths, hidden optional installs, and plugin console side effects
- **Size budgets**: `check-size-budget.js` prevents accidental growth of global, C_Form/C_Table, and total dist output

#### Build Output

```
dist/
├── index.js / index.cjs / index.d.ts     # Main entry
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # Subpath entries (51 components)
├── C_Form.base.css / C_Form.full.css      # Base/full style tiers
├── C_Table.base.css / C_Table.full.css    # Base/full style tiers
├── style.css                              # Merged full styles
└── [chunk].js                             # Shared code chunks
```

### 🔧 Development

The environment baseline is Node.js 20.19.0+ and Bun 1.3.14. `.node-version`, `packageManager`, `engines`, and the frozen lockfile keep local and CI installs aligned.

```bash
bun install --frozen-lockfile # Install exactly from the lockfile
bun run dev              # Dev mode (SCSS watch + tsdown watch)
bun run build            # Full build
bun run build:scss       # Compile global SCSS only
bun run build:css        # Merge fresh tsdown CSS chunks; safely skips a finalized dist
bun run build:exports    # Generate exports map only
bun run check:exports    # Check export naming conflicts
bun run check:dist       # Validate built JS / DTS public entries
bun run check:package    # Validate dependencies, exports, and public source boundaries
bun run check:quality    # Prevent any, console, and type-suppression debt regressions
bun run check:audit      # Audit direct and transitive dependency vulnerabilities
bun run check:size       # Enforce publish artifact size budgets
bun run type-check       # TypeScript type checking
bun run test             # Run Bun unit tests
bun run lint:check       # Required Oxlint correctness checks
bun run lint:eslint      # Audit the existing ESLint rule backlog
bun run verify           # Type, test, export, and build verification
```

#### Project Structure

```
naive-ui-components/
├── src/
│   ├── index.ts                     # Library entry (global registration + export * barrel)
│   ├── styles/
│   │   ├── variables.scss           # CSS variables (--c-*)
│   │   └── global.scss              # Auto-generated global style aggregation (@forward barrel)
│   ├── components/
│   │   └── C_[Name]/
│   │       ├── index.vue            # Main component file
│   │       ├── index.ts             # Barrel export
│   │       ├── index.scss           # Component styles
│   │       ├── types.ts             # Type definitions
│   │       ├── constants.ts         # Constants
│   │       ├── data.ts              # Static data
│   │       ├── composables/         # Composable functions
│   │       ├── components/          # Sub-components
│   │       └── layouts/             # Layout variants (C_Form/C_AntV)
│   ├── plugins/                     # highlight.js and other plugins
│   └── utils/                       # Utility functions
├── scripts/
│   ├── gen-global-scss.js           # Generate global.scss (@forward barrel)
│   ├── watch-global-scss.js         # Dev mode SCSS watcher
│   ├── merge-css.js                 # Merge CSS artifacts
│   ├── gen-exports.js               # Auto-generate package.json exports
│   └── check-export-conflicts.js    # Export naming conflict detection
├── types/
│   └── env.d.ts                     # .vue / .scss module declarations
├── tsdown.config.ts                 # Build config (multi-entry + SCSS plugin + Vue plugin)
└── tsconfig.json
```

#### Adding a New Component

1. Create `src/components/C_NewComponent/` directory
2. Write `index.vue`, `index.ts` (barrel), `types.ts`
3. Add `export * from './components/C_NewComponent'` in `src/index.ts`
4. Run `bun run build` — build scripts will auto-generate subpath entries and exports mapping

#### Publishing

```bash
bun run changeset       # Record changes and release level
bun run version         # Update package version and CHANGELOG
bun run verify          # Run all pre-publish checks
bun run release         # Publish pending Changesets releases
```

## 📄 License

MIT License

---

## 🔗 Links

- [Component Docs with Interactive Demos](https://www.tzagileteam.com/robot/components/preface)
- [Robot Admin Main Project](https://github.com/ChenyCHENYU/robot_admin)
- [Robot Admin Live Demo](https://www.robotadmin.cn)
- [GitHub](https://github.com/ChenyCHENYU/naive-ui-components)
- [NPM](https://www.npmjs.com/package/@robot-admin/naive-ui-components)
