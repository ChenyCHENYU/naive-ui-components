/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-09-13
 * @FilePath: \naive-ui-components\src\components\C_ActionBar\presets.ts
 * @Description: C_ActionBar 语义动作预设与响应式状态解析
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import { unref } from 'vue'
import type { ActionBarConfig, ActionItem, ActionState } from './types'

/** 未命中语义预设时使用的中性图标，保证操作按钮默认都有清晰入口。 */
export const DEFAULT_ACTION_ICON = 'mdi:gesture-tap-button'

/**
 * 操作栏默认服务于表格和高频业务工具区，因此采用最紧凑规格。
 * 使用侧仍可通过 config 或单个 action 覆盖尺寸。
 */
export const ACTION_BAR_DEFAULT_CONFIG: Readonly<Required<ActionBarConfig>> = {
  align: 'left',
  size: 'tiny',
  gap: 6,
  wrap: false,
  showDivider: false,
  dividerType: 'vertical',
  compact: true,
  inline: true,
}

export const ACTION_PRESETS: Readonly<
  Record<string, Pick<ActionItem, 'label' | 'icon' | 'type'>>
> = {
  add: { label: '新增', icon: 'mdi:plus', type: 'primary' },
  create: { label: '新增', icon: 'mdi:plus', type: 'primary' },
  save: { label: '保存', icon: 'mdi:content-save-outline', type: 'primary' },
  confirm: { label: '确认', icon: 'mdi:check', type: 'primary' },
  cancel: { label: '取消', icon: 'mdi:close' },
  close: { label: '关闭', icon: 'mdi:close' },
  view: { label: '查看', icon: 'mdi:eye-outline' },
  edit: { label: '编辑', icon: 'mdi:pencil-outline' },
  delete: { label: '删除', icon: 'mdi:delete-outline', type: 'error' },
  remove: { label: '删除', icon: 'mdi:delete-outline', type: 'error' },
  refresh: { label: '刷新', icon: 'mdi:refresh' },
  import: { label: '导入', icon: 'mdi:file-import-outline' },
  export: { label: '导出', icon: 'mdi:file-export-outline' },
  print: { label: '打印', icon: 'mdi:printer-outline' },
  reset: { label: '重置', icon: 'mdi:restore' },
  columns: { label: '列设置', icon: 'mdi:view-column-outline' },
  fullscreen: { label: '全屏', icon: 'mdi:fullscreen' },
  settings: { label: '功能配置', icon: 'mdi:tune-variant' },
  more: { label: '更多', icon: 'mdi:dots-horizontal' },
}

export const resolveActionPreset = (action: ActionItem): ActionItem => {
  const preset = action.key ? ACTION_PRESETS[action.key] : undefined

  return {
    ...preset,
    ...action,
    label: action.label || preset?.label || action.key || '操作',
    icon: action.icon || preset?.icon || DEFAULT_ACTION_ICON,
  }
}

export const resolveActionState = (
  state: ActionState | undefined
): boolean | undefined => (typeof state === 'function' ? state() : unref(state))

/** 保留动作字面量推导，使用侧无需重复声明 ActionItem[]。 */
export const defineActions = <const T extends ActionItem[]>(actions: T): T =>
  actions
