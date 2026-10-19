# Split panes and multiple-table workspaces

`C_SplitPane` divides a container horizontally (left/right) or vertically (top/bottom). Nest the same component to build tree/list, master/detail and three-table layouts. Slots render directly, so resizing does not recreate child components or replace their refs.

## Minimal configuration

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  import { C_SplitPane } from '@robot-admin/naive-ui-components/C_SplitPane'
  import '@robot-admin/naive-ui-components/C_SplitPane/style.css'
  const size = ref(30)
</script>

<template>
  <div class="workspace">
    <C_SplitPane
      v-model:size="size"
      :min-first-size="240"
      :min-second-size="320"
      aria-label="Departments"
    >
      <template #first><DepartmentTree /></template>
      <template #second><OrderList /></template>
    </C_SplitPane>
  </div>
</template>

<style scoped>
  .workspace {
    height: 100%;
    min-height: 0;
    min-width: 0;
  }
</style>
```

Omit `size` for internal state; `defaultSize` is 50. Use `v-model:size` when the application owns layout preferences or persistence. The component does not access localStorage. Scope persisted state by account, tenant and page in the application.

`size`, `defaultSize`, `minSize`, `maxSize` and `step` use percentage points. `minFirstSize`, `minSecondSize` and `gutterSize` use pixels. Percentages divide the space **remaining after the gutter**. A collapsed pane has an actual zero basis, avoiding negative width or height calculations.

## Nested tables

```vue
<C_SplitPane v-model:size="masterSize" :min-first-size="280" :min-second-size="420">
  <template #first="{ collapsed }"><OrderTable v-if="!collapsed" /></template>
  <template #second>
    <C_SplitPane v-model:size="detailSize" direction="vertical" :min-first-size="180" :min-second-size="180">
      <template #first><MaterialDetails /></template>
      <template #second><DeliveryDetails /></template>
    </C_SplitPane>
  </template>
</C_SplitPane>
```

Each pane needs a complete, measurable height chain from the page through Tabs, cards and table wrappers. Set `min-height:0; min-width:0` on intermediate flex containers. `C_Table flex-height` fills that workspace and keeps table rows scrolling internally. A bare table `height:100%` cannot repair a missing parent height.

Pane content scrolls automatically. For a table workspace, stretch the slot root to `height:100%` and let the table own row scrolling. For a long workbench with fixed-height tables, let the relevant pane or page own vertical document scrolling. Avoid adding competing page scrollbars to every intermediate wrapper.

Both slots expose `{ size, collapsed }`. By default, collapse preserves mounted content and marks it `inert` / `aria-hidden`. Use `v-if="!collapsed"` to suspend expensive tables; keep selections, edits and column preferences outside that subtree when state must survive unmounting. Otherwise keep the table mounted and let its ResizeObserver handle visibility changes. Third-party tables requiring an explicit layout call should receive it through their own API after a Tab/dialog becomes visible.

Do not wire SplitPane resize events to table data queries or make the layout component depend on table instances.

## Configuration and boundaries

| Prop                               | Unit / default  | Meaning                                                     |
| ---------------------------------- | --------------- | ----------------------------------------------------------- |
| `size`                             | % / unset       | Controlled first-pane share, accepted through `update:size` |
| `defaultSize`                      | % / 50          | Internal initial value and current reset target             |
| `minSize / maxSize`                | % / 0 / 100     | Allowed first-pane share; reversed bounds are normalized    |
| `minFirstSize / minSecondSize`     | px / 0          | Physical minimum width or height while expanded             |
| `direction`                        | `horizontal`    | `horizontal` for left/right; `vertical` for top/bottom      |
| `gutterSize`                       | px / 6          | Divider space, minimum 4                                    |
| `step`                             | % / 2           | Arrow-key adjustment; Shift multiplies it by 10             |
| `collapsible / showCollapseButton` | true / true     | Collapse availability and button visibility                 |
| `disabled`                         | false           | Disables user interaction; exposed methods remain available |
| `ariaLabel`                        | accessible name | Name the primary pane / splitter                            |

Pixel constraints update with the container size and orientation. Percentage limits, pixel minima and keyboard steps are reactive. Explicit collapse bypasses expanded minima. If the container cannot satisfy both pixel minima, the available space is shared proportionally, within the percentage bounds. No negative dimensions or forced container overflow result. The application should choose a stacked or Tab layout when multiple tables no longer fit usefully.

Existing uncontrolled usage remains supported. Moving the gutter outside the percentage calculation preserves 50/50 layouts and corrects asymmetric layouts by a few pixels for a normal 6px divider.

## Interaction

A fine divider line carries a centered capsule grip (80px long, 16px thick by default). Nearby collapse buttons appear on hover or keyboard focus and stay visible while collapsed. Borders, a restrained shadow and local accent feedback use the existing `--c-primary`, `--c-bg-card`, `--c-border` and `--c-text-3` theme tokens in both orientations.

The capsule itself accepts dragging without increasing the layout space reserved by `gutterSize`. Touch input gets a 24px grip thickness and permanently visible 28px buttons. Collapsed controls dock inside the container to avoid clipping. Inline SVG arrows require no remote icon request, and reduced-motion preferences disable transitions.

The [W3C APG Window Splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) informs keyboard behavior and separator semantics. Use Left/Right for left/right layouts and Up/Down for top/bottom layouts. Home/End move to the current boundaries. Enter collapses the first pane or restores an already collapsed pane. Double-click toggles the first pane.

Pointer Events support mouse, pen and touch. Pointer cancellation, window blur, document hiding, disablement, direction changes and unmounting all dispose listeners and restore the previous body cursor / text selection styles. Nested splitters do not overwrite `document.onmousemove`.

The separator exposes orientation, its decimal value, responsive limits and a unique controlled pane ID. Collapse buttons expose their target and expanded state, show keyboard focus and remain visible for touch input.

`resize(first, second)` reports actual displayed proportions; `update:size` requests a controlled-state change. `drag-start/drag-end` report gesture boundaries. `collapse/expand` report actual state transitions. Exposed methods: `setSize`, `resetSize`, `collapse`, `expand`, `toggle`, `getPanelInfo`.

## Production-reference comparison

The `wl-ui-produce` comparison was read-only: no component migration or backend write was performed. Three Vue files use `jh-drag-row`; no current `src` call uses `jh-drag-col`. Left/right tree examples come from its local layout standard 14. The installed common-core source/declarations are partly stripped, so they cannot prove every threshold documented in that standard.

Both implementations are movable pane separators. The production master/detail wrapper supplies `top-height=390/470` pixel initial values; the local standard shows `left-width=240`. This library deliberately retains percentage initial values and adds physical minima, rather than introducing multiple pixel aliases. Convert an exact pixel initial value at the application boundary when needed.

`c_steelListPanel` owns its ResizeObserver and table layout call. `c_steelWorkstation` also coordinates forms, streams, Tabs and business data. SplitPane supplies geometry; it does not replace those domain responsibilities or establish equivalence with Element Plus / BaseTable / AG Grid. See the [coverage assessment](../wl-ui-produce-coverage.md) for the wider limitations.
