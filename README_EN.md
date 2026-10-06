<div align="center">

# @robot-admin/naive-ui-components

**Enterprise-grade Vue 3 component library built on Naive UI**

54 production-ready business components extracted from Robot Admin, supporting global registration, on-demand imports (Tree-Shaking), and subpath imports.

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

Every `C_*/style.css` file is a self-contained component style entry. When a component composes public components such as `C_Icon` or `C_Captcha`, their required styles are included automatically, so consumers do not need duplicate imports or the global `style.css` fallback.

`C_Menu` emits a non-mutating `intent` event when a leaf item is hovered or keyboard-focused. Hosts may connect it to route prefetching without changing the existing `select` behavior.

The style tiers can also be imported explicitly:

```typescript
import '@robot-admin/naive-ui-components/C_Form/base.css'
import '@robot-admin/naive-ui-components/C_Table/base.css'
// Full mode is also available as C_Form/full.css and C_Table/full.css.
```

### Configure C_Guide

Provide targets and steps; the component owns its theme, optional SVG illustrations, and cleanup without depending on a host router or store:

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
        title: 'Search',
        description: 'Find a feature.',
        illustration: 'search',
      },
    },
  ]
</script>

<template>
  <C_Guide :steps="steps" />
</template>
```

Inside `NConfigProvider`, the popover follows its light/dark theme and primary color. Targets accept selectors, elements, or resolver functions; invisible targets are skipped by default and omitting a target creates a centered step. The engine loads when opened. With `persistence` enabled, only completion is remembered; the trigger always allows replay. Every step shows a skip button by default. Skipping emits `skip` and `close` without recording completion; configure it with `showSkipButton` and `skipBtnText`. `GuideExpose` provides `startGuide(force?)`, `stopGuide()`, `isCompleted()`, and `resetCompleted()` for host lifecycle integration.

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

Custom action bars should call the `action` slot's `submit()` rather than treating `validate()` as submission. The step-layout `step-actions` slot also provides `isLastStep`, `submit()`, and `submitting`. Put asynchronous persistence in `config.onSubmit`; the `@submit` event is a post-success notification and does not await an event listener's promise.

For create/edit flows, `C_FormModal` consumes a structural headless `editor` directly. Fields, validation, and layout remain data-driven by `C_Form`, while pages no longer own duplicate modal, draft, or loading state:

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
    { type: 'input', prop: 'name', label: 'Name', required: true },
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

The editor contract is structural: the component package does not depend on a request library. Any controller exposing `visible/mode/model/title/loading/setModel/close/submit` can drive it. The default uses a responsive 620px width, `small` form controls, and a right-aligned icon-based `C_ActionBar` for a compact admin workflow. Close button, mask close, and Escape remain enabled by default and can be disabled for high-risk forms.

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

When binding a headless CRUD controller through `:crud`, the table recognizes `{ error }` action results: failed deletes do not emit a successful-deletion event, and feedback already shown by the controller is not duplicated. Custom `actions.delete` callbacks may return a promise or a `{ data, error }` result.

Tree data can use `<C_Table :data="rows" :columns="columns" :config="{ tree: { defaultExpandAll: true }, pagination: false }" />` directly. `children` is the default child key and can be changed with `tree.childrenKey`. Default expansion includes parent rows added later without reopening rows the user collapsed.

`C_Tabs` is the data-driven page-scenario switcher for the global `C_*` system. It defaults to the compact
`small` size, lazy pane display, and supports controlled or uncontrolled state. Set `tabsOnly` for filters or
view switching; pane content is not executed, avoiding hidden render work and side effects. Most pages only maintain an item array; complex
content can opt into `render`, `pane`, or `pane-{key}` slots:

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { C_Tabs, defineTabs } from '@robot-admin/naive-ui-components/C_Tabs'

  const activeView = ref('basic')
  const views = defineTabs([
    { key: 'basic', label: 'Basic table', icon: 'mdi:table' },
    { key: 'tree', label: 'Tree table', icon: 'mdi:file-tree-outline' },
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

| API                           | Description                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `items`                       | Requires `key/label`; supports icons, badges, disabled/closable state, and `renderTab/render` |
| `modelValue` / `defaultValue` | Controlled and uncontrolled state                                                             |
| `type` / `size` / `placement` | `line/card/bar/segment`, common sizes and placements; defaults to `line/small/top`            |
| `tabsOnly`                    | Renders navigation only for table scenarios and query switches                                |
| `beforeChange`                | Sync/async guard; `false` or an error keeps the current tab                                   |
| Slots                         | `tab`, `pane`, and `pane-{key}`, each with item and active state                              |
| Events                        | `change`, `close`, `add`, and standard `update:modelValue`                                    |

Use `C_ActionBar` as the single page/table action model instead of maintaining another toolbar abstraction. It defaults to compact `tiny` buttons with icons and a `6px` gap. Semantic keys such as `add`, `refresh`, `export`, `columns`, and `settings` supply consistent labels, icons, and button types; custom actions receive a neutral icon when none is provided. `show`, `disabled`, and `loading` accept booleans, refs, or getters; async handlers are guarded against duplicate clicks and receive automatic loading feedback. `C_Table` consumes the same actions through `toolbar.actions` / `toolbar.rightActions` while preserving its existing toolbar slots. Override `actionBar.size` or an individual action's `size` when a larger control is required:

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
    actionBar: { size: 'small' }, // optional; tiny by default
  },
})
```

