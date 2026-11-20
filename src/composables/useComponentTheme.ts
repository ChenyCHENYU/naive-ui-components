import {
  computed,
  normalizeStyle,
  useAttrs,
  type CSSProperties,
  type StyleValue,
} from 'vue'
import { useThemeVars } from 'naive-ui'
import type {} from '../adapters/naive/theme'
import {
  COMPONENT_COLOR_PALETTES,
  inferComponentColorMode,
  type ComponentColorMode,
} from '../core/theme'

// 只在这一处维护 Naive 公共主题字段到包内中性色角色的对应关系。
const NEUTRAL_ROLES = {
  'bg-body': ['bgBody', 'bodyColor'],
  'bg-card': ['bgCard', 'cardColor'],
  'bg-surface': ['bgSurface', 'popoverColor'],
  'bg-muted': ['bgMuted', 'actionColor'],
  'bg-hover': ['bgHover', 'hoverColor'],
  'bg-active': ['bgActive', 'pressedColor'],
  'text-1': ['text1', 'textColor1'],
  'text-2': ['text2', 'textColor2'],
  'text-3': ['text3', 'textColor3'],
  'text-4': ['text4', 'textColorDisabled'],
  border: ['border', 'borderColor'],
} as const

function neutralStyles(
  value: ReturnType<typeof useThemeVars>['value'],
  palette: (typeof COMPONENT_COLOR_PALETTES)['light' | 'dark'] | undefined
): CSSProperties {
  return {
    ...Object.fromEntries(
      Object.entries(NEUTRAL_ROLES).map(([role, [own, native]]) => [
        `--c-theme-${role}`,
        palette ? palette[own] : value[native],
      ])
    ),
    '--c-theme-skeleton-bg':
      palette?.skeletonBg ??
      value.robotComponentSkeletonColor ??
      value.actionColor,
    '--c-theme-on-solid':
      palette?.onSolid ?? value.robotComponentOnSolidColor ?? '#ffffff',
  }
}

/** 公共 --c-* 留给调用方；适配值只写私有默认，避免 inline 默认值压过宿主 CSS。 */
export function useComponentTheme(
  override?: () => ComponentColorMode | undefined
) {
  const theme = useThemeVars()
  const attrs = useAttrs()
  return computed<CSSProperties>(() => {
    const { value } = theme
    const currentMode = inferComponentColorMode(value.baseColor)
    const mode = override?.() ?? currentMode
    const explicit =
      mode !== currentMode ? COMPONENT_COLOR_PALETTES[mode] : undefined
    const { borderRadius: radius } = value
    const variables: CSSProperties = {
      '--c-theme-primary': value.primaryColor,
      '--c-theme-primary-hover': value.primaryColorHover,
      '--c-theme-primary-pressed': value.primaryColorPressed,
      '--c-theme-primary-suppl': value.primaryColorSuppl,
      '--c-theme-success': value.successColor,
      '--c-theme-warning': value.warningColor,
      '--c-theme-error': value.errorColor,
      '--c-theme-info': value.infoColor,
      ...neutralStyles(value, explicit),
      '--c-theme-radius': radius,
      '--c-theme-radius-sm': value.borderRadiusSmall,
      '--c-theme-radius-panel': `max(8px, calc(${radius} + 4px))`,
      '--c-theme-radius-lg': `max(12px, calc(${radius} + 8px))`,
      '--c-theme-focus-ring': `color-mix(in srgb, ${value.primaryColor} 30%, transparent)`,
      '--c-theme-shadow-sm': value.boxShadow1,
      '--c-theme-shadow-md': value.boxShadow2,
      '--c-theme-shadow-lg': value.boxShadow3,
      '--c-theme-control-height-tiny': value.heightTiny,
      '--c-theme-control-height-small': value.heightSmall,
      '--c-theme-control-height-medium': value.heightMedium,
      '--c-theme-control-height-large': value.heightLarge,
    }
    // 只投影显式语义变量给 Teleport；宽高、定位等布局属性仍只属于原根节点。
    const normalized = normalizeStyle([attrs.style as StyleValue])
    if (normalized && typeof normalized === 'object')
      for (const [key, item] of Object.entries(normalized))
        if (key.startsWith('--c-')) variables[key as `--${string}`] = item
    return variables
  })
}

/** 缺省跟随当前 Provider；显式的旧 light/dark 设置仍优先。 */
export function useComponentColorMode(
  override?: () => ComponentColorMode | undefined
) {
  const theme = useThemeVars()
  return computed<ComponentColorMode>(
    () => override?.() ?? inferComponentColorMode(theme.value.baseColor)
  )
}
