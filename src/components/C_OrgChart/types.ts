/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_OrgChart 组织架构图组件类型定义
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { VNodeChild } from 'vue'

export type OrgChartKey = string | number

/** 默认节点格式；业务节点可直接通过 data 推导，不必继承此接口。 */
export interface OrgChartNode {
  /** 唯一标识 */
  id: string | number
  /** 节点标题（姓名/部门名） */
  label: string
  /** 副标题（职位/描述） */
  subtitle?: string
  /** 头像 URL */
  avatar?: string
  /** 子节点 */
  children?: OrgChartNode[]
  /** 自定义 CSS 类 */
  className?: string
  /** 节点是否默认折叠 */
  collapsed?: boolean
  /** 节点额外数据（透传给插槽/事件） */
  data?: Record<string, unknown>
}

/** 布局方向 */
export type OrgChartDirection = 'vertical' | 'horizontal'

/** 连线样式 */
export type OrgChartLineStyle = 'straight' | 'rounded' | 'stepped'

/** C_OrgChart Props */
export interface OrgChartProps<T extends object = OrgChartNode> {
  /** 树形数据 */
  data: T
  /** 默认 id。各节点的键必须唯一，数字 0 是有效键。 */
  keyField?: keyof T & string
  /** 默认 label。 */
  labelField?: keyof T & string
  /** 默认 children；各级子项使用同一业务节点格式。 */
  childrenField?: keyof T & string
  /** 默认 subtitle。 */
  subtitleField?: keyof T & string
  /** 默认 avatar。 */
  avatarField?: keyof T & string
  /** 受控选择；null 表示清空。未配置选择属性时保留旧版纯点击行为。 */
  selectedKey?: OrgChartKey | null
  defaultSelectedKey?: OrgChartKey | null
  /** 受控展开。未传时由默认值或节点 collapsed 管理，不修改原节点。 */
  expandedKeys?: readonly OrgChartKey[]
  defaultExpandedKeys?: readonly OrgChartKey[]
  /** 布局方向 */
  direction?: OrgChartDirection
  /** 连线样式 */
  lineStyle?: OrgChartLineStyle
  /** 连线颜色 */
  lineColor?: string
  /** 连线宽度（px） */
  lineWidth?: number
  /** 节点间距（px） */
  nodeSpacing?: number
  /** 层级间距（px） */
  levelSpacing?: number
  /** 是否支持缩放 */
  zoomable?: boolean
  /** 是否支持平移 */
  pannable?: boolean
  /** 初始缩放比例 */
  initialZoom?: number
  /** 首次渲染与数据、布局变化时适配完整树形范围。 */
  fitOnInit?: boolean
  /** 最小缩放 */
  minZoom?: number
  /** 最大缩放 */
  maxZoom?: number
  /** 是否可折叠 */
  collapsible?: boolean
}

export interface OrgChartNodeSlotProps<T extends object = OrgChartNode> {
  /** 未包装的原始业务节点。 */
  node: T
  key: OrgChartKey
  isLeaf: boolean
  isExpanded: boolean
  isSelected: boolean
  /** 自定义卡片可给原生按钮绑定此回调，保留键盘与内嵌操作的边界。 */
  select: () => void
  toggle: () => void
}

export interface OrgChartSlots<T extends object = OrgChartNode> {
  node?: (props: OrgChartNodeSlotProps<T>) => VNodeChild
}

export interface OrgChartEmits<T extends object = OrgChartNode> {
  'node-click': [node: T]
  'node-expand': [node: T]
  'node-collapse': [node: T]
  'update:selectedKey': [key: OrgChartKey | null, node: T]
  'update:expandedKeys': [keys: OrgChartKey[], node: T]
}

/** 模板 ref 的公开接口；zoom 在组件实例上自动解包为数字。 */
export interface OrgChartExpose<T extends object = OrgChartNode> {
  zoom: number
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  fitView: () => Promise<void>
  getNode: (key: OrgChartKey) => T | null
  /** 展开祖先、建议选中并居中；受控父端未接受展开时返回 false。 */
  locate: (key: OrgChartKey) => Promise<boolean>
}