`C_Table` remains owned by its current Naive UI table implementation. A MachTable mode should render MachTable with its native columns, events, and instance API as a complete engine boundary rather than translating between the two engines. They only share engine-neutral page actions such as `C_ActionBar`.

### Recommended C_Map setup

`C_Map` consistently accepts `[latitude, longitude]` for centers and markers. It converts coordinates to AMap's `[longitude, latitude]` order internally, filters invalid markers, and only removes markers owned by the component.

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
    { id: 'beijing', lat: 39.9042, lng: 116.4074, popup: 'Beijing' },
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
  <button @click="mapRef?.fitToMarkers({ maxZoom: 14 })">Fit markers</button>
</template>
```

The exposed instance provides `getMap()`, `refresh()`, and `fitToMarkers()` for tab visibility changes, container resizes, and custom business layers. OpenStreetMap mode normalizes both the Leaflet ESM namespace and CommonJS `default` shape internally, so hosts do not need whole-package prebundling for correctness. `map-type="amap"` requires `amap-key`; keys created after 2021-12-02 also require `:amap-security-config="{ serviceHost: '/_AMapService' }"` (recommended in production so the server proxy retains the security secret), or `{ securityJsCode: '...' }` for development only, as described by the [official AMap security guidance](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode). The config is installed before the SDK script and conflicting keys on one page are rejected. The host CSP must also allow `https://webapi.amap.com` in `script-src`, with domain allowlists and quotas enforced in the AMap console.

`C_Date`, `C_Time`, `C_Menu`, and `C_FormSearch` support standard `v-model`. Message/dialog providers are optional; application-wide feedback, locale, form defaults, and `table.defaults` can be supplied through plugin options.

### C_Captcha Server Verification

The captcha trigger uses package-owned SVG status icons and does not depend on platform emoji or an online icon service. Idle, verifying, success, and error states keep consistent sizing and semantic colors. `C_Login` places the verification action before submit, keeps the action label explicit, and forwards `captcha-visible-change` so hosts can pause expensive background animation during puzzle interaction. Brand styling can be adjusted from the host with `--cc-height`, `--cc-radius`, `--cc-color`, `--cc-icon-color`, `--cc-bg`, `--cc-bg-hover`, `--cc-border`, `--cc-border-hover`, and `--cc-focus`, without reaching into internal DOM.

The default local mode only proves that the browser-side puzzle interaction completed. It is not a security credential for login, payment, or other sensitive actions. In production, provide a `verifier` and enable `require-server-verification`. Timeout, cancellation, and stale attempts are handled by the component, and `success` is emitted only after approval by an independent server/provider challenge. Request `token` and `timestamp` values are client-generated telemetry and must never be trusted as proof by the server.

For a permanently free, network-independent option, explicitly select the open-source MIT ALTCHA self-hosted provider. It is lazy-loaded only when selected, so the default puzzle path keeps its startup cost. ALTCHA mode always fails closed through server verification: the application server must issue fresh single-use challenges, verify the PoW payload, prevent replay, and rate-limit attempts while retaining all secrets server-side.

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
      return response.json() // { valid: boolean, token: 'single-use-server-token' }
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

With `require-server-verification`, a successful response must include a server token. Server tokens should be short-lived, single-use, and bound to the current session or operation. `C_Login` forwards the same policy through `captchaProvider`, `captchaChallengeUrl`, `captchaVerifier`, `requireCaptchaServerVerification`, and `captchaVerificationTimeout`; its `submit` payload identifies the result through `captchaType` and `captchaVerifiedBy`. See [SECURITY.md](./SECURITY.md) for trust-boundary details.

