/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-02-27 17:25:23
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2026-03-09 10:45:24
 * @FilePath: \Robot_Admind:\project\robot\naive-ui-components\src\components\C_ActionBar\types.ts
 * @Description:
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */
import type { Ref, Directive } from 'vue'
import type { ButtonProps } from 'naive-ui'

export type ActionState = boolean | Ref<boolean> | (() => boolean)

export type ActionButtonType =
  'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'

export type ActionButtonSize = 'tiny' | 'small' | 'medium' | 'large'

export type ActionGroupAlign =
  'left' | 'center' | 'right' | 'space-between' | 'space-around'

export interface ActionDropdownItem {
  key: string
  label: string
  icon?: string
  disabled?: ActionState
  show?: ActionState
  onClick?: () => void | Promise<void>
}

export interface ActionItem {
  key?: string
  /** 内置语义 key 可省略 label、icon 与 type，并自动继承一致的视觉预设。 */
  label?: string
  icon?: string
  type?: ActionButtonType
  size?: ActionButtonSize
  loading?: ActionState
  disabled?: ActionState
  show?: ActionState
  tooltip?: string
  group?: 'left' | 'right'
  dropdown?: ActionDropdownItem[]
  /** Promise 操作默认自动显示 loading 并阻止重复触发。 */
  autoLoading?: boolean
  onClick?: () => void | Promise<void>
  buttonProps?: Partial<ButtonProps>
  directives?: Array<
    | [Directive, any?]
    | [Directive, any, string?]
    | [Directive, any, string?, Record<string, boolean>?]
  >
}

export interface ActionBarConfig {
  align?: ActionGroupAlign
  size?: ActionButtonSize
  gap?: number
  wrap?: boolean
  showDivider?: boolean
  dividerType?: 'vertical' | 'horizontal'
  compact?: boolean
  inline?: boolean
}

export interface TableActionsProps {
  actions?: ActionItem[]
  leftActions?: ActionItem[]
  rightActions?: ActionItem[]
  config?: ActionBarConfig
}

export interface TableActionsEmits {
  (e: 'action-click', action: ActionItem): void
  (e: 'dropdown-click', item: ActionDropdownItem, action: ActionItem): void
}
