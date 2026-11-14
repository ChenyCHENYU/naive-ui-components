/** 包内语义标准：无 Vue/Naive UI 依赖；品牌配置与供应商主题适配分开维护。 */
export type ComponentColorMode = 'light' | 'dark'

export interface ComponentThemeOptions {
  mode?: ComponentColorMode
  /** 品牌与状态色接受 #RGB / #RRGGBB，衍生色由同一规则计算。 */
  primary?: string
  success?: string
  warning?: string
  error?: string
  info?: string
  /** 控件圆角，单位 px；面板、卡片仍保留自己的角色层级。 */
  radius?: number
}

export const COMPONENT_CONTROL_HEIGHTS = Object.freeze({
  tiny: 22,
  small: 28,
  medium: 34,
  large: 40,
})

/** 缺省标准色板；显式主题工厂启用后同时驱动原生控件与包内自绘区域。 */
export const COMPONENT_COLOR_PALETTES = Object.freeze({
  light: Object.freeze({
    primary: '#2563eb',
    success: '#15803d',
    warning: '#b45309',
    error: '#b91c1c',
    info: '#0369a1',
    bgBody: '#f6f8fc',
    bgCard: '#ffffff',
    bgSurface: '#ffffff',
    bgMuted: '#f1f5f9',
    bgHover: '#eaf0f8',
    bgActive: '#dfe8f5',
    skeletonBg: '#e2e8f0',
    text1: '#1f2937',
    text2: '#475569',
    text3: '#64748b',
    text4: '#94a3b8',
    border: '#dce3ed',
  }),
  dark: Object.freeze({
    primary: '#60a5fa',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#38bdf8',
    bgBody: '#111827',
    bgCard: '#1f2937',
    bgSurface: '#253246',
    bgMuted: '#293548',
    bgHover: '#303e54',
    bgActive: '#3b4d68',
    skeletonBg: '#354256',
    text1: '#f1f5f9',
    text2: '#cbd5e1',
    text3: '#94a3b8',
    text4: '#64748b',
    border: '#40516a',
  }),
})

export const COMPONENT_SEMANTIC_ROLES = Object.freeze([
  'primary',
  'primary-hover',
  'primary-pressed',
  'success',
  'warning',
  'error',
  'info',
  'bg-body',
  'bg-card',
  'bg-surface',
  'bg-muted',
  'bg-hover',
  'bg-active',
  'text-1',
  'text-2',
  'text-3',
  'text-4',
  'border',
  'radius',
  'radius-sm',
  'radius-panel',
  'radius-lg',
  'focus-ring',
  'skeleton-bg',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'control-height-tiny',
  'control-height-small',
  'control-height-medium',
  'control-height-large',
] as const)
export type ComponentSemanticRole = (typeof COMPONENT_SEMANTIC_ROLES)[number]

/** 严格限定品牌色输入，避免第三方颜色计算器收到无法计算的 CSS 表达式。 */
export function normalizeThemeColor(value: string): string {
  if (!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value))
    throw new TypeError('Component theme colors must use #RGB or #RRGGBB')
  return value.length === 4
    ? `#${value
        .slice(1)
        .split('')
        .map(char => char + char)
        .join('')}`.toLowerCase()
    : value.toLowerCase()
}

/** 生成真实色值，供 Naive/SDK 的颜色计算器直接使用。 */
export function mixThemeColor(
  value: string,
  target: 0 | 255,
  ratio: number
): string {
  const color = normalizeThemeColor(value).slice(1)
  const result = [0, 2, 4].map(offset => {
    const channel = Number.parseInt(color.slice(offset, offset + 2), 16)
    return Math.round(channel * (1 - ratio) + target * ratio)
      .toString(16)
      .padStart(2, '0')
  })
  return `#${result.join('')}`
}

/** 自动选择实色按钮的前景；不通过改变用户品牌色获得对比度。 */
export function themeForeground(value: string): '#ffffff' | '#000000' {
  const color = normalizeThemeColor(value).slice(1)
  const luminance = [0, 2, 4]
    .map(offset => {
      const channel = Number.parseInt(color.slice(offset, offset + 2), 16) / 255
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    })
    .reduce(
      (sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index],
      0
    )
  return (luminance + 0.05) / 0.05 > 1.05 / (luminance + 0.05)
    ? '#000000'
    : '#ffffff'
}

/** Naive 的 baseColor 是公开的基础色，足以区分标准明暗 Provider；不读取 DOM。 */
export function inferComponentColorMode(baseColor: string): ComponentColorMode {
  const value = baseColor.trim().toLowerCase()
  if (/^#(?:000|000000)$/.test(value)) return 'dark'
  if (/^#(?:fff|ffffff)$/.test(value)) return 'light'
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.test(value)
  const channels = hex
    ? normalizeThemeColor(value)
        .slice(1)
        .match(/../g)!
        .map(part => Number.parseInt(part, 16))
    : value
        .match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
        ?.slice(1)
        .map(Number)
  return channels &&
    channels.length === 3 &&
    channels.every(Number.isFinite) &&
    channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 < 128
    ? 'dark'
    : 'light'
}
