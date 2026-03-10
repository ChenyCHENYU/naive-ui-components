/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_OrgChart 组织架构图组件类型定义
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

/** 节点数据 */
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
export interface OrgChartProps {
  /** 树形数据 */
  data: OrgChartNode
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
  /** 最小缩放 */
  minZoom?: number
  /** 最大缩放 */
  maxZoom?: number
  /** 是否可折叠 */
  collapsible?: boolean
}
