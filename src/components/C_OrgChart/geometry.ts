import type { OrgChartDirection, OrgChartLineStyle } from './types'

export interface OrgChartRect {
  x: number
  y: number
  width: number
  height: number
}

/** 无布局依赖的几何计算，缩放和平移只由外层视窗承担。 */
export function createOrgConnectorPath(
  parent: OrgChartRect,
  child: OrgChartRect,
  direction: OrgChartDirection,
  style: OrgChartLineStyle
): string | null {
  for (const rect of [parent, child]) {
    if (
      !Object.values(rect).every(Number.isFinite) ||
      rect.width < 0 ||
      rect.height < 0
    )
      return null
  }
  const horizontal = direction === 'horizontal'
  const start = horizontal
    ? { cross: parent.y + parent.height / 2, along: parent.x + parent.width }
    : { cross: parent.x + parent.width / 2, along: parent.y + parent.height }
  const end = horizontal
    ? { cross: child.y + child.height / 2, along: child.x }
    : { cross: child.x + child.width / 2, along: child.y }
  const point = (cross: number, along: number) =>
    (horizontal ? [along, cross] : [cross, along])
      .map(value => Number(value.toFixed(3)))
      .join(' ')
  const from = point(start.cross, start.along)
  const to = point(end.cross, end.along)
  if (style === 'straight') return `M ${from} L ${to}`
  const middle = (start.along + end.along) / 2
  const corner1 = point(start.cross, middle)
  const corner2 = point(end.cross, middle)
  const radius = Math.min(
    8,
    Math.abs(end.along - start.along) / 4,
    Math.abs(end.cross - start.cross) / 2
  )
  if (style === 'stepped' || radius === 0)
    return `M ${from} L ${corner1} L ${corner2} L ${to}`
  const crossSign = Math.sign(end.cross - start.cross)
  const alongSign = Math.sign(end.along - start.along)
  return [
    `M ${from}`,
    `L ${point(start.cross, middle - alongSign * radius)}`,
    `Q ${corner1} ${point(start.cross + crossSign * radius, middle)}`,
    `L ${point(end.cross - crossSign * radius, middle)}`,
    `Q ${corner2} ${point(end.cross, middle + alongSign * radius)}`,
    `L ${to}`,
  ].join(' ')
}

/** 对无效输入和颠倒边界提供有限正数回退。 */
export function clampOrgZoom(value: number, min: number, max: number) {
  const lower = Number.isFinite(min) && min > 0 ? min : 0.3
  const upper =
    Number.isFinite(max) && max > 0 ? Math.max(lower, max) : Math.max(lower, 2)
  return Math.max(lower, Math.min(upper, Number.isFinite(value) ? value : 1))
}
