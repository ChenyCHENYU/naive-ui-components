/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 使用真实依赖 CSS 验证编辑器、浮层和地图的发布样式边界
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { parse } from 'postcss'
import { isolateVendorStyles } from '../scripts/build/vendor-style-boundary.js'

const dependencies = [
  'vue3-puzzle-vcode/dist/main.css',
  'highlight.js/styles/github.css',
  '@wangeditor-next/editor/dist/css/style.css',
  'driver.js/dist/driver.css',
  'leaflet/dist/leaflet.css',
  'md-editor-v3/lib/style.css',
  'xgplayer/dist/index.min.css',
]

describe('vendor style boundaries', () => {
  test.each(dependencies)('%s 的实际依赖样式满足组件发布边界', dependency => {
    const source = readFileSync(`node_modules/${dependency}`, 'utf8')
    const isolated = isolateVendorStyles(source, dependency)
    const selectors: string[] = []
    parse(isolated).walkRules(rule => {
      selectors.push(...rule.selectors)
    })
    expect(selectors.length).toBeGreaterThan(10)
    for (const generic of [
      '.animation',
      '.zoom-in',
      '.zoom-out',
      '.no-scroll',
      '.lvml',
    ])
      expect(selectors).not.toContain(generic)
    // 保留相同数量的规则，不靠删掉供应商样式达到隔离。
    let originalCount = 0
    parse(source).walkRules(() => {
      originalCount++
    })
    expect(selectors.length).toBeGreaterThanOrEqual(originalCount)
  })

  test('Markdown Teleport 弹层保留动画，关键帧不占用宿主名称', () => {
    const dependency = 'md-editor-v3/lib/style.css'
    const output = isolateVendorStyles(
      readFileSync(`node_modules/${dependency}`, 'utf8'),
      dependency
    )
    expect(output).toContain('.md-editor-modal.zoom-in')
    expect(output).toContain('.md-editor-modal.zoom-out')
    expect(output).toContain('c-vendor-md-zoom-in')
    expect(output).toContain('c-vendor-md-zoom-out')
    expect(output).not.toMatch(/@keyframes\s+zoom(?:In|Out)\b/)
    expect(output).toContain('.medium-zoom-overlay')
  })

  test('供应商新增全局重置或未编译的 deep 选择器时阻止发布', () => {
    for (const selector of [
      'body',
      'svg',
      '.content',
      ':not(.md-editor) .content',
      ':deep(.md-editor)',
    ])
      expect(() =>
        isolateVendorStyles(
          `${selector}{color:white}`,
          'md-editor-v3/lib/style.css'
        )
      ).toThrow()
    expect(() =>
      isolateVendorStyles(
        ':root{--w-e-color:red;color:white}',
        '@wangeditor-next/editor/dist/css/style.css'
      )
    ).toThrow()
    expect(() =>
      isolateVendorStyles('.unknown{color:white}', 'unregistered/style.css')
    ).toThrow()
  })
})
