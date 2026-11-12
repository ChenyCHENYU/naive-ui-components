import { useComponentLocale } from '../../../config'
import {
  ref,
  computed,
  watch,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toRaw,
  nextTick,
  type Ref,
} from 'vue'
import { type TreeInst, type TreeProps as NaiveTreeProps } from 'naive-ui'
import { presetConfigs } from '../data'
import { indexTreeNodes } from '../treeKeys'
import { useTreeSearch } from './useTreeSearch'
import { useTreeNodeRendering } from './useTreeNodeRendering'
import { treeSearchKey } from '../searchProjection'
import { resolveComponentDensity } from '../../../core/density'
import type {
  TreeNodeData,
  ActionConfig,
  TreeProps,
  TreeExpose,
  TreeEmits,
  DropInfo,
  TreeKey,
  TreeUpdateMeta,
  TreeRenderContext,
  TreeNodeRenderContext,
  TreeSlots,
} from '../types'

type EmitFn<T extends object> = <E extends keyof TreeEmits<T>>(
  event: E,
  ...args: TreeEmits<T>[E]
) => void

/** State coordination only; checking, filtering, keyboard and loading stay native. */
export function useTreeOperations<T extends object = TreeNodeData>(
  props: TreeProps<T>,
  emit: EmitFn<T>,
  slots: TreeSlots<T> = {}
) {
  const { t } = useComponentLocale()
  const native = computed(() => {
    const result = { ...props.treeProps }
    for (const field of [
      'checkable',
      'multiple',
      'cascade',
      'checkStrategy',
      'selectable',
      'disabled',
      'virtualScroll',
      'accordion',
      'expandOnClick',
    ] as const)
      if (props[field] !== undefined) Reflect.set(result, field, props[field])
    return result
  })
  const preset = computed(() => presetConfigs[props.mode ?? 'custom'])
  const draggable = computed(
    () =>
      props.draggable ??
      native.value.draggable ??
      preset.value.draggable ??
      false
  )
  const showLine = computed(
    () =>
      props.showLine ?? native.value.showLine ?? preset.value.showLine ?? true
  )
  const actions = computed<ActionConfig<T>[]>(
    () =>
      props.actions ??
      (preset.value.actions ?? []).map(action => ({
        ...action,
        text: t(
          action.key === 'edit' || action.key === 'delete'
            ? `common.${action.key}`
            : `tree.${props.mode}.${action.key}`
        ),
        confirm: action.confirm
          ? t(`tree.${props.mode}.deleteConfirm`)
          : undefined,
      }))
  )
  const mergedConfig = computed(() => ({
    ...preset.value,
    ...props,
    draggable: draggable.value,
    showLine: showLine.value,
    iconConfig: {
      default: 'mdi:circle-outline',
      ...preset.value.iconConfig,
      ...props.iconConfig,
      typeMap: {
        ...preset.value.iconConfig?.typeMap,
        ...props.iconConfig?.typeMap,
      },
      colorMap: {
        ...preset.value.iconConfig?.colorMap,
        ...props.iconConfig?.colorMap,
      },
    },
    actions: actions.value,
  }))
  const keyField = computed(
    () => props.keyField ?? native.value.keyField ?? 'id'
  )
  const labelField = computed(
    () => props.labelField ?? native.value.labelField ?? 'name'
  )
  const childrenField = computed(
    () => props.childrenField ?? native.value.childrenField ?? 'children'
  )
  const internalSearchPattern = ref('')
  const currentSearchPattern = computed({
    get: () =>
      props.searchPattern ??
      native.value.pattern ??
      internalSearchPattern.value,
    set: pattern => {
      internalSearchPattern.value = pattern
      emit('update:searchPattern', pattern)
    },
  })
  const search = useTreeSearch({
    props,
    pattern: currentSearchPattern,
    fields: () => ({
      key: keyField.value,
      children: childrenField.value,
      getChildren: native.value.getChildren,
    }),
    reveal: path => revealPath(path),
    preview: (paths, current) => previewPaths(paths, current),
    onError: error => emit('search-error', error),
    onLoadError: (error, node) => emit('load-error', error, node),
  })
  const treeData = computed(() => search.projection.value.data)
  const getChildren = (node: T) =>
    search.projection.value.projected
      ? Reflect.get(node, childrenField.value)
      : native.value.getChildren
        ? native.value.getChildren(node)
        : Reflect.get(node, childrenField.value)
  const index = computed(() =>
    indexTreeNodes(
      treeData.value,
      keyField.value,
      childrenField.value,
      getChildren
    )
  )
  // 远程投影可能复制节点；原始身份索引只随来源/字段变化重算，不在逐行渲染中遍历。
  const originalNodes = computed(
    () =>
      indexTreeNodes(
        props.data,
        keyField.value,
        childrenField.value,
        native.value.getChildren
      ).nodes
  )
  const defaultExpandAll = () =>
    props.defaultExpandAll ?? native.value.defaultExpandAll ?? false
  const retainExpandAll = ref(defaultExpandAll())
  const initial = <K extends 'Expanded' | 'Selected' | 'Checked'>(kind: K) => {
    const key = `default${kind}Keys` as
      'defaultExpandedKeys' | 'defaultSelectedKeys' | 'defaultCheckedKeys'
    return [...(props[key] ?? native.value[key] ?? [])]
  }
  const internalExpanded = ref<TreeKey[]>(
    defaultExpandAll() ? index.value.expandableKeys : initial('Expanded')
  )
  const internalSelected = ref<TreeKey[]>(initial('Selected'))
  const internalChecked = ref<TreeKey[]>(initial('Checked'))
  const expandedKeys = computed<TreeKey[]>({
    get: () =>
      props.expandedKeys ?? native.value.expandedKeys ?? internalExpanded.value,
    set: keys => handleExpandedKeysChange(keys),
  })
  const selectedKeys = computed<TreeKey[]>({
    get: () =>
      props.selectedKeys ?? native.value.selectedKeys ?? internalSelected.value,
    set: keys => handleSelectedKeysChange(keys),
  })
  const checkedKeys = computed<TreeKey[]>({
    get: () =>
      props.checkedKeys ?? native.value.checkedKeys ?? internalChecked.value,
    set: keys => handleCheckedKeysChange(keys),
  })
  const isAllExpanded = computed(() => {
    const keys = index.value.expandableKeys
    const expanded = new Set(expandedKeys.value)
    return keys.length > 0 && keys.every(key => expanded.has(key))
  })
  watch(
    () => index.value.expandableKeys,
    keys => {
      if (retainExpandAll.value) internalExpanded.value = [...keys]
    }
  )
  watch(defaultExpandAll, value => {
    retainExpandAll.value = value
    if (value) internalExpanded.value = [...index.value.expandableKeys]
  })
  for (const [kind, target] of [
    ['Expanded', internalExpanded],
    ['Selected', internalSelected],
    ['Checked', internalChecked],
  ] as const) {
    const key = `default${kind}Keys` as
      'defaultExpandedKeys' | 'defaultSelectedKeys' | 'defaultCheckedKeys'
    watch(
      () => props[key] ?? native.value[key],
      value => {
        if (native.value.watchProps?.includes(key)) {
          target.value =
            kind === 'Expanded' && defaultExpandAll()
              ? [...index.value.expandableKeys]
              : [...(value ?? [])]
        }
      }
    )
  }
  const optionsFor = (keys: TreeKey[]) =>
    keys.map(key => index.value.nodes.get(key) ?? null)
  const callNative = (name: string, args: unknown[]) => {
    const callback = (native.value as Record<string, unknown>)[name]
    const callbacks = Array.isArray(callback) ? callback : [callback]
    for (const handler of callbacks)
      if (typeof handler === 'function') handler(...args)
  }
  const handleExpandedKeysChange = (
    keys: TreeKey[],
    options = optionsFor(keys),
    meta: TreeUpdateMeta<T> = { node: null, action: 'expand' }
  ) => {
    if (meta.action !== 'filter') retainExpandAll.value = false
    if (meta.action === 'collapse' && meta.node)
      invalidateNodeLoad(treeSearchKey(meta.node, keyField.value))
    internalExpanded.value = [...keys]
    emit('update:expandedKeys', keys, options, meta)
    callNative('onUpdateExpandedKeys', [keys, options, meta])
    callNative('onUpdate:expandedKeys', [keys, options, meta])
    if (meta.action === 'expand' && meta.node) {
      const key = treeSearchKey(meta.node, keyField.value)
      if (search.projection.value.partialKeys.has(key))
        void handleLoad.value?.(meta.node)
    }
  }
  const handleSelectedKeysChange = (
    keys: TreeKey[],
    options = optionsFor(keys),
    meta: TreeUpdateMeta<T> = {
      node: options[0] ?? null,
      action: keys.length ? 'select' : 'unselect',
    }
  ) => {
    internalSelected.value = [...keys]
    emit('update:selectedKeys', keys, options, meta)
    emit('node-select', options[0] ?? null, keys)
    callNative('onUpdateSelectedKeys', [keys, options, meta])
    callNative('onUpdate:selectedKeys', [keys, options, meta])
  }
  const handleCheckedKeysChange = (
    keys: TreeKey[],
    options = optionsFor(keys),
    meta: TreeUpdateMeta<T> = {
      node: null,
      action: keys.length ? 'check' : 'uncheck',
    }
  ) => {
    internalChecked.value = [...keys]
    emit('update:checkedKeys', keys, options, meta)
    callNative('onUpdateCheckedKeys', [keys, options, meta])
    callNative('onUpdate:checkedKeys', [keys, options, meta])
  }
  const selectedNode = computed(
    () => index.value.nodes.get(selectedKeys.value[0]) ?? null
  )
  const expandedKeySet = computed(() => new Set(expandedKeys.value))
  const actionRevision = ref(0)
  watch(
    [
      () => props.searchSource?.scope,
      () => props.searchSource?.request,
      keyField,
      childrenField,
    ],
    () => {
      actionRevision.value++
    },
    { flush: 'sync' }
  )
  const renderContext = (
    info: TreeRenderContext<T>
  ): TreeNodeRenderContext<T> => {
    const key = treeSearchKey(info.option, keyField.value)
    const explicitLeaf: unknown = Reflect.get(info.option, 'isLeaf')
    const original = toRaw(originalLoadNode(info.option))
    return {
      ...info,
      expanded: expandedKeySet.value.has(key),
      // 与原生 treemate 一致：显式 isLeaf 优先，否则依据有效 children/getChildren。
      isLeaf:
        explicitLeaf === undefined
          ? !getChildren(info.option)
          : Boolean(explicitLeaf),
      loading:
        search.active.value &&
        (search.loadingKeys.value.has(key) ||
          nativeLoadingNodes.value.has(original)),
    }
  }
  const { renderPrefix, renderLabel, renderSuffix } = useTreeNodeRendering({
    props,
    native,
    config: mergedConfig,
    labelField,
    actionRevision,
    slots,
    context: renderContext,
    currentNode: node =>
      index.value.nodes.get(treeSearchKey(node, keyField.value)),
    onAction: (action, node) => {
      if (action === 'add') emit('add', node)
      else emit('node-action', action, node)
    },
    loadingLabel: () => t('tree.loadingChildren'),
  })
  let active = true
  const loadRevision = ref(0)
  const collapsedLoads = new Map<TreeKey, number>()
  const invalidateNodeLoad = (key: TreeKey) =>
    collapsedLoads.set(key, (collapsedLoads.get(key) ?? 0) + 1)
  watch(
    expandedKeys,
    (keys, previous) => {
      const expanded = new Set(keys)
      for (const key of previous)
        if (!expanded.has(key)) invalidateNodeLoad(key)
    },
    { flush: 'sync' }
  )
  watch(
    [
      () => props.searchSource?.request,
      () => props.searchSource?.scope,
      () => props.searchSource?.load,
      () => props.data,
    ],
    (_current, previous) => {
      if (props.searchSource || previous?.[0]) {
        loadRevision.value++
        collapsedLoads.clear()
      }
    },
    { flush: 'sync' }
  )
  type PendingLoad = { revision: number; promise: Promise<unknown> }
  const pendingLoads = new WeakMap<T, PendingLoad>()
  const nativeLoadingEntries = new Map<T, PendingLoad>()
  const nativeLoading = shallowRef<ReadonlyMap<T, PendingLoad>>(new Map())
  const nativeLoadingNodes = computed(
    () =>
      new Set(
        [...nativeLoading.value]
          .filter(([, pending]) => pending.revision === loadRevision.value)
          .map(([node]) => node)
      )
  )
  const refreshNativeLoading = (node: T, pending?: PendingLoad) => {
    // onLoad 可能由原生 watchEffect 调用；只写快照，不能把该 effect 订阅到加载集合。
    if (pending) nativeLoadingEntries.set(node, pending)
    else nativeLoadingEntries.delete(node)
    nativeLoading.value = new Map(nativeLoadingEntries)
  }
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false
    })
  watch(
    [
      () => native.value.onLoad,
      keyField,
      childrenField,
      () => native.value.getChildren,
    ],
    () => {
      loadRevision.value++
    },
    { flush: 'sync' }
  )
  const reportLoadError = (error: unknown, node: T, rawNode: T) => {
    const key: unknown = Reflect.get(node, keyField.value)
    if (typeof key !== 'string' && typeof key !== 'number') return
    const current = index.value.nodes.get(key)
    if (current && toRaw(originalLoadNode(current)) === rawNode)
      emit('load-error', error, node)
  }
  const originalLoadNode = (node: T) =>
    props.searchSource
      ? (originalNodes.value.get(treeSearchKey(node, keyField.value)) ?? node)
      : node
  const acceptNativeChildren = (node: T, result: unknown) => {
    if (!props.searchSource || result === false) return
    const children = native.value.getChildren
      ? native.value.getChildren(node)
      : Reflect.get(node, childrenField.value)
    if (Array.isArray(children))
      search.acceptBranch(treeSearchKey(node, keyField.value), children)
  }
  const canLoad = (load: unknown) =>
    active && search.active.value && native.value.onLoad === load
  const retainLoadExpansion = (node: T) => {
    const revision = loadRevision.value
    const key = treeSearchKey(node, keyField.value)
    const collapsed = collapsedLoads.get(key)
    const expanded = expandedKeys.value.includes(key)
    return () =>
      active &&
      search.active.value &&
      loadRevision.value === revision &&
      collapsedLoads.get(key) === collapsed &&
      (!props.searchSource || expandedKeys.value.includes(key) === expanded) &&
      index.value.nodes.has(key)
  }
  const handleLoad = computed(() => {
    const sourceLoad = props.searchSource?.load
    if (sourceLoad)
      return async (node: T) => {
        if (props.searchSource?.load !== sourceLoad) return false
        const mayExpand = retainLoadExpansion(node)
        const result = await search.load(node)
        // 子项可以留在当前来源的缓存，但折叠后的迟到加载不能再次展开节点。
        return mayExpand() ? result : false
      }
    const load = native.value.onLoad
    if (!load) return undefined
    return async (node: T) => {
      if (!canLoad(load)) return false
      const original = originalLoadNode(node)
      const rawNode = toRaw(original)
      const revision = loadRevision.value
      const mayExpand = retainLoadExpansion(node)
      const pending = pendingLoads.get(rawNode)
      if (pending?.revision === revision) {
        // 原生树在替换根数组时清掉加载标记，只有首个请求可以触发展开。
        return pending.promise.then(
          () => false,
          () => false
        )
      }
      let request: PendingLoad | undefined
      const isCurrent = () =>
        active && loadRevision.value === revision && search.active.value
      try {
        request = { revision, promise: Promise.resolve(load(original)) }
        pendingLoads.set(rawNode, request)
        refreshNativeLoading(rawNode, request)
        const result = await request.promise
        if (isCurrent()) acceptNativeChildren(original, result)
        return isCurrent() && mayExpand() ? result : false
      } catch (error) {
        if (isCurrent()) reportLoadError(error, node, rawNode)
        return false
      } finally {
        if (pendingLoads.get(rawNode) === request) {
          pendingLoads.delete(rawNode)
          refreshNativeLoading(rawNode)
        }
      }
    }
  })
  // Older native virtual lists omit the empty slot; only probe for an empty result.
  // The actual filtered tree and expansion still belong to NTree.
  const hasVisibleNodes = computed(() => {
    if (!treeData.value.length) return false
    if (props.searchSource) return true
    const pattern = currentSearchPattern.value
    if (
      !native.value.virtualScroll ||
      !pattern ||
      native.value.showIrrelevantNodes !== false
    )
      return true
    const normalized = pattern.toLowerCase()
    const filter =
      native.value.filter ??
      ((_pattern: string, node: T) => {
        const label: unknown = Reflect.get(node, labelField.value)
        return (
          typeof label === 'string' && label.toLowerCase().includes(normalized)
        )
      })
    for (const node of index.value.nodes.values())
      if (filter(pattern, node)) return true
    return false
  })
  const treeRef = shallowRef<TreeInst>()
  const density = computed(() => resolveComponentDensity(props.density))
  // 业务节点无需 Naive 的字符串索引签名；仅在原生渲染器边界适配一次。
  const treeBindings = computed<NaiveTreeProps>(
    () =>
      ({
        ...native.value,
        data: treeData.value,
        getChildren,
        virtualScroll: Boolean(
          native.value.virtualScroll && hasVisibleNodes.value
        ),
        keyField: keyField.value,
        labelField: labelField.value,
        childrenField: childrenField.value,
        draggable: mergedConfig.value.draggable,
        showLine: mergedConfig.value.showLine,
        blockLine: native.value.blockLine ?? true,
        blockNode: native.value.blockNode ?? true,
        pattern: props.searchSource ? '' : currentSearchPattern.value,
        expandedKeys: expandedKeys.value,
        selectedKeys: selectedKeys.value,
        checkedKeys: checkedKeys.value,
        renderPrefix,
        renderLabel,
        renderSuffix,
        themeOverrides: {
          nodeHeight:
            props.density === 'compact'
              ? '28px'
              : props.density === 'comfortable'
                ? '40px'
                : '34px',
          nodeWrapperPadding: '0',
          ...native.value.themeOverrides,
        },
        onLoad: handleLoad.value,
        onUpdateExpandedKeys: undefined,
        onUpdateSelectedKeys: undefined,
        onUpdateCheckedKeys: undefined,
        'onUpdate:expandedKeys': handleExpandedKeysChange,
        'onUpdate:selectedKeys': handleSelectedKeysChange,
        'onUpdate:checkedKeys': handleCheckedKeysChange,
        onDrop: (info: DropInfo<T>) => {
          emit('node-drop', info)
          callNative('onDrop', [info])
        },
      }) as unknown as NaiveTreeProps
  )
  const toggleExpandAll = () =>
    isAllExpanded.value ? collapseAll() : expandAll()
  const expandAll = () => {
    handleExpandedKeysChange([...index.value.expandableKeys])
    retainExpandAll.value = true
  }
  const collapseAll = () => {
    loadRevision.value++
    handleExpandedKeysChange([], [], { node: null, action: 'collapse' })
  }
  const handleAdd = () => emit('add')
  const handleRefresh = () => emit('refresh')
  async function previewPaths(
    paths: readonly (readonly T[])[],
    current: () => boolean
  ) {
    if (!paths.length || !current()) return
    const ancestors = new Set(expandedKeys.value)
    for (const path of paths)
      for (const node of path.slice(0, -1))
        ancestors.add(treeSearchKey(node, keyField.value))
    const keys = [...ancestors]
    handleExpandedKeysChange(keys, optionsFor(keys), {
      node: null,
      action: 'filter',
    })
    await nextTick()
    if (current())
      treeRef.value?.scrollTo({
        key: treeSearchKey(paths[0][paths[0].length - 1], keyField.value),
      })
  }
  async function revealPath(path: readonly T[]) {
    if (!path.length) return false
    const keys = path.map(node => treeSearchKey(node, keyField.value))
    const target = keys[keys.length - 1]
    handleExpandedKeysChange([
      ...new Set([...expandedKeys.value, ...keys.slice(0, -1)]),
    ])
    const node = index.value.nodes.get(target)
    if (!node) return false
    if (
      !native.value.disabled &&
      native.value.selectable !== false &&
      !Reflect.get(node, native.value.disabledField ?? 'disabled') &&
      Reflect.get(node, 'selectable') !== false
    )
      handleSelectedKeysChange([target])
    await nextTick()
    treeRef.value?.scrollTo({ key: target })
    return true
  }
  async function locate(key: TreeKey) {
    search.cancelLocate()
    const pending = treeData.value.map(node => ({ node, path: [node] }))
    const seen = new WeakSet<T>()
    for (let i = 0; i < pending.length; i++) {
      const entry = pending[i]
      if (seen.has(entry.node)) continue
      seen.add(entry.node)
      if (Reflect.get(entry.node, keyField.value) === key)
        return search.retainAndReveal(entry.path)
      const children = getChildren(entry.node)
      if (Array.isArray(children))
        for (const node of children)
          pending.push({ node: node as T, path: [...entry.path, node as T] })
    }
    return search.locate(key)
  }
  const expose: Omit<
    TreeExpose<T>,
    | 'expandedKeys'
    | 'selectedKeys'
    | 'checkedKeys'
    | 'searchLoading'
    | 'searchError'
    | 'searchMatchCount'
    | 'searchMatchIndex'
  > & {
    expandedKeys: Ref<TreeKey[]>
    selectedKeys: Ref<TreeKey[]>
    checkedKeys: Ref<TreeKey[]>
    searchLoading: Ref<boolean>
    searchError: Ref<unknown>
    searchMatchCount: Ref<number>
    searchMatchIndex: Ref<number>
  } = {
    expandAll,
    collapseAll,
    selectNode: key => handleSelectedKeysChange([key]),
    clearSelection: () => handleSelectedKeysChange([]),
    setCheckedKeys: keys => handleCheckedKeysChange([...keys]),
    clearChecked: () => handleCheckedKeysChange([]),
    getSelectedNode: () => selectedNode.value,
    getCheckedData: () => {
      const result = treeRef.value?.getCheckedData()
      return result
        ? { keys: result.keys, options: result.options as Array<T | null> }
        : {
            keys: [...checkedKeys.value],
            options: optionsFor(checkedKeys.value),
          }
    },
    getIndeterminateData: () => {
      const result = treeRef.value?.getIndeterminateData()
      return result
        ? { keys: result.keys, options: result.options as Array<T | null> }
        : { keys: [], options: [] }
    },
    scrollTo: (...args: unknown[]) => {
      const scroll = treeRef.value?.scrollTo as
        ((...values: unknown[]) => void) | undefined
      scroll?.(...args)
    },
    locate,
    locateMatch: search.locateMatch,
    nextMatch: search.nextMatch,
    previousMatch: search.previousMatch,
    retrySearch: search.run,
    searchLoading: search.loading,
    searchError: search.error,
    searchMatchCount: computed(() => search.matches.value.length),
    searchMatchIndex: search.matchIndex,
    expandedKeys,
    selectedKeys,
    checkedKeys,
  }
  return {
    internalSearchPattern,
    expandedKeys,
    selectedKeys,
    checkedKeys,
    isAllExpanded,
    treeData,
    search,
    currentSearchPattern,
    renderPrefix,
    renderLabel,
    renderSuffix,
    treeBindings,
    treeRef,
    density,
    toggleExpandAll,
    handleExpandedKeysChange,
    handleSelectedKeysChange,
    handleCheckedKeysChange,
    handleDrop: (info: DropInfo<T>) => emit('node-drop', info),
    handleAdd,
    handleRefresh,
    expose,
  }
}