`C_Login` remembers only the username, never the password. SMS events require a valid phone number; the local countdown starts immediately, while delivery results and server-side rate limits remain the host's responsibility. `C_City` loads its city index on first open and scopes letter navigation to its own instance; the default trigger, letters, and city items are keyboard-operable.

### Table loading

`C_Table` uses a robot SVG loading indicator in the theme's primary color by default, retains existing data, and respects reduced-motion preferences. No page configuration is required. Override the `loading` slot for custom content. The standalone `C_Loading` accepts `size` (16–120, default 48), optional `label`, and optional `color`. Disable rotation when using it with native `NSpin`:

```vue
<NSpin :show="loading" :size="48" :rotate="false">
  <template #icon><C_Loading /></template>
  <section>Page content</section>
</NSpin>
```

### 📋 Component List (54 Components)

> 💡 All components provide **interactive live demos**. Visit the [Component Docs](https://www.tzagileteam.com/robot/components/preface) to try them out in real-time (rendered via iframe from Robot Admin production).

#### Basic Components

| Component        | Description               | External Deps                 |
| ---------------- | ------------------------- | ----------------------------- |
| `C_Icon`         | Iconify icon wrapper      | `@iconify/vue`                |
| `C_Loading`      | Theme-aware SVG loading   | -                             |
| `C_Code`         | Code highlighting         | `highlight.js`                |
| `C_Barcode`      | Barcode generator         | `@chenfengyuan/vue-barcode`   |
| `C_Captcha`      | Puzzle / ALTCHA captcha   | `vue3-puzzle-vcode`, `altcha` |
| `C_Cascade`      | Cascade panel selector    | -                             |
| `C_Guide`        | User guide / tour         | `driver.js`                   |
| `C_Progress`     | Enhanced progress bar     | -                             |
| `C_Steps`        | Step bar                  | -                             |
| `C_ActionBar`    | Action button bar         | -                             |
| `C_Theme`        | Theme switcher            | -                             |
| `C_Language`     | Language switcher         | -                             |
| `C_Date`         | Enhanced date picker      | -                             |
| `C_City`         | Province / city selector  | -                             |
| `C_Breadcrumb`   | Breadcrumb navigation     | -                             |
| `C_Menu`         | Navigation menu           | -                             |
| `C_Tabs`         | Data-driven scenario tabs | -                             |
| `C_TagsView`     | Tab-based navigation      | -                             |
| `C_GlobalSearch` | Global search panel       | -                             |
| `C_AvatarGroup`  | Avatar group display      | -                             |
| `C_OrgChart`     | Organization chart        | -                             |
| `C_Skeleton`     | Skeleton placeholder      | -                             |

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

Image/calendar behavior notes: `C_ImageCropper` flips the actual source and resets the current crop position; load/export failures emit `error: Error`. `C_Signature` readonly mode blocks user interaction but keeps exposed methods available for loading saved data. Its SVG export embeds the rendered raster canvas. `C_QRCode` uses the same raster-in-SVG approach when a logo is present so preview and export match. `C_FullCalendar` creates same-day events in local calendar time. `C_WaterFall` relayouts from actual image aspect ratios; give each item a stable unique `id`.

#### Form & Layout Components

| Component         | Description                                       | External Deps        |
| ----------------- | ------------------------------------------------- | -------------------- |
| `C_Form`          | Dynamic form engine (Grid/Tabs/Steps/Card layout) | -                    |
| `C_FormModal`     | Data-driven create/edit form modal                | -                    |
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

`C_FilePreview` accepts HTTPS URLs and same-origin HTTP URLs for local development. Script/data URLs, credential-bearing URLs, and cross-origin plain HTTP are rejected. `autoPreview` opens a supplied file automatically, and changing the source refreshes an open preview. Repeated previews release the previous PDF object URL and ignore stale loading results. Excel values `0` and `false` remain intact.

`C_AntV` keeps the public BPMN model as `{ nodes, flows }`. It converts that model to X6 cells internally and restores node positions, types, properties, and flow conditions in `data-change` and `getData()`. BPMN and UML load built-in samples only when `data` is absent; an explicit empty model produces an empty canvas.

`C_VtableGantt` merges presets and `options` without dropping untouched nested settings, replaces arrays as a whole, and ignores prototype-related keys. Its fullscreen button reflects the actual fullscreen state of that Gantt container.

`C_AudioPlayer` enters the playing state and emits `play` only after the browser accepts `play()`. A rejected autoplay emits `error`, and an empty playlist cannot emit a false play event. Mute, playlist tracks, and seeking are keyboard operable.

`C_CollapsePanel` and `C_TagsView` validate persisted data before restoring it, so corrupt or outdated JSON cannot break initialization. Persisted tags restore only in-app paths, and special characters in a path are no longer interpolated into CSS selectors.

`C_Table` column settings restore only valid keys, visibility, widths, and fixed directions; corrupt `persistKey` storage falls back to the supplied columns. Settings operate on local column copies rather than mutating caller-owned objects. `C_Upload` copies its initial file list before managing it, applies the same `accept` filter to picker, drop, and paste input, labels image actions for keyboard users, and shows per-file progress during concurrent hashing. Cancelling a chunked upload during resume lookup, an active request, or merging cannot start later requests or emit stale completion; a custom request's `abort()` releases the pending chunk even if it never calls back.

`C_WorkFlow` loads the supplied `modelValue` on first render and returns isolated snapshots from `getCurrentWorkflowData()`, `save`, `change`, and `node-click`, so callers cannot accidentally mutate its internal nodes. Editing conditions cannot change canvas data before Save, and incomplete conditions are not silently dropped. `readonly` blocks dragging, connecting, configuring, adding/removing, and saving while leaving preview, validation, and fit-to-view available. Node and condition IDs remain unique when created in the same tick.

Type verification covers TypeScript source, Vue SFC templates, and consumer examples built against the package. `C_Table` summary rendering expects an object keyed by column (`{ columnKey: { value, colSpan? } }`). `C_FormSearch` preserves existing numeric timestamp ranges and also supports formatted string ranges, binding each to the matching Naive UI value API.

Runtime component dependencies are declared by this package and resolved automatically. Every consumer needs:

```bash
bun add vue naive-ui
```

Install optional peers per feature: `vue-router` for `C_Breadcrumb`/`C_TagsView`, and `sortablejs` for C_Table row/column dragging. Subpath imports do not require unrelated optional peers. The formula editor uses a bounded built-in parser and does not execute dynamic JavaScript.

### 🏗️ Build Architecture

#### Six-stage Build Pipeline

```
bun run build
  ├── 1. tsdown          → Multi-entry bundling (54 components ESM/CJS/DTS)
  ├── 2. sass CLI        → Compile the shared-variable entry → global-scss.css
  ├── 3. merge-css.js    → Merge Vue-compiled SFC CSS + global variables → style.css
  ├── 4. gen-exports.js  → Auto-generate package.json exports map
  ├── 5. check:dist      → Validate root, subpath, SSR, and DTS public exports
  └── 6. check:size      → Enforce full/base CSS and package-size budgets
```

#### Key Technical Details

- **Build engine**: [tsdown](https://github.com/rolldown/tsdown) (Rolldown-based), 54 independent entries compiled in parallel
- **SCSS processing**: Custom `scssTransformPlugin` compiles SFC SCSS within the Rolldown pipeline; standalone Sass CLI only compiles the shared-variable entry
- **CSS merging**: Post-build merges Vue scoped-compiled per-chunk CSS with shared variables into a single `style.css`, avoiding duplicate styles and leaked raw `:deep()` selectors
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
├── C_Form.js / C_Form.cjs / C_Form.d.ts  # Subpath entries (54 components)
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
│   │   └── global.scss              # Auto-generated shared-variable entry
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
│   ├── gen-global-scss.js           # Generate global.scss (shared variables only)
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

The GitHub changelog generator requires `GITHUB_TOKEN` for `bun run version`; never commit the token. On Windows, if `bun run release` stalls while npm repeats `prepublishOnly`, first confirm `bun run verify` succeeds, then publish from PowerShell with `$env:npm_config_ignore_scripts='true'; bun run release`. This skips only the repeated lifecycle check, not the prerequisite verification.

## 📄 License

MIT License

---

## 🔗 Links

- [Component Docs with Interactive Demos](https://www.tzagileteam.com/robot/components/preface)
- [Robot Admin Main Project](https://github.com/ChenyCHENYU/robot_admin)
- [Robot Admin Live Demo](https://www.robotadmin.cn)
- [GitHub](https://github.com/ChenyCHENYU/naive-ui-components)
- [NPM](https://www.npmjs.com/package/@robot-admin/naive-ui-components)

### C_Login form extension

The `password-fields` slot appears below the password field and exposes `username` and `loading`. The synchronous `username-change` event covers initial defaults, remembered usernames and input changes. Use `submitDisabled` to block clicks and Enter while application fields are incomplete. Credential inputs are disabled while `loading`. Workspace discovery and authorization remain in the host application.
