import type { CSSProperties } from 'vue'

type CSS = CSSProperties | string

/** 组件输入的单一类型来源，可直接用于共享配置。 */
export interface ProgressProps {
  percentage: number | number[]
  isAnimation?: boolean
  time?: number
  type?: 'line' | 'circle' | 'multiple-circle' | 'dashboard'
  borderRadius?: number | string
  circleGap?: number
  color?: string | string[] | { stops: string[] } | Array<{ stops: string[] }>
  fillBorderRadius?: number | string
  gapDegree?: number
  gapOffsetDegree?: number
  height?: number
  indicatorPlacement?: 'inside' | 'outside'
  indicatorTextColor?: string
  offsetDegree?: number
  railColor?: string | string[]
  railStyle?: string | CSS | Array<string | CSS>
  showIndicator?: boolean
  status?: 'default' | 'success' | 'error' | 'warning' | 'info'
  strokeWidth?: number
  unit?: string
}
