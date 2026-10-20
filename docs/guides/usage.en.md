[← English README](../../README_EN.md) · [中文](./usage.md)

# Usage guide

Import strategies, component configuration and integration examples.

Focused guides: [form density](./form-density.en.md), [table density and edit modes](./table-density.md), [split panes](./split-pane.en.md), [tree capabilities](./tree.md), and [production project coverage review](../wl-ui-produce-coverage.md). Some focused guides are currently available in Chinese.

## On this page

- [Import strategies](#import-strategies)
- [Cron and formula workspaces](#cron-and-formula-workspaces)
- [Configure C_Guide](#configure-c_guide)
- [Recommended C_Form / C_Table setup](#recommended-c_form--c_table-setup)
- [Common component contracts](#common-component-contracts)
- [Recommended C_Map setup](#recommended-c_map-setup)
- [C_Captcha Server Verification](#c_captcha-server-verification)
- [Table loading](#table-loading)
- [C_Login form extension](#c_login-form-extension)
- [Page navigation loading](#page-navigation-loading)
- [Application extensions and migration](#application-extensions-and-migration)

## Import strategies

### Global Registration

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import NaiveUIComponents from '@robot-admin/naive-ui-components'
import '@robot-admin/naive-ui-components/style.css'

const app = createApp(App)
app.use(NaiveUIComponents)
app.mount('#app')
```

Root imports aggregate all components and need `vue-router` at runtime. Prefer component subpaths when navigation is not needed.

### On-demand Import (Tree-Shaking)

```vue
<script setup lang="ts">
  import { C_Icon, C_Table, C_Form } from '@robot-admin/naive-ui-components'
  import '@robot-admin/naive-ui-components/style.css'
</script>
```

### Subpath Import (Recommended, Smallest Bundle)

Each component provides an independent subpath entry that loads only the target component's code and types:

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

> Subpath imports provide full TypeScript support (`.d.ts`) with IDE auto-completion for props / emits / slots. Component-specific utilities such as `createMenuOptions` are exported from the same component subpath, so consumers do not need the root entry for one helper.

### Standalone Composables

```typescript
import { useTableManager } from '@robot-admin/naive-ui-components/C_Table'
import { useFormState } from '@robot-admin/naive-ui-components/C_Form'
import { usePlayerCore } from '@robot-admin/naive-ui-components/C_VideoPlayer'
```

### Automatic On-demand Imports (Recommended)

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

## Cron and formula workspaces

Use a model and one flat config. Existing individual props remain supported; templates, validation, previews and initial-state reset are owned by the components.

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

Cron supports six numeric fields, ranges, steps, lists and day/weekday exclusion with `?`; L/W/# extensions are not supported. Preview dates use the browser local timezone and never schedule jobs. Formula trials do not mutate caller `sampleData`; validation and calculation share a bounded parser with lazy conditions. Compact modes use `showPreview`, `showKeyboard` and `showVariablePanel`. Read-only mode protects trial inputs too. Reset restores the initial model and data; remount with a new key when switching independent records.

## Configure C_Guide

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

## Recommended C_Form / C_Table setup

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

`C_Form` includes `@robot-admin/form-validate`; consumers need no local type adapter or separate validation installation. `rules` and `rulesWhen` accept native Naive UI rules, the package's `NaiveRule`, and framework-independent `RuleSpec` objects, including mixed lists. `required: true` uses the same empty-value rules and preserves valid `0` and `false` values.

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
    label: 'Name',
    required: true,
    rules: [SPEC_RULES.length('Name', 2, 20)],
  },
  {
    type: 'input',
    prop: 'email',
    label: 'Email',
    rules: NAIVE_COMBOS.email('Email'),
  },
  {
    type: 'input',
    prop: 'mobile',
    label: 'Mobile',
    rules: [PRESET_RULES.mobile('Mobile')],
  },
])
```

Normal forms provide submit/reset controls; step forms provide a submit button on their last step. Configure `submitText`, `resetText`, and `onSubmit`. Use `action-extra` for business controls such as previews while retaining the built-in buttons and loading state. Full customization remains available through `action` and `step-actions`; call the slot's `submit()` rather than treating `validate()` as submission.

Put asynchronous work in `config.onSubmit`; `@submit` is a completion notification and does not await an event listener's promise. The second argument provides `context?.signal` for cancellable requests. Unmount aborts that signal and suppresses late submit events and feedback. `submitSuccessText` and `resetSuccessText` opt in to feedback; no success message is shown by default, and validation alone does not imply persistence.

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

For fixed-height tables, use `flex-height` with `wrapper-class`. The root wrapper allocates height between toolbars, the table and pagination. Give the wrapper or its parent a definite height; the component does not guess the page height. `wrapper-class` accepts Vue string, array and object class bindings, so scoped consumer styles can target the root directly. Existing `class`, `style` and native table attributes continue to reach the internal `NDataTable`.

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

Add `{ type: 'selection' }` explicitly. Receive keys and rows through `@selection-change="(keys, rows) => ..."`; use the public `clearSelection()` instance method instead of observing internal manager state.

`C_Table` remains owned by its current Naive UI table implementation. A MachTable mode should render MachTable with its native columns, events, and instance API as a complete engine boundary rather than translating between the two engines. They only share engine-neutral page actions such as `C_ActionBar`.

## Common component contracts

### Form values and validation

Continue with `useCForm()` from the example above to read and update values without duplicating model synchronization or waiting for rendering:

```ts
const { formRef, bindings, setValues, getValues, reset, submit } =
  useCForm<UserForm>({
    initialValues: { name: '', profile: { email: '' } },
    options,
    config,
  })

async function loadUser(user: UserForm) {
  await setValues(user)
  formRef.value?.markAsClean() // Make the loaded record the reset baseline.
}

function preview() {
  return getValues() // Independent snapshot, including edits before the parent model's next update.
}
```

`setValues(values, shouldValidate = false)` delegates to the mounted form instance, or updates the bound model before mounting. `getValues()` returns a copy. `reset()` restores the current clean snapshot; `markAsClean()` updates that baseline. Supply a complete nested object when setting it, or call the instance's `setFieldValue('profile.email', value)` for one path.

`useCForm().validate()` rejects before `formRef` is bound or after unmount. `submit()` returns `false` in that state. Draft `setValues()`, `getValues()`, and `reset()` remain available before mounting.

Vue unwraps state exposed through a component template ref: scripts read `formRef.value?.isSubmitting`, `formRef.value?.isDirty`, and `formRef.value?.formModel` without a second `.value`. The helper's own `model`, `formRef`, and `bindings` remain Vue refs.

Default, inline, and grid layouts are synchronous. Card, tabs, steps, dynamic, and custom layouts load on demand. Before an asynchronous layout mounts, `submit()` returns `false` and `validate()` rejects rather than accepting fields that have not rendered. Once ready, tab and step layouts mount fields across their panels, so full submission also validates unvisited panels. Async option requests are isolated per field; late responses from superseded requests cannot replace newer options.

For `C_Tree`, read `tree.value?.selectedKeys`, `expandedKeys`, and `checkedKeys` directly as arrays with `ref<TreeExpose>()`. Prefer `v-model:*` for controlled state. The standalone `useTreeOperations()` composable retains internal refs.

### Table editing validation

`required` and `editProps.rules` share the same extraction and native validation semantics in modal, row, and cell editing. Use Naive `FormItemRule` entries such as `{ type: 'email', message: 'Invalid email' }`. Number and switch editors infer their basic type unless explicitly specified. Prefer Promise-based async rules; `asyncValidator` callbacks are supported too. Warning-level rules do not block saves.

Selection, expansion, index, and action columns are automatically excluded from generated form fields. Read-only business columns remain excluded. Numeric field keys are converted to form field strings. Existing configuration and compatibility entries remain supported.

Read `TimeExpose.startTime/endTime/singleTime` directly as numbers or null, and `MenuExpose.menuRef` directly as the native menu instance or null. Vue unwraps these top-level exposed refs.

### Table pagination, selection, and export

`TableProps<Row>` includes `config`, `crud`, `remote`, and `virtualScrollX`; columns and data may be omitted when supplied by CRUD. `TableProps` shares runtime props with the component and retains native display attributes such as `size` / `minHeight` and actual event listeners. Since 0.19 it rejects previously ignored legacy props (`editable`, `editMode`, `onLoadExpandData`, `enableSelection`); use `config.edit`, `config.expand`, and `config.selection`. Use `config.display.maxHeight` and `config.display.scrollX` for height limits and horizontal scrolling; top-level attributes are overridden internally and are excluded from the main contract. Standalone deprecated types remain available.

Form submission, table save, and action callbacks accept business return values such as `Promise<Row>` or `Promise<boolean>` directly. For example, use `onClick: form.submit` or `onSave: saveRow`. The component waits for asynchronous completion and retains its loading, concurrency, and error handling; callback results are ignored. Boolean guards keep their separate result contract.

Use `config.pagination` for new pages. For remote tables, bind the `useTableQuery().bindings` shown above so pagination, totals, loading, and requests have one owner. The compatibility `:pagination="..."` prop delegates pagination to Naive UI. Explicitly passing that prop, including `false`, takes precedence over `config.pagination`; the component does not render a second pager. With native remote pagination, also pass `remote` and manage requests and native update events yourself.

Local data is filtered and sorted before pagination. Remote mode displays the server's page without slicing it again. `crossPageSelection: true` retains selected row objects from visited remote pages; `selectAll()` only adds the currently loaded page and cannot represent unseen server records. Use `getSelectedRows()` or the row objects from `@selection-change` for batch work. Server-wide operations need an explicit query or a server-side task supplied by the application.

Choose export scope explicitly:

| `config.export` option      | Data source                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `scope: 'source'` (default) | All currently supplied source rows; remote mode usually has only the loaded page           |
| `scope: 'page'`             | The displayed page, including local filtering, sorting, and pagination                     |
| `scope: 'selected'`         | Available selected row objects, including selections retained from visited pages           |
| `requestData`               | An explicit request made when export is clicked; overrides `scope` for server-wide exports |

```ts
const config = defineTableConfig({
  export: {
    scope: 'page',
    filename: 'users',
    format: 'csv',
  },
})

// Supply full data explicitly; export never walks server pages automatically.
const fullExport = defineTableConfig({
  export: { requestData: () => fetchAllUsers(), filename: 'all-users' },
})
```

Failed asynchronous expansion retains its error state and provides retry in the default content. Call the public `retryExpand(key)` method to reload, or `invalidateExpand(key?)` to clear one row's cached data and error, or all caches when omitted. Invalidation does not request data. Concurrent loads of one row share a request; replacing its source row invalidates the old cache and prevents late old responses from writing it back.

Dynamic add/copy operations must generate keys consistent with the table. Prefer a string `row-key="uuid"`. If the table requires `:row-key="row => row.uuid"`, also set `config.dynamicRows.rowKey: 'uuid'` so add/copy operations know which field to generate. Arbitrary composite keys are not inferred. Missing or duplicate keys reject insertion; the related instance methods do not mutate data when dynamic rows are disabled.

### Connect search to a remote table

Select fields use the existing `list` and `attrs` entries. Set `attrs: { multiple: true }` with an array model for multiple selection. Option values support strings, numbers, and booleans; `false`, `0`, and empty values remain distinct. Search callbacks receive original business values without internal encoding. Standard `TableInstance<Row>` selection methods follow the active selection mode; nested `crossPageSelection.selectedCount` remains a ref and needs `.value`.

Use `C_FormSearch` with `v-model`; legacy `formParams` remains supported. Put requests in `config.onSearch` and use `@search` for notification. Sending requests from both paths executes both application handlers. The following example gives a single table controller ownership of requests, pagination, and loading:

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
    { type: 'input', prop: 'keyword', placeholder: 'Keyword' },
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

The search button, native form submission (including Enter in an input), and exposed `searchFn()` share validation and duplicate prevention. Only currently mounted search controls participate in Naive form validation. Editing conditions, enabling external loading, or unmounting during async validation cancels dispatch; requests receive the successfully validated snapshot. At least one non-pagination value is required by default; set `requireValue: false` to allow an empty query.

The `reset(params)` event follows the synchronous v-model update and carries the complete reset snapshot. Existing no-argument handlers remain compatible. Reset restores field defaults while retaining `pageNum/pageSize`; it does not automatically request or debounce. This example explicitly reloads through `@reset="applyQuery"`, and `setQuery()` resets the table page. Avoid reading a separately maintained stale query in the reset handler.

### Action configuration and asynchronous work

Stable semantic keys and Promise callbacks provide labels, icons, and mutual exclusion without a loading ref for every button:

```ts
const actions = defineActions([
  { key: 'save', onClick: () => saveCurrentUser() },
  { key: 'refresh', disabled: () => loading.value, onClick: reload },
  {
    key: 'more',
    dropdown: [{ key: 'export', label: 'Export', onClick: exportUsers }],
  },
])
```

Duplicate keys in one ActionBar share a task lock. Replacing action objects or moving them between left/right groups preserves that key's busy state. Unkeyed actions use their group and position, so dynamic lists should supply explicit keys. Dropdown items follow the same disabled/loading guards and async mutual exclusion as regular buttons. `autoLoading: false` only hides the automatic spinner; duplicate execution remains blocked.

`action-click` and `dropdown-click` are notifications and do not await listeners' promises; put async commands in the action's `onClick`. Failures emit `action-error(error, action, item?)` and continue to Vue's `errorHandler` or error-capture boundary. `buttonProps.disabled/loading` merge with action state and cannot override internal busy protection. `buttonProps.onClick` remains a native click observer rather than replacing the executor. Table row actions reuse lightweight task locks without mounting a complete action bar per row.

## Recommended C_Map setup

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

## C_Captcha Server Verification

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

With `require-server-verification`, a successful response must include a server token. Server tokens should be short-lived, single-use, and bound to the current session or operation. `C_Login` forwards the same policy through `captchaProvider`, `captchaChallengeUrl`, `captchaVerifier`, `requireCaptchaServerVerification`, and `captchaVerificationTimeout`; its `submit` payload identifies the result through `captchaType` and `captchaVerifiedBy`. See [SECURITY.md](../../SECURITY.md) for trust-boundary details.

`C_Login` remembers only the username, never the password. SMS events require a valid phone number; the local countdown starts immediately, while delivery results and server-side rate limits remain the host's responsibility. `C_City` loads its city index on first open and scopes letter navigation to its own instance; the default trigger, letters, and city items are keyboard-operable.

## Table loading

`C_Table` uses a data-orbit SVG indicator in the theme's primary color, with an orbit, data rows, and a subtle beam to indicate waiting. It retains existing data and respects reduced-motion preferences without page configuration. Built-in asynchronous expansion also uses `C_Loading`; custom expansion renderers retain control of their content. Override the `loading` slot for custom content. The standalone `C_Loading` accepts `size` (16–120, default 48), optional `label`, and optional `color`. Disable rotation when using it with native `NSpin`:

```vue
<NSpin :show="loading" :size="48" :rotate="false">
  <template #icon><C_Loading /></template>
  <section>Page content</section>
</NSpin>
```

## C_Login form extension

The `password-fields` slot appears below the password field and exposes `username` and `loading`. The synchronous `username-change` event covers initial defaults, remembered usernames and input changes. Use `submitDisabled` to block clicks and Enter while application fields are incomplete. Credential inputs are disabled while `loading`. Workspace discovery and authorization remain in the host application.

## Page navigation loading

Connect navigation lifecycles through `start()` / `finish(id)`. The component handles visuals, themes and reduced motion. A 160ms default delay avoids flashes; stale completions cannot hide a newer task.

```vue
<C_PageLoading :show="loading.visible.value" />
```

```ts
import { createPageLoading } from '@robot-admin/naive-ui-components/C_PageLoading'
const loading = createPageLoading({ delay: 160 })
const id = loading.start()
// After completion, cancellation or failure
loading.finish(id)
```

## Application extensions and migration

`createHighlight()` and `setupHighlight()` own isolated highlighters. Component `useHighlight()` reads the app injection; standalone calls create separate APIs. Default installation does not write `window.hljs`; use `exposeToWindow: true` only for explicit legacy integration.

The full plugin owns one form registry per application. Migrate global `registerRenderer()` usage to `createFormRendererRegistry()` and the plugin's `formRenderers` option. With component subpaths, provide `FORM_RENDERER_REGISTRY_KEY` explicitly. See [architecture and isolation](../architecture.en.md) for examples, precedence and ownership rules.

### Business models and public types (0.18)

Define domain models in the application. Components preserve their types without requiring `DataRecord`, `SearchFormParams`, or `TreeNodeData` inheritance. Those defaults support dynamic configuration; adding an open string index weakens field-name checks.

- Keep `defineFormOptions<Model>(...)`: initial values and `valueWhen` correlate with `prop`. Declare nullable fields explicitly. Recursive field paths use an internal depth bound.
- Search infers the query model from `v-model` across fields, configuration and events. Use `SearchDateRangeValue` for ranges; `onSearch` can return a request Promise directly.
- Use `defineTableColumns<Row>(...)` for field checks and `TableConfig<Row, Child>` / `TableInstance<Row, Child>` for nested tables. Expansion receives typed child records and selection state; events and public methods preserve both models.
- Tree, draggable and transfer callbacks and slots preserve the model inferred from input data. Domain-specific fields remain application-owned.
- Prefer standard `v-model` with date/time `mode`. Static modes infer scalar or range values; dynamic modes retain a union. Legacy aliases remain compatible.
- Workflow nodes narrow their payload through `node.type`. Import `WorkflowExpose`, `DiagramExpose`, or `GanttExpose` instead of rebuilding instance handles. Gantt SDK configuration and layout contexts are typed; extend `GanttTask` for domain metadata. Declare `children?: MyTask[]` for homogeneous trees; callbacks preserve heterogeneous descendant unions for domain narrowing. SDK-edited task dates are `string | Date`.

CRUD bindings remain structural. `@robot-admin/request-core` 0.6.3 accepts component columns directly, without application converters or a dependency between the two packages.

For a concrete business model, enable dynamic insertion with the existing `dynamicRows.defaultRowData` factory returning a complete row and valid unique key; `false` still disables it directly. Factory keys retain their original type. Copying with a string key preserves business fields and takes a fresh key from the factory. With a function key, the factory receives an optional source copy and returns a complete new record. Missing, duplicate or invalid factory keys report failure without changing data. Open dynamic records retain the legacy empty-row shorthand.
