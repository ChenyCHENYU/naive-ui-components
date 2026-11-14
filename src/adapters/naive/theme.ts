import {
  darkTheme,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from 'naive-ui'
import {
  COMPONENT_COLOR_PALETTES,
  COMPONENT_CONTROL_HEIGHTS,
  mixThemeColor,
  normalizeThemeColor,
  themeForeground,
  type ComponentThemeOptions,
} from '../../core/theme'

export interface ComponentThemeConfig {
  theme: GlobalTheme | null
  themeOverrides: GlobalThemeOverrides
}

const resolveColor = (value: string | undefined, fallback: string) =>
  normalizeThemeColor(value ?? fallback)

function resolveRadius(value: number | undefined): number {
  const radius = value ?? 6
  if (!Number.isFinite(radius) || radius < 0)
    throw new TypeError(
      'Component theme radius must be a finite non-negative number'
    )
  return radius
}

/** 一次配置现有 NConfigProvider；不创建第二个 Provider、不写全局样式。 */
export function createComponentTheme(
  options: ComponentThemeOptions = {}
): ComponentThemeConfig {
  const mode = options.mode ?? 'light'
  if (mode !== 'light' && mode !== 'dark')
    throw new TypeError('Component theme mode must be light or dark')
  const palette = COMPONENT_COLOR_PALETTES[mode]
  const radius = resolveRadius(options.radius)
  const primary = resolveColor(options.primary, palette.primary)
  const success = resolveColor(options.success, palette.success)
  const warning = resolveColor(options.warning, palette.warning)
  const error = resolveColor(options.error, palette.error)
  const info = resolveColor(options.info, palette.info)
  const common = {
    baseColor: mode === 'dark' ? '#000000' : '#ffffff',
    textColorBase: mode === 'dark' ? '#ffffff' : '#000000',
    primaryColor: primary,
    primaryColorHover: mixThemeColor(primary, 255, 0.14),
    primaryColorPressed: mixThemeColor(primary, 0, 0.14),
    primaryColorSuppl: primary,
    successColor: success,
    successColorHover: mixThemeColor(success, 255, 0.14),
    successColorPressed: mixThemeColor(success, 0, 0.14),
    successColorSuppl: success,
    warningColor: warning,
    warningColorHover: mixThemeColor(warning, 255, 0.14),
    warningColorPressed: mixThemeColor(warning, 0, 0.14),
    warningColorSuppl: warning,
    errorColor: error,
    errorColorHover: mixThemeColor(error, 255, 0.14),
    errorColorPressed: mixThemeColor(error, 0, 0.14),
    errorColorSuppl: error,
    infoColor: info,
    infoColorHover: mixThemeColor(info, 255, 0.14),
    infoColorPressed: mixThemeColor(info, 0, 0.14),
    infoColorSuppl: info,
    bodyColor: palette.bgBody,
    cardColor: palette.bgCard,
    modalColor: palette.bgSurface,
    popoverColor: palette.bgSurface,
    actionColor: palette.bgMuted,
    hoverColor: palette.bgHover,
    pressedColor: palette.bgActive,
    borderColor: palette.border,
    dividerColor: palette.border,
    textColor1: palette.text1,
    textColor2: palette.text2,
    textColor3: palette.text3,
    textColorDisabled: palette.text4,
    borderRadius: `${radius}px`,
    borderRadiusSmall: `${Math.max(0, radius - 2)}px`,
    heightTiny: `${COMPONENT_CONTROL_HEIGHTS.tiny}px`,
    heightSmall: `${COMPONENT_CONTROL_HEIGHTS.small}px`,
    heightMedium: `${COMPONENT_CONTROL_HEIGHTS.medium}px`,
    heightLarge: `${COMPONENT_CONTROL_HEIGHTS.large}px`,
  }
  return {
    theme: mode === 'dark' ? darkTheme : null,
    themeOverrides: {
      common,
      Skeleton: { color: palette.skeletonBg, colorEnd: palette.bgHover },
      Button: {
        textColorPrimary: themeForeground(primary),
        textColorHoverPrimary: themeForeground(common.primaryColorHover),
        textColorPressedPrimary: themeForeground(common.primaryColorPressed),
        textColorFocusPrimary: themeForeground(common.primaryColorHover),
        textColorSuccess: themeForeground(success),
        textColorHoverSuccess: themeForeground(common.successColorHover),
        textColorPressedSuccess: themeForeground(common.successColorPressed),
        textColorFocusSuccess: themeForeground(common.successColorHover),
        textColorWarning: themeForeground(warning),
        textColorHoverWarning: themeForeground(common.warningColorHover),
        textColorPressedWarning: themeForeground(common.warningColorPressed),
        textColorFocusWarning: themeForeground(common.warningColorHover),
        textColorError: themeForeground(error),
        textColorHoverError: themeForeground(common.errorColorHover),
        textColorPressedError: themeForeground(common.errorColorPressed),
        textColorFocusError: themeForeground(common.errorColorHover),
        textColorInfo: themeForeground(info),
        textColorHoverInfo: themeForeground(common.infoColorHover),
        textColorPressedInfo: themeForeground(common.infoColorPressed),
        textColorFocusInfo: themeForeground(common.infoColorHover),
      },
    },
  }
}
