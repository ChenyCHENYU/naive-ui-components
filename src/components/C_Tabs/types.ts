import type { CSSProperties, VNodeChild } from 'vue'

export type TabsValue = string | number
export type TabsType = 'line' | 'card' | 'bar' | 'segment'
export type TabsSize = 'small' | 'medium' | 'large'
export type TabsPlacement = 'top' | 'right' | 'bottom' | 'left'
export type TabsJustifyContent =
  'start' | 'end' | 'center' | 'space-around' | 'space-between'
export type TabsDisplayDirective = 'if' | 'show' | 'show:lazy'
export type TabsBadgeType = 'default' | 'error' | 'info' | 'success' | 'warning'

export interface TabsItem {
  key: TabsValue
  label: string
  icon?: string
  badge?: string | number
  badgeType?: TabsBadgeType
  disabled?: boolean
  closable?: boolean
  /** 数据驱动的标签渲染；常规场景只传 label/icon/badge。 */
  renderTab?: (item: TabsItem) => VNodeChild
  /** 数据驱动的内容渲染；复杂页面也可以改用 pane 或 pane-{key} 插槽。 */
  render?: (item: TabsItem) => VNodeChild
}

export interface CTabsProps {
  modelValue?: TabsValue | null
  defaultValue?: TabsValue | null
  items?: readonly TabsItem[]
  type?: TabsType
  size?: TabsSize
  placement?: TabsPlacement
  justifyContent?: TabsJustifyContent
  animated?: boolean
  closable?: boolean
  addable?: boolean
  tabsOnly?: boolean
  displayDirective?: TabsDisplayDirective
  paneClass?: string
  paneStyle?: string | CSSProperties
  beforeChange?: (
    target: TabsValue,
    current: TabsValue | null
  ) => boolean | Promise<boolean>
}

export interface CTabsEmits {
  (event: 'update:modelValue', value: TabsValue): void
  (event: 'change', value: TabsValue, item: TabsItem | undefined): void
  (event: 'close', value: TabsValue): void
  (event: 'add'): void
}
