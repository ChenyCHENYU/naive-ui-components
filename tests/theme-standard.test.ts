import { describe, expect, test } from 'bun:test'
import { darkTheme } from 'naive-ui'
import { createComponentTheme } from '../src/adapters/naive/theme'
import {
  COMPONENT_COLOR_PALETTES,
  COMPONENT_CONTROL_HEIGHTS,
  inferComponentColorMode,
  normalizeThemeColor,
  resolveComponentThemeColors,
  themeForeground,
} from '../src/core/theme'

describe('component theme standard', () => {
  test('opt-in factory configures the existing provider and keeps calls isolated', () => {
    const first = createComponentTheme()
    const dark = createComponentTheme({
      mode: 'dark',
      primary: '#A3F',
      radius: 8,
    })
    expect(first.theme).toBeNull()
    expect(first.themeOverrides.common?.primaryColor).toBe(
      COMPONENT_COLOR_PALETTES.light.primary
    )
    expect(dark.theme).toBe(darkTheme)
    expect(dark.themeOverrides.common?.primaryColor).toBe('#aa33ff')
    expect(dark.themeOverrides.common?.borderRadius).toBe('8px')
    expect(dark.themeOverrides.common?.heightSmall).toBe(
      `${COMPONENT_CONTROL_HEIGHTS.small}px`
    )
    dark.themeOverrides.common!.primaryColor = '#000000'
    expect(
      createComponentTheme({ mode: 'dark' }).themeOverrides.common?.primaryColor
    ).toBe(COMPONENT_COLOR_PALETTES.dark.primary)
    expect(first.themeOverrides.common?.primaryColor).toBe(
      COMPONENT_COLOR_PALETTES.light.primary
    )
    expect(Object.isFrozen(COMPONENT_COLOR_PALETTES.light)).toBe(true)
  })

  test('foreground selection preserves contrast for bright and dark custom brands and statuses', () => {
    const theme = createComponentTheme({
      primary: '#ffff00',
      warning: '#101010',
    })
    expect(theme.themeOverrides.Button?.textColorPrimary).toBe('#000000')
    expect(theme.themeOverrides.Button?.textColorDisabledPrimary).toBe(
      '#000000'
    )
    expect(theme.themeOverrides.Button?.textColorWarning).toBe('#ffffff')
    expect(theme.themeOverrides.Button?.textColorDisabledWarning).toBe(
      '#ffffff'
    )
    expect(theme.themeOverrides.Button?.textColorHoverWarning).toBe('#ffffff')
    expect(themeForeground('#fff')).toBe('#000000')
    expect(themeForeground('#000')).toBe('#ffffff')
    expect(normalizeThemeColor('#AbC')).toBe('#aabbcc')
  })

  test.each(['light', 'dark'] as const)(
    '%s merges partial neutral colors without mutating caller settings or shared defaults',
    mode => {
      const options = Object.freeze({
        mode,
        primary: '#93f',
        bgBody: '#123',
        bgCard: '#456',
        bgSurface: '#789',
        bgMuted: '#abc',
        bgHover: '#bcd',
        bgActive: '#cde',
        skeletonBg: '#def',
        text1: '#135',
        text2: '#246',
        text3: '#357',
        text4: '#468',
        border: '#579',
      })
      const original = { ...options }
      const theme = createComponentTheme(options)
      const common = theme.themeOverrides.common!
      expect(common.primaryColor).toBe('#9933ff')
      expect(common.bodyColor).toBe('#112233')
      expect(common.cardColor).toBe('#445566')
      expect(common.modalColor).toBe('#778899')
      expect(common.popoverColor).toBe('#778899')
      expect(common.actionColor).toBe('#aabbcc')
      expect(common.hoverColor).toBe('#bbccdd')
      expect(common.pressedColor).toBe('#ccddee')
      expect(common.robotComponentSkeletonColor).toBe('#ddeeff')
      expect(theme.themeOverrides.Skeleton?.color).toBe('#ddeeff')
      expect(theme.themeOverrides.Skeleton?.colorEnd).toBe('#bbccdd')
      expect(common.textColor1).toBe('#113355')
      expect(common.textColor2).toBe('#224466')
      expect(common.textColor3).toBe('#335577')
      expect(common.textColorDisabled).toBe('#446688')
      expect(common.borderColor).toBe('#557799')
      expect(common.dividerColor).toBe('#557799')
      expect(common.successColor).toBe(COMPONENT_COLOR_PALETTES[mode].success)
      common.cardColor = '#000000'
      expect(
        createComponentTheme(options).themeOverrides.common?.cardColor
      ).toBe('#445566')
      expect(
        createComponentTheme({ mode }).themeOverrides.common?.cardColor
      ).toBe(COMPONENT_COLOR_PALETTES[mode].bgCard)
      expect(options).toEqual(original)
    }
  )

  test('validates every supplied semantic color and ignores unrelated option keys', () => {
    for (const name of Object.keys(COMPONENT_COLOR_PALETTES.light))
      expect(() =>
        createComponentTheme({ [name]: 'var(--project-color)' })
      ).toThrow(TypeError)
    const options = { primary: '#ABC', mode: 'dark', radius: 8 }
    const colors = resolveComponentThemeColors(options, 'light')
    expect(colors.primary).toBe('#aabbcc')
    expect(Object.keys(colors)).toEqual(
      Object.keys(COMPONENT_COLOR_PALETTES.light)
    )
  })

  test('rejects invalid options before sending them to vendor color calculations', () => {
    for (const primary of ['red', 'var(--brand)', '#ffff', '#gggggg'])
      expect(() => createComponentTheme({ primary })).toThrow(TypeError)
    for (const radius of [-1, NaN, Infinity])
      expect(() => createComponentTheme({ radius })).toThrow(TypeError)
    expect(
      createComponentTheme({ radius: 0 }).themeOverrides.common
        ?.borderRadiusSmall
    ).toBe('0px')
  })

  test('infers provider mode without DOM access', () => {
    expect(inferComponentColorMode('#000')).toBe('dark')
    expect(inferComponentColorMode('rgb(16, 24, 40)')).toBe('dark')
    expect(inferComponentColorMode('#ffffff')).toBe('light')
    expect(inferComponentColorMode('rgb(250 250 250)')).toBe('light')
    expect(inferComponentColorMode('unsupported')).toBe('light')
  })
})
