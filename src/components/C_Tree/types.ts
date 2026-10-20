import type { VNodeChild } from 'vue'
import type {
  TreeProps as NaiveTreeProps,
  TreeInst,
  TreeOption as NaiveTreeOption,
} from 'naive-ui'
import type { ComponentDensity } from '../../core/density'

export type TreeKey = string | number
export type TreeMode = 'menu' | 'file' | 'org' | 'custom'
export type StatusType = 'success' | 'warning' | 'error' | 'info'
export type ButtonType = 'primary' | 'info' | 'warning' | 'error' | 'default'

/** Custom fields are allowed; keyField/labelField select the actual identity and label. */
export interface TreeOption extends NaiveTreeOption {
  id?: TreeKey
  children?: TreeOption[]
}
export interface TreeNodeData extends TreeOption {
  name?: string
  type?: string
  children?: TreeNodeData[]
}
export interface DropInfo<T extends object = TreeOption> {
  node: T
  dragNode: T
  dropPosition: 'before' | 'inside' | 'after'
  event: DragEvent
}
export interface StatusConfig {
  field: string
  values: Record<string | number, { text: string; type: StatusType }>
}
export interface ActionConfig<T extends object = TreeNodeData> {
  key: string
  text: string
  icon: string
  type?: ButtonType
  show?: (node: T) => boolean
  confirm?: string
}
export interface IconConfig {
  default?: string
  typeMap?: Record<string, string>
  colorMap?: Record<string, string>
}
type MaybeArray<T> = T | T[]
type TreeUpdateHandler<T extends object, A extends TreeUpdateMeta['action']> = (
  keys: TreeKey[],
  options: Array<T | null>,
  meta: TreeUpdateMeta<T, A>
) => void
type TreeDragHandler<T extends object> = (info: {
  node: T
  event: DragEvent
}) => void

/** 原生功能保持透传，涉及节点的回调由数据源推导业务类型。 */
export type TreeNativeProps<T extends object = TreeNodeData> = Omit<
  NaiveTreeProps,
  | 'data'
  | 'filter'
  | 'onLoad'
  | 'getChildren'
  | 'renderLabel'
  | 'renderPrefix'
  | 'renderSuffix'
  | 'renderSwitcherIcon'
  | 'nodeProps'
  | 'allowDrop'
  | 'checkOnClick'
  | 'overrideDefaultNodeClickBehavior'
  | 'onDrop'
  | 'onDragenter'
  | 'onDragleave'
  | 'onDragend'
  | 'onDragstart'
  | 'onDragover'
  | 'onUpdateExpandedKeys'
  | 'onUpdate:expandedKeys'
  | 'onUpdateSelectedKeys'
  | 'onUpdate:selectedKeys'
  | 'onUpdateCheckedKeys'
  | 'onUpdate:checkedKeys'
  | 'onUpdateIndeterminateKeys'
  | 'onUpdate:indeterminateKeys'
> & {
  filter?: (pattern: string, node: T) => boolean
  onLoad?: (node: T) => Promise<unknown>
  getChildren?: (node: T) => unknown
  renderLabel?: (context: TreeRenderContext<T>) => VNodeChild
  renderPrefix?: (context: TreeRenderContext<T>) => VNodeChild
  renderSuffix?: (context: TreeRenderContext<T>) => VNodeChild
  renderSwitcherIcon?: (context: {
    expanded: boolean
    selected: boolean
    option: T
  }) => VNodeChild
  nodeProps?: (context: {
    option: T
  }) => ReturnType<NonNullable<NaiveTreeProps['nodeProps']>>
  allowDrop?: (info: {
    dropPosition: DropInfo['dropPosition']
    node: T
    phase: 'drag' | 'drop'
  }) => boolean
  checkOnClick?: boolean | ((node: T) => boolean)
  overrideDefaultNodeClickBehavior?: (info: {
    option: T
  }) => ReturnType<
    NonNullable<NaiveTreeProps['overrideDefaultNodeClickBehavior']>
  >
  onDrop?: MaybeArray<(info: DropInfo<T>) => void>
  onDragenter?: MaybeArray<TreeDragHandler<T>>
  onDragleave?: MaybeArray<TreeDragHandler<T>>
  onDragend?: MaybeArray<TreeDragHandler<T>>
  onDragstart?: MaybeArray<TreeDragHandler<T>>
  onDragover?: MaybeArray<TreeDragHandler<T>>
  onUpdateExpandedKeys?: MaybeArray<
    TreeUpdateHandler<T, 'expand' | 'collapse' | 'filter'>
  >
  'onUpdate:expandedKeys'?: MaybeArray<
    TreeUpdateHandler<T, 'expand' | 'collapse' | 'filter'>
  >
  onUpdateSelectedKeys?: MaybeArray<TreeUpdateHandler<T, 'select' | 'unselect'>>
  'onUpdate:selectedKeys'?: MaybeArray<
    TreeUpdateHandler<T, 'select' | 'unselect'>
  >
  onUpdateCheckedKeys?: MaybeArray<TreeUpdateHandler<T, 'check' | 'uncheck'>>
  'onUpdate:checkedKeys'?: MaybeArray<TreeUpdateHandler<T, 'check' | 'uncheck'>>
  onUpdateIndeterminateKeys?: MaybeArray<
    (keys: TreeKey[], options: Array<T | null>) => void
  >
  'onUpdate:indeterminateKeys'?: MaybeArray<
    (keys: TreeKey[], options: Array<T | null>) => void
  >
}
export interface TreeRenderContext<T extends object = TreeOption> {
  option: T
  checked: boolean
  selected: boolean
}
export interface TreeUpdateMeta<
  T extends object = TreeOption,
  A extends
    | 'select'
    | 'unselect'
    | 'check'
    | 'uncheck'
    | 'expand'
    | 'collapse'
    | 'filter' =
    | 'select'
    | 'unselect'
    | 'check'
    | 'uncheck'
    | 'expand'
    | 'collapse'
    | 'filter',
