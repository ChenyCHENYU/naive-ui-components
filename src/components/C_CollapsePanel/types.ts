import type { Component } from 'vue'

export type CollapsePanelVariant = 'default' | 'card' | 'ghost'
export type ExpandIconPosition = 'left' | 'right'

export interface CollapsePanelItem {
  key: string
  title: string
  subtitle?: string
  icon?: string
  disabled?: boolean
  lazy?: boolean
  destroyOnCollapse?: boolean
  /** 面板内容：字符串直接渲染为文本，组件引用则动态挂载；插槽优先级高于此属性 */
  content?: string | Component
}

export interface CollapsePanelProps {
  items: CollapsePanelItem[]
  activeKeys?: string[]
  defaultActiveKeys?: string[]
  accordion?: boolean
  variant?: CollapsePanelVariant
  expandIconPosition?: ExpandIconPosition
  bordered?: boolean
  persistKey?: string
}

export interface CollapsePanelExpose {
  expandAll: () => void
  collapseAll: () => void
  toggle: (key: string) => void
  getActiveKeys: () => string[]
  scrollToPanel: (key: string) => void
}

export interface CollapsePanelEmits {
  'update:activeKeys': [keys: string[]]
  expand: [key: string]
  collapse: [key: string]
  change: [activeKeys: string[]]
}
