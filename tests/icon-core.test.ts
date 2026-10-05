/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 图标公共尺寸与离线回退契约
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { describe, expect, test } from 'bun:test'
import { normalizeIconSize, OFFLINE_ICON } from '../src/components/C_Icon/core'

describe('icon rendering contract', () => {
  test('数字字符串不会成为浏览器拒绝的无单位尺寸', () => {
    expect(normalizeIconSize(24)).toBe('24px')
    expect(normalizeIconSize('32')).toBe('32px')
    expect(normalizeIconSize(' 16.5 ')).toBe('16.5px')
    expect(normalizeIconSize('1.5rem')).toBe('1.5rem')
    expect(normalizeIconSize('100%')).toBe('100%')
  })
  test('终端回退是自带 SVG，无外部资源依赖', () => {
    expect(OFFLINE_ICON.body).toContain('currentColor')
    expect(OFFLINE_ICON.body).not.toContain('href')
    expect(OFFLINE_ICON.width).toBe(24)
  })
})
