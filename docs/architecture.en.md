[← Project README](../README_EN.md) · [中文](./architecture.md)

# Architecture and isolation

This library remains the independently maintained Naive UI adapter. A future Element Plus package will serve other applications with its own installation and releases. Adapters can share business protocols and proven logic, while keeping UI components, types and styles independent.

## Current boundaries

| Layer                                | Responsibility                                               | Constraint                                                       |
| ------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `src/core/`                          | Feedback/locale protocols, dictionaries and pure translation | No Vue, UI library, browser environment or ambient runtime state |
| `src/context.ts`, `src/composables/` | Vue injection keys and locale context                        | No Naive message/dialog implementation                           |
| `src/adapters/naive/`                | Naive Message/Dialog integration                             | UI-specific feedback stays here                                  |
| `src/components/`                    | Existing `C_*` components, Naive types and views             | Preserve existing APIs; these are not a generic UI core          |
| `src/config.ts`                      | Compatibility exports                                        | Preserve established import paths                                |

The core is currently an internal boundary, not a separately published package. A real Element Plus pilot will determine what becomes shared. The new adapter must not depend on this whole Naive package. Naive `FormInst`, native field behavior and `DataTableBaseColumn` remain adapter-specific.

## Dependencies and published entries

- Component subpaths load their own component graph and support page/route-level loading.
- Full installation registers the public `C_*` names, avoiding collisions between inferred `index.vue` names or a host application's `index` component.
- The root entry aggregates all components, including navigation, and preserves full installation. Runtime root imports require the optional `vue-router` peer, even for a non-routing named export. Applications without a router should use component subpaths.
- `sortablejs` is needed only for the corresponding drag features. Selective JS loading does not mean ordinary runtime dependencies are selectively installed.
- SheetJS 0.20.3 is built from the unchanged official archive, verified against its SHA-512, installed build inputs and license. Its runtime ships in separate chunks, removing the consumer's CDN installation requirement. FilePreview loads it with the component; table XLSX export loads it on demand. Base form/table entry budgets remain enforced. See [third-party notices](../THIRD_PARTY_NOTICES.md).
- ESM resolves `.d.ts`; CJS resolves `.d.cts`. Each declaration condition matches its JavaScript format.
- All public reachable declarations are checked for `naive-ui/es/*` and `naive-ui/lib/*` internal imports, in both formats.

The default consumer contract check unpacks a real tarball into a temporary directory and attaches the repository's resolved dependencies. It covers Node16/NodeNext ESM/CJS types and subpath runtime imports without optional peers. The `minimum` and `latest` profiles instead install fresh dependencies from the registry and also render representative components. CI runs both profiles; application acceptance remains a separate check.

## Highlight instances

```ts
import {
  createHighlight,
  setupHighlight,
} from '@robot-admin/naive-ui-components'

const standalone = createHighlight({ autoDetect: true })
const application = setupHighlight(app, { autoDetect: false })
```

Every `createHighlight()` and `setupHighlight()` owns its hljs instance, registered languages and loading state. In component setup, `useHighlight()` prefers the application's injected API; outside that context it creates an independent API. Retain an API explicitly when multiple calls should share it.

`window.hljs` is untouched by default. Legacy consumers can explicitly use `setupHighlight(app, { exposeToWindow: true })`; unmount restores the previous property according to ownership and preserves subsequent host updates. The `highlightManager` injection key remains compatible.

## Form renderer registries

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

The full plugin creates a registry per application by default. Sharing is explicit by passing the same registry. With local component imports, use `app.provide(FORM_RENDERER_REGISTRY_KEY, registry)`; both the factory and key are also exported from the `C_Form` subpath.

Precedence is: component `renderers` → independent registry → built-in renderer. Independent registries do not fall back to the legacy global registry. Registration returns an identity-bound disposer; a stale disposer cannot remove a newer registration, and runtime additions/removals update components.

`registerRenderer()` / `unregisterRenderer()` remain explicit legacy global APIs for consumers without an independent registry. Existing full-plugin applications should migrate custom renderers to `formRenderers` or register on that same registry, rather than expecting global updates to affect installed applications.

## Element Plus roadmap

1. Stabilize current Naive entrypoints, styles, consumers and isolation contracts.
2. Introduce an independent Element Plus package with a real business pilot for forms, search, tables, form dialogs and actions.
3. Reuse `form-validate` RuleSpec, `request-core/vue` Headless CRUD and `theme/core` / `theme/tokens` where applicable.
4. Extract neutral field, column, validation and state protocols from the pilot. UI props, events, instances and rendering stay in their adapters.
5. Keep each package's UI peers, builds, releases and CSS entries independent. Installing one for an application must not require the other UI library.

Running both UI libraries in one application is outside this iteration. That would additionally require registration names, style namespaces, overlay targets and theme ownership checks. Element Plus documents coordinated [ConfigProvider/SCSS namespaces](https://element-plus.org/en-US/guide/namespace.html) and [scoped theme variables](https://element-plus.org/en-US/guide/theming.html).

## Acceptance

Verify behavior through published consumers, public types, multiple applications, dynamic registration, unmount and host-state restoration. Source-level dependency guards complement runtime verification.

`bun run verify` is the local quality gate. `bun run check:audit` remains a separate check and CI gate. Record actual advisory results; do not hide them by disabling checks or forcing unverified major versions.

Fresh consumer compatibility is checked with `bun run check:consumer-contracts minimum` and `latest`. Each profile installs the real tarball in an isolated temporary directory, checks ESM/CJS types and renders representative components. CI runs both profiles. `/config` exports shared injection keys and protocol types without loading the presentation layer.
