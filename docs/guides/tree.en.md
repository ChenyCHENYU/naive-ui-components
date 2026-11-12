## Direct native options

`checkable`, `multiple`, `cascade`, `checkStrategy`, `selectable`, `disabled`, `virtualScroll`, `accordion` and `expandOnClick` are optional direct props. Omitted values retain `treeProps` and existing defaults; explicit false wins. All remaining native features stay in `treeProps`. A virtual tree needs a definite height. Change the native `themeOverrides.nodeHeight`, rather than adding row margins that disagree with virtual measurements.

## Remote search over a partially loaded tree

Pass an optional `searchSource` when matches may be outside the loaded subtree:

```vue
<C_Tree
  ref="tree"
  :data="roots"
  :search-source="{
    scope: companyId,
    request: ({ search, signal, limit }) =>
      api.searchPaths(search, limit, signal),
    resolve: (key, signal) => api.resolvePath(key, signal),
    load: (node, { signal }) => api.children(node.id, signal),
  }"
  :addable="false"
/>
```

The source infers the domain node type from `data`; it needs no string index signature or caller casts. `TreeSearchSource<Node>` is also exported for separately declared source objects.

- `request({search, signal, limit})` returns paths ordered root→ancestors→match. For example, `[[root, department, team], [root, finance]]`. Return `[]` for no results. The server owns authorization, matching and result ordering; the component does not apply a second local text filter.
- Optional `resolve(key, signal)` returns one path or null. `locate(key)` uses the loaded tree first, then resolve. An unknown controlled selection does not automatically trigger a network request.
- Optional `load(node, {signal})` returns **all direct children**. Search paths are partial evidence, not a complete child list. Locating a result expands its known ancestors without bulk-fetching every branch; a later user expansion completes a partial branch. Source load takes precedence in the new mode; existing `treeProps.onLoad` remains available when it is omitted.
- Defaults are `debounce=250`, `minChars=1`, `limit=100`. The result limit is capped at 1000 and a path at 256 nodes. Invalid keys, cycles, conflicting parents and duplicate matches are rejected atomically. String/finite number keys remain supported, including numeric zero.

The component maintains an instance-local projection and never mutates caller data or path arrays. Custom key/label/children fields and `getChildren` remain supported. Clearing a query removes matches and keeps the most recently located path and completed branches. Changing source functions, scope, field mapping or the root data array aborts outstanding work and discards the projection. Update scope when tenant/company conditions change inside a stable closure. Unmount and KeepAlive deactivation cancel work; activation reloads the current query. Stale results are ignored even when transport ignores AbortSignal.

Use `locate(key)`, `locateMatch(index)`, `nextMatch()` or `previousMatch()`; each returns `Promise<boolean>`. Next/previous wrap across matches and return false for an empty result. Enter/Shift+Enter in the search input navigates results, except during IME composition. Positioning requests ancestor expansion and selects only when allowed by native disabled/selectable settings. Controlled selection/expansion still belongs to the parent.

`retrySearch()` immediately retries the current query. Exposed state includes `searchLoading`, `searchError`, `searchMatchCount` and `searchMatchIndex` (-1 before positioning). The UI provides pending/error/retry and result navigation; partial branch completion has an inline loading indicator.

Existing native `onLoad` closures continue to own their requests and writes. The wrapper cannot abort a request or intercept a mutation hidden inside that legacy closure; retain the generation/abort guard described above. Checking unloaded descendants still requires an explicit server contract matching native `allowCheckingNotLoaded` and `checkStrategy` semantics.

Official references: [Tree API](https://github.com/tusen-ai/naive-ui/blob/main/src/tree/demos/enUS/index.demo-entry.md), [Tree source](https://github.com/tusen-ai/naive-ui/blob/main/src/tree/src/Tree.tsx), and the community [virtual row height report #7529](https://github.com/tusen-ai/naive-ui/issues/7529). Native checking, keyboard, dragging, loading and virtualization stay in Naive UI; the added source coordinates remote paths rather than replacing those engines. The issue report is a regression reference, not proof that every current Naive version has that bug.

Successful search previews results by expanding all matching ancestors once and scrolling to the first match, without selecting a node or emitting business selection. Next/previous or Enter performs explicit positioning and selection. Collapse-all, a single-node collapse or controlled collapse prevents a late load from reopening the node; valid children may stay cached. Collapsing one node does not invalidate sibling loads. Legacy onLoad deduplication uses original business node identity across projection updates.
