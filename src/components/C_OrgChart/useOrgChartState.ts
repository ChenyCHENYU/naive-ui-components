import { computed, shallowRef, watch } from 'vue'
import type { OrgChartKey, OrgChartProps } from './types'
import { buildOrgChartIndex, type OrgChartEntry } from './tree'

interface StateEvents<T extends object> {
  select: (key: OrgChartKey, node: T) => void
  expand: (keys: OrgChartKey[], node: T) => void
  toggle: (expanded: boolean, node: T) => void
}

/** 将可选受控状态与旧 collapsed 默认行为集中管理。 */
export function useOrgChartState<T extends object>(
  props: OrgChartProps<T>,
  events: StateEvents<T>
) {
  const index = computed(() => buildOrgChartIndex(props))
  const localSelected = shallowRef<OrgChartKey | null>(
    props.defaultSelectedKey ?? null
  )
  const explicitDefault = props.defaultExpandedKeys !== undefined
  const localExpanded = shallowRef<ReadonlySet<OrgChartKey>>(
    new Set(props.defaultExpandedKeys)
  )
  let previousCollapsed = new Map<OrgChartKey, boolean>()
  watch(
    index,
    current => {
      const next = new Set<OrgChartKey>()
      const collapsed = new Map<OrgChartKey, boolean>()
      for (const [key, entry] of current.nodes) {
        collapsed.set(key, entry.collapsed)
        const useNodeDefault =
          !explicitDefault &&
          (!previousCollapsed.has(key) ||
            previousCollapsed.get(key) !== entry.collapsed)
        if (useNodeDefault ? !entry.collapsed : localExpanded.value.has(key))
          next.add(key)
      }
      localExpanded.value = next
      previousCollapsed = collapsed
      if (
        localSelected.value !== null &&
        !current.nodes.has(localSelected.value)
      )
        localSelected.value = null
    },
    { immediate: true }
  )
  const selectedKey = computed(() =>
    props.selectedKey === undefined ? localSelected.value : props.selectedKey
  )
  const expandedKeys = computed<ReadonlySet<OrgChartKey>>(() =>
    props.expandedKeys === undefined
      ? localExpanded.value
      : new Set(props.expandedKeys)
  )

  const select = (entry: OrgChartEntry<T>, force = false) => {
    // 旧版只有点击事件；显式配置选择态或调用 locate 才启用高亮。
    if (
      !force &&
      props.selectedKey === undefined &&
      props.defaultSelectedKey === undefined &&
      localSelected.value === null
    )
      return
    if (props.selectedKey === undefined) localSelected.value = entry.key
    events.select(entry.key, entry.node)
  }
  const updateExpanded = (keys: Set<OrgChartKey>, node: T) => {
    if (props.expandedKeys === undefined) localExpanded.value = keys
    events.expand([...keys], node)
  }
  const toggle = (entry: OrgChartEntry<T>) => {
    const keys = new Set(expandedKeys.value)
    const expanded = !keys.has(entry.key)
    if (expanded) keys.add(entry.key)
    else keys.delete(entry.key)
    updateExpanded(keys, entry.node)
    events.toggle(expanded, entry.node)
  }
  const expandAncestors = (entry: OrgChartEntry<T>) => {
    const ancestors: OrgChartEntry<T>[] = []
    let current = entry
    while (current.parent) {
      const { parent } = current
      ancestors.unshift(parent)
      current = parent
    }
    const missing = ancestors.filter(item => !expandedKeys.value.has(item.key))
    if (!missing.length) return
    const keys = new Set(expandedKeys.value)
    for (const ancestor of missing) keys.add(ancestor.key)
    updateExpanded(keys, entry.node)
    for (const ancestor of missing) events.toggle(true, ancestor.node)
  }
  const getNode = (key: OrgChartKey) => index.value.nodes.get(key)?.node ?? null
  return {
    index,
    selectedKey,
    expandedKeys,
    select,
    toggle,
    expandAncestors,
    getNode,
  }
}
