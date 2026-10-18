import {
  ref,
  computed,
  h,
  watch,
  getCurrentScope,
  onScopeDispose,
  shallowRef,
  toRaw,
} from 'vue'
import {
  NTag,
  NButton,
  NPopconfirm,
  type TreeInst,
  type TreeProps as NaiveTreeProps,
} from 'naive-ui'
import C_Icon from '../../C_Icon/index.vue'
import { presetConfigs } from '../data'
import { indexTreeNodes } from '../treeKeys'
import { resolveComponentDensity } from '../../../core/density'
import type {
  TreeOption,
  TreeNodeData,
  TreeProps,
  TreeExpose,
  TreeEmits,
  DropInfo,
  TreeKey,
  TreeUpdateMeta,
  TreeRenderContext,
  TreeSlots,
} from '../types'

type EmitFn = <E extends keyof TreeEmits>(
  event: E,
  ...args: TreeEmits[E]
) => void

/** State coordination only; checking, filtering, keyboard and loading stay native. */
export function useTreeOperations(
  props: TreeProps,
  emit: EmitFn,
  slots: TreeSlots = {}
) {
  const native = computed(() => props.treeProps ?? {})
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
    actions: props.actions ?? preset.value.actions ?? [],
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
  const index = computed(() =>
    indexTreeNodes(
      props.data,
      keyField.value,
      childrenField.value,
      native.value.getChildren
    )
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
    meta: TreeUpdateMeta = { node: null, action: 'expand' }
  ) => {
    if (meta.action !== 'filter') retainExpandAll.value = false
    internalExpanded.value = [...keys]
    emit('update:expandedKeys', keys, options, meta)
    callNative('onUpdateExpandedKeys', [keys, options, meta])
    callNative('onUpdate:expandedKeys', [keys, options, meta])
  }
  const handleSelectedKeysChange = (
    keys: TreeKey[],
    options = optionsFor(keys),
    meta: TreeUpdateMeta = {
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
    meta: TreeUpdateMeta = {
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
  const renderPrefix = (info: TreeRenderContext) => {
    if (slots.prefix) return slots.prefix(info)
    if (native.value.renderPrefix) return native.value.renderPrefix(info)
    if (typeof info.option.prefix === 'function') return info.option.prefix()
    const node = info.option
    const config = mergedConfig.value.iconConfig
    const type = typeof node.type === 'string' ? node.type : ''
    const icon = node[props.iconField ?? 'icon']
    return h(C_Icon, {
      name:
        typeof icon === 'string'
          ? icon
          : (config.typeMap[type] ?? config.default),
      size: 16,
      color: config.colorMap[type] ?? 'currentColor',
      class: 'c-tree-node-icon',
    })
  }
  const renderLabel = (info: TreeRenderContext) => {
    if (slots.label) return slots.label(info)
    if (native.value.renderLabel) return native.value.renderLabel(info)
    const text = String(info.option[labelField.value] ?? '')
    return h('span', { class: 'c-tree-node-label' }, [
      h('span', { class: 'c-tree-node-title', title: text }, text),
      ...(props.statusConfigs ?? []).flatMap(config => {
        const value = info.option[config.field]
        const status =
          typeof value === 'number' || typeof value === 'string'
            ? config.values[value]
            : undefined
        return status?.text
          ? [
              h(
                NTag,
                {
                  type: status.type,
                  size: 'small',
                  class: 'c-tree-node-status',
                },
                { default: () => status.text }
              ),
            ]
          : []
      }),
    ])
  }
  const handleNodeAction = (action: string, node: TreeNodeData) => {
    if (action === 'add') emit('add', node)
    else emit('node-action', action, node)
  }
  const renderSuffix = (info: TreeRenderContext) => {
    if (slots.suffix) return slots.suffix(info)
    if (native.value.renderSuffix) return native.value.renderSuffix(info)
    if (typeof info.option.suffix === 'function') return info.option.suffix()
    const node = info.option
    const actions = mergedConfig.value.actions.filter(
      action => !action.show || action.show(node)
    )
    if (!actions.length) return null
    return h(
      'span',
      {
        class: 'tree-actions',
        onClick: (event: Event) => event.stopPropagation(),
      },
      actions.map(action => {
        const button = (confirm: boolean) =>
          h(
            NButton,
            {
              size: 'tiny',
              type: action.type ?? 'default',
              quaternary: true,
              disabled: Boolean(
                native.value.disabled ||
                node[native.value.disabledField ?? 'disabled']
              ),
              'aria-label': action.text || action.key,
              title: action.text,
              onClick: (event: Event) => {
                event.stopPropagation()
                if (!confirm) handleNodeAction(action.key, node)
              },
            },
            { icon: () => h(C_Icon, { name: action.icon, size: 14 }) }
          )
        return action.confirm
          ? h(
              NPopconfirm,
              { onPositiveClick: () => handleNodeAction(action.key, node) },
              { trigger: () => button(true), default: () => action.confirm }
            )
          : button(false)
      })
    )
  }
  let active = true
  if (getCurrentScope())
    onScopeDispose(() => {
      active = false
    })
  const handleLoad = computed(() => {
    const load = native.value.onLoad
    if (!load) return undefined
    return async (node: TreeOption) => {
      try {
        return await load(node)
      } catch (error) {
        const key = node[keyField.value]
        const current =
          typeof key === 'string' || typeof key === 'number'
            ? index.value.nodes.get(key)
            : undefined
        if (active && current && toRaw(current) === toRaw(node))
          emit('load-error', error, node)
        return false
      }
    }
  })
  // Older native virtual lists omit the empty slot; only probe for an empty result.
  // The actual filtered tree and expansion still belong to NTree.
  const hasVisibleNodes = computed(() => {
    if (!props.data.length) return false
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
      ((_pattern: string, node: TreeOption) => {
        const label = node[labelField.value]
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
  const treeBindings = computed<NaiveTreeProps>(() => ({
    ...native.value,
    // Native indexing accepts ordinary objects at runtime; keep this bridge internal.
    data: props.data as TreeNodeData[],
    virtualScroll: Boolean(native.value.virtualScroll && hasVisibleNodes.value),
    keyField: keyField.value,
    labelField: labelField.value,
    childrenField: childrenField.value,
    draggable: mergedConfig.value.draggable,
    showLine: mergedConfig.value.showLine,
    blockLine: native.value.blockLine ?? true,
    blockNode: native.value.blockNode ?? true,
    pattern: currentSearchPattern.value,
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
    onDrop: (info: DropInfo) => {
      emit('node-drop', info)
      callNative('onDrop', [info])
    },
  }))
  const toggleExpandAll = () =>
    isAllExpanded.value ? collapseAll() : expandAll()
  const expandAll = () => {
    handleExpandedKeysChange([...index.value.expandableKeys])
    retainExpandAll.value = true
  }
  const collapseAll = () =>
    handleExpandedKeysChange([], [], { node: null, action: 'collapse' })
  const handleAdd = () => emit('add')
  const handleRefresh = () => emit('refresh')
  const expose: TreeExpose = {
    expandAll,
    collapseAll,
    selectNode: key => handleSelectedKeysChange([key]),
    clearSelection: () => handleSelectedKeysChange([]),
    setCheckedKeys: keys => handleCheckedKeysChange([...keys]),
    clearChecked: () => handleCheckedKeysChange([]),
    getSelectedNode: () => selectedNode.value,
    getCheckedData: () =>
      treeRef.value?.getCheckedData() ?? {
        keys: [...checkedKeys.value],
        options: optionsFor(checkedKeys.value),
      },
    getIndeterminateData: () =>
      treeRef.value?.getIndeterminateData() ?? { keys: [], options: [] },
    scrollTo: (...args: unknown[]) => {
      const scroll = treeRef.value?.scrollTo as
        ((...values: unknown[]) => void) | undefined
      scroll?.(...args)
    },
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
    treeData: computed(() => props.data),
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
    handleDrop: (info: DropInfo) => emit('node-drop', info),
    handleAdd,
    handleRefresh,
    expose,
  }
}
