import type { DropdownProps, MenuInst, MenuOption } from 'naive-ui'
import type { MenuAdapterConfig, RouteItem } from '../_shared/public'

export type MenuKey = string | number
export type MenuValue = MenuKey | null

type OwnMenuKey<Option> = Option extends { key?: infer Key }
  ? Extract<Key, MenuKey>
  : never

/** 已遇到的递归业务类型或原生完整键类型均停止展开，内联配置包含子节点。 */
type MenuOptionKeys<Option, Seen = never> = Option extends Seen
  ? OwnMenuKey<Option>
  : MenuKey extends OwnMenuKey<Option>
    ? MenuKey
    : | OwnMenuKey<Option>
      | (Option extends { children?: infer Children }
          ? Children extends readonly unknown[]
            ? MenuOptionKeys<Children[number], Seen | Option>
            : never
          : never)

type WidenMenuKey<Key> = Key extends string
  ? string
  : Key extends number
    ? number
    : never

export type MenuSelectionKey<O extends MenuOption[] | undefined> =
  O extends MenuOption[]
    ? [MenuOptionKeys<O[number]>] extends [never]
      ? MenuKey
      : WidenMenuKey<MenuOptionKeys<O[number]>>
    : string

export interface MenuProps<
  O extends MenuOption[] | undefined = MenuOption[] | undefined,
> {
  options?: O
  routes?: RouteItem[]
  adapterConfig?: MenuAdapterConfig
  labelFormatter?: (label: string) => string
  /** @deprecated Use modelValue. */
  value?: MenuValue
  modelValue?: MenuValue
  expandedKeys?: MenuKey[]
  defaultExpandedKeys?: MenuKey[]
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

export interface MenuEmits<
  O extends MenuOption[] | undefined = MenuOption[] | undefined,
> {
  select: [key: MenuSelectionKey<O>]
  /** 鼠标或键盘聚焦叶子项时触发，可用于无副作用的路由预取。 */
  intent: [key: MenuSelectionKey<O>]
  'update:modelValue': [key: MenuSelectionKey<O> | null]
  /** @deprecated Use update:modelValue. */
  'update:value': [key: MenuSelectionKey<O> | null]
  'update:expandedKeys': [keys: MenuSelectionKey<O>[]]
}

export interface MenuExpose {
  showOption: (key: MenuKey) => void
  /** Vue 公开实例会解包顶层 Ref。 */
  menuRef: MenuInst | null
}
