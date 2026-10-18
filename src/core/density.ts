/** UI 密度协议与纯数据预设，不依赖 Vue、Naive UI 或浏览器。 */
export type ComponentDensity = 'default' | 'compact' | 'comfortable'

export interface ResolvedComponentDensity {
  density: ComponentDensity
  size: 'small' | 'medium' | 'large'
  gap: number
  rowGap: number
  padding: number
  formItemGap: number
}

const DENSITIES: Record<ComponentDensity, ResolvedComponentDensity> = {
  default: {
    density: 'default',
    size: 'medium',
    gap: 16,
    rowGap: 16,
    padding: 24,
    formItemGap: 24,
  },
  compact: {
    density: 'compact',
    size: 'small',
    gap: 8,
    rowGap: 8,
    padding: 12,
    formItemGap: 12,
  },
  comfortable: {
    density: 'comfortable',
    size: 'large',
    gap: 20,
    rowGap: 20,
    padding: 28,
    formItemGap: 28,
  },
}

/** 每次返回独立预设，显式控件尺寸与布局配置由消费组件在上层覆盖。 */
export const resolveComponentDensity = (
  density?: ComponentDensity
): ResolvedComponentDensity => ({
  ...DENSITIES[
    density && Object.prototype.hasOwnProperty.call(DENSITIES, density)
      ? density
      : 'default'
  ],
})