> {
  node: T | null
  action: A
}
export interface TreeProps<T extends object = TreeNodeData> {
  /** Business interfaces need no string index signature; fields are selected by config. */
  data: readonly T[]
  mode?: TreeMode
  /** Native tree capabilities; explicit wrapper props have priority. */
  treeProps?: TreeNativeProps<T>
  density?: ComponentDensity
  keyField?: string
  labelField?: string
  childrenField?: string
  searchPattern?: string
  searchable?: boolean
  searchPlaceholder?: string
  draggable?: boolean
  showLine?: boolean
  showToolbar?: boolean
  addable?: boolean
  addText?: string
  refreshable?: boolean
  iconField?: string
  iconConfig?: IconConfig
  statusConfigs?: StatusConfig[]
  actions?: ActionConfig<T>[]
  defaultExpandAll?: boolean
  defaultExpandedKeys?: TreeKey[]
  defaultSelectedKeys?: TreeKey[]
  defaultCheckedKeys?: TreeKey[]
  expandedKeys?: TreeKey[]
  selectedKeys?: TreeKey[]
  checkedKeys?: TreeKey[]
}
export interface TreeExpose<T extends object = TreeNodeData> {
  expandAll: () => void
  collapseAll: () => void
  selectNode: (key: TreeKey) => void
  clearSelection: () => void
  setCheckedKeys: (keys: TreeKey[]) => void
  clearChecked: () => void
  getSelectedNode: () => T | null
  getCheckedData: () => { keys: TreeKey[]; options: Array<T | null> }
  getIndeterminateData: () => { keys: TreeKey[]; options: Array<T | null> }
  scrollTo: TreeInst['scrollTo']
  /** Vue 公开实例会解包顶层 Ref；这些属性直接读取数组。 */
  expandedKeys: TreeKey[]
  selectedKeys: TreeKey[]
  checkedKeys: TreeKey[]
}
export interface TreeEmits<T extends object = TreeNodeData> {
  'update:searchPattern': [pattern: string]
  'update:expandedKeys': [
    keys: TreeKey[],
    options: Array<T | null>,
    meta: TreeUpdateMeta<T>,
  ]
  'update:selectedKeys': [
    keys: TreeKey[],
    options: Array<T | null>,
    meta: TreeUpdateMeta<T>,
  ]
  'update:checkedKeys': [
    keys: TreeKey[],
    options: Array<T | null>,
    meta: TreeUpdateMeta<T>,
  ]
  'node-select': [node: T | null, selectedKeys: TreeKey[]]
  'node-action': [action: string, node: T]
  'node-drop': [info: DropInfo<T>]
  'load-error': [error: unknown, node: T]
  add: [parentNode?: T]
  refresh: []
}
export interface TreeSlots<T extends object = TreeOption> {
  'toolbar-actions'?: () => VNodeChild
  label?: (context: TreeRenderContext<T>) => VNodeChild
  prefix?: (context: TreeRenderContext<T>) => VNodeChild
  suffix?: (context: TreeRenderContext<T>) => VNodeChild
  empty?: () => VNodeChild
}
