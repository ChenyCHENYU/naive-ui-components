import type { Ref } from 'vue'
import type { DropdownProps, MenuInst, MenuOption } from 'naive-ui/es'
import type { MenuAdapterConfig, RouteItem } from '../_shared'

export type MenuValue = string | null

export interface MenuProps {
  options?: MenuOption[]
  routes?: RouteItem[]
  adapterConfig?: MenuAdapterConfig
  labelFormatter?: (label: string) => string
  /** @deprecated Use modelValue. */
  value?: MenuValue
  modelValue?: MenuValue
  expandedKeys?: string[]
  defaultExpandedKeys?: string[]
  mode?: 'vertical' | 'horizontal'
  collapsed?: boolean
  collapsedWidth?: number
  collapsedIconSize?: number
  inverted?: boolean
  themeOverrides?: Record<string, any>
  indent?: number
  rootIndent?: number
  dropdownProps?: DropdownProps
}

export interface MenuEmits {
  select: [key: string]
  'update:modelValue': [key: MenuValue]
  /** @deprecated Use update:modelValue. */
  'update:value': [key: MenuValue]
  'update:expandedKeys': [keys: string[]]
}

export interface MenuExpose {
  showOption: (key: string) => void
  menuRef: Ref<MenuInst | null>
}
