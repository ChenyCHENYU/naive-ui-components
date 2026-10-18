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
  /** 动作建议使用稳定 key；重复 key 共享执行锁，无 key 时按所在分组和位置识别。 */
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
  /** 是否自动显示 loading；执行期间始终阻止同 key 动作重复触发。 */
  autoLoading?: boolean
  onClick?: () => void | Promise<void>
  /** 视觉属性透传。disabled/loading 与动作状态合并；onClick 作为原生点击观察者保留。 */
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
  /** 按钮间距；省略时紧凑模式为 6px，常规模式为 12px。 */
  gap?: number
  /** 允许分组及组内按钮随可用宽度换行。 */
  wrap?: boolean
  showDivider?: boolean
  dividerType?: 'vertical' | 'horizontal'
  /** 减少容器留白和默认按钮间距；行内模式也生效。 */
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
  /** 执行失败通知；错误继续交给 Vue 的错误处理边界。 */
  (
    e: 'action-error',
    error: unknown,
    action: ActionItem,
    item?: ActionDropdownItem
  ): void
}
