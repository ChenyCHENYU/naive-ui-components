import { describe, expect, test } from 'bun:test'
import { darkTheme } from 'naive-ui'
import { createComponentTheme } from '../src/adapters/naive/theme'
import {
  COMPONENT_COLOR_PALETTES,
  COMPONENT_CONTROL_HEIGHTS,
  inferComponentColorMode,
  normalizeThemeColor,
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
    expect(theme.themeOverrides.Button?.textColorWarning).toBe('#ffffff')
    expect(theme.themeOverrides.Button?.textColorHoverWarning).toBe('#ffffff')
    expect(themeForeground('#fff')).toBe('#000000')
    expect(themeForeground('#000')).toBe('#ffffff')
    expect(normalizeThemeColor('#AbC')).toBe('#aabbcc')
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
