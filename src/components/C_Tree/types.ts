import type { Ref, VNodeChild } from 'vue'
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
export interface DropInfo {
  node: TreeOption
  dragNode: TreeOption
  dropPosition: 'before' | 'inside' | 'after'
  event: DragEvent
}
export interface StatusConfig {
  field: string
  values: Record<string | number, { text: string; type: StatusType }>
}
export interface ActionConfig {
  key: string
  text: string
  icon: string
  type?: ButtonType
  show?: (node: TreeNodeData) => boolean
  confirm?: string
}
export interface IconConfig {
  default?: string
  typeMap?: Record<string, string>
  colorMap?: Record<string, string>
}
export type TreeNativeProps = Omit<NaiveTreeProps, 'data'>
export interface TreeRenderContext {
  option: TreeOption
  checked: boolean
  selected: boolean
}
export interface TreeUpdateMeta {
  node: TreeOption | null
  action:
    | 'select'
    | 'unselect'
    | 'check'
    | 'uncheck'
    | 'expand'
    | 'collapse'
    | 'filter'
}
export interface TreeProps {
  /** Business interfaces need no string index signature; fields are selected by config. */
  data: object[]
  mode?: TreeMode
  /** Native tree capabilities; explicit wrapper props have priority. */
  treeProps?: TreeNativeProps
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
  actions?: ActionConfig[]
  defaultExpandAll?: boolean
  defaultExpandedKeys?: TreeKey[]
  defaultSelectedKeys?: TreeKey[]
  defaultCheckedKeys?: TreeKey[]
  expandedKeys?: TreeKey[]
  selectedKeys?: TreeKey[]
  checkedKeys?: TreeKey[]
}
export interface TreeExpose {
  expandAll: () => void
  collapseAll: () => void
  selectNode: (key: TreeKey) => void
  clearSelection: () => void
  setCheckedKeys: (keys: TreeKey[]) => void
  clearChecked: () => void
  getSelectedNode: () => TreeNodeData | null
  getCheckedData: TreeInst['getCheckedData']
  getIndeterminateData: TreeInst['getIndeterminateData']
  scrollTo: TreeInst['scrollTo']
  expandedKeys: Ref<TreeKey[]>
  selectedKeys: Ref<TreeKey[]>
  checkedKeys: Ref<TreeKey[]>
}
export interface TreeEmits {
  'update:searchPattern': [pattern: string]
  'update:expandedKeys': [
    keys: TreeKey[],
    options: Array<TreeOption | null>,
    meta: TreeUpdateMeta,
  ]
  'update:selectedKeys': [
    keys: TreeKey[],
    options: Array<TreeOption | null>,
    meta: TreeUpdateMeta,
  ]
  'update:checkedKeys': [
    keys: TreeKey[],
    options: Array<TreeOption | null>,
    meta: TreeUpdateMeta,
  ]
  'node-select': [node: TreeNodeData | null, selectedKeys: TreeKey[]]
  'node-action': [action: string, node: TreeNodeData]
  'node-drop': [info: DropInfo]
  'load-error': [error: unknown, node: TreeOption]
  add: [parentNode?: TreeNodeData]
  refresh: []
}
export interface TreeSlots {
  'toolbar-actions'?: () => VNodeChild
  label?: (context: TreeRenderContext) => VNodeChild
  prefix?: (context: TreeRenderContext) => VNodeChild
  suffix?: (context: TreeRenderContext) => VNodeChild
  empty?: () => VNodeChild
}
