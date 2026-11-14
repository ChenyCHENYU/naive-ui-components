import {
  darkTheme,
  type GlobalTheme,
  type GlobalThemeOverrides,
} from 'naive-ui'
import {
  COMPONENT_CONTROL_HEIGHTS,
  mixThemeColor,
  resolveComponentThemeColors,
  type ComponentThemeOptions,
} from '../../core/theme'

// 使用 Naive 的公开扩展点，独立骨架色随现有 Provider 传递，不借用其他控件的颜色字段。
declare module 'naive-ui' {
  interface CustomThemeCommonVars {
    robotComponentSkeletonColor?: string
    robotComponentOnSolidColor?: string
  }
}

export interface ComponentThemeConfig {
  theme: GlobalTheme | null
  themeOverrides: GlobalThemeOverrides
}

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
  const palette = resolveComponentThemeColors(options, mode)
  const radius = resolveRadius(options.radius)
  const { primary, success, warning, error, info } = palette
  const controlBorder = `1px solid ${palette.border}`
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
    tableColor: palette.bgCard,
    modalColor: palette.bgSurface,
    popoverColor: palette.bgSurface,
    inputColor: palette.bgCard,
    inputColorDisabled: palette.bgMuted,
    tableHeaderColor: palette.bgMuted,
    tableColorHover: palette.bgHover,
    tableColorStriped: palette.bgMuted,
    tabColor: palette.bgMuted,
    codeColor: palette.bgMuted,
    tagColor: palette.bgMuted,
    buttonColor2: palette.bgMuted,
    buttonColor2Hover: palette.bgHover,
    buttonColor2Pressed: palette.bgActive,
    actionColor: palette.bgMuted,
    hoverColor: palette.bgHover,
    pressedColor: palette.bgActive,
    robotComponentSkeletonColor: palette.skeletonBg,
    robotComponentOnSolidColor: palette.onSolid,
    borderColor: palette.border,
    dividerColor: palette.border,
    textColor1: palette.text1,
    textColor2: palette.text2,
    textColor3: palette.text3,
    textColorDisabled: palette.text4,
    placeholderColor: palette.text3,
    placeholderColorDisabled: palette.text4,
    iconColor: palette.text3,
    iconColorHover: palette.text2,
    iconColorPressed: palette.text1,
    iconColorDisabled: palette.text4,
    clearColor: palette.text3,
    clearColorHover: palette.text2,
    clearColorPressed: palette.text1,
    closeIconColor: palette.text3,
    closeIconColorHover: palette.text2,
    closeIconColorPressed: palette.text1,
    closeColorHover: palette.bgHover,
    closeColorPressed: palette.bgActive,
    progressRailColor: palette.bgMuted,
    railColor: palette.border,
    scrollbarColor: palette.text4,
    scrollbarColorHover: palette.text3,
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
      Tabs: { colorSegment: palette.bgMuted, tabColorSegment: palette.bgCard },
      Input: { border: controlBorder, borderDisabled: controlBorder },
      InternalSelection: {
        border: controlBorder,
      },
      Checkbox: {
        checkMarkColor: palette.onSolid,
        checkMarkColorDisabledChecked: palette.onSolid,
      },
      Radio: {
        colorActive: primary,
        dotColorActive: palette.onSolid,
        buttonColorActive: primary,
        buttonTextColorActive: palette.onSolid,
      },
      Switch: { textColor: palette.onSolid },
      Button: {
        textColorPrimary: palette.onSolid,
        textColorDisabledPrimary: palette.onSolid,
        textColorHoverPrimary: palette.onSolid,
        textColorPressedPrimary: palette.onSolid,
        textColorFocusPrimary: palette.onSolid,
        textColorSuccess: palette.onSolid,
        textColorDisabledSuccess: palette.onSolid,
        textColorHoverSuccess: palette.onSolid,
        textColorPressedSuccess: palette.onSolid,
        textColorFocusSuccess: palette.onSolid,
        textColorWarning: palette.onSolid,
        textColorDisabledWarning: palette.onSolid,
        textColorHoverWarning: palette.onSolid,
        textColorPressedWarning: palette.onSolid,
        textColorFocusWarning: palette.onSolid,
        textColorError: palette.onSolid,
        textColorDisabledError: palette.onSolid,
        textColorHoverError: palette.onSolid,
        textColorPressedError: palette.onSolid,
        textColorFocusError: palette.onSolid,
        textColorInfo: palette.onSolid,
        textColorDisabledInfo: palette.onSolid,
        textColorHoverInfo: palette.onSolid,
        textColorPressedInfo: palette.onSolid,
        textColorFocusInfo: palette.onSolid,
      },
    },
  }
}
