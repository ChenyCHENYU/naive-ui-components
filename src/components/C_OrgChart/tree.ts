import type { OrgChartKey, OrgChartProps } from './types'

/** 内部视图只保存显示信息和原节点引用，不改写使用侧数据。 */
export interface OrgChartEntry<T extends object> {
  key: OrgChartKey
  node: T
  label: string
  subtitle: string
  avatar: string
  className: string
  collapsed: boolean
  parent: OrgChartEntry<T> | null
  children: OrgChartEntry<T>[]
}

const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''

const readKey = (node: object, field: string): OrgChartKey | null => {
  const key: unknown = Reflect.get(node, field)
  return typeof key === 'string' ||
    (typeof key === 'number' && Number.isFinite(key))
    ? key
    : null
}

/** 建立原始节点索引和轻量显示投影，拒绝循环与重复身份。 */
export function buildOrgChartIndex<T extends object>(props: OrgChartProps<T>) {
  const {
    keyField = 'id',
    labelField = 'label',
    childrenField = 'children',
    subtitleField = 'subtitle',
    avatarField = 'avatar',
  } = props
  const nodes = new Map<OrgChartKey, OrgChartEntry<T>>()
  const seen = new Set<object>()
  const visit = (
    node: T,
    parent: OrgChartEntry<T> | null
  ): OrgChartEntry<T> | null => {
    if (seen.has(node)) return null
    seen.add(node)
    const key = readKey(node, keyField)
    if (key === null || nodes.has(key)) return null
    const entry: OrgChartEntry<T> = {
      key,
      node,
      parent,
      label: text(Reflect.get(node, labelField)),
      subtitle: text(Reflect.get(node, subtitleField)),
      avatar: text(Reflect.get(node, avatarField)),
      className: text(Reflect.get(node, 'className')),
      collapsed: Reflect.get(node, 'collapsed') === true,
      children: [],
    }
    nodes.set(key, entry)
    const children: unknown = Reflect.get(node, childrenField)
    if (Array.isArray(children)) {
      for (const child of children) {
        if (typeof child !== 'object' || child === null) continue
        // 字段映射约定各级同构；只在此数据边界恢复业务节点类型。
        const item = visit(child as T, entry)
        if (item) entry.children.push(item)
      }
    }
    return entry
  }
  const root = visit(props.data, null)
  return { root, nodes }
}
