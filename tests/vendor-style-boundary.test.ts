/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 使用真实依赖 CSS 验证编辑器、浮层和地图的发布样式边界
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parse } from 'postcss'
import { build } from 'vite'
import {
  isolateVendorStyles,
  readVendorStyles,
} from '../scripts/build/vendor-style-boundary.js'

const dependencies = [
  'vue3-puzzle-vcode/dist/main.css',
  'highlight.js/styles/github.css',
  '@wangeditor-next/editor/dist/css/style.css',
  'driver.js/dist/driver.css',
  'vue-cropper/dist/index.css',
  'leaflet/dist/leaflet.css',
  'md-editor-v3/lib/style.css',
  '@vavt/markdown-theme/css/all.css',
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

  test('Markdown 主题在实际供应商位置内联，并限制在编辑器容器内', () => {
    const dependency = 'md-editor-v3/lib/style.css'
    const output = readVendorStyles(
      resolve('node_modules', dependency),
      dependency
    )
    expect(output).not.toMatch(/@(?:charset|import)\b/)
    for (const theme of ['github', 'cyanosis', 'smart-blue']) {
      expect(output).toContain(`.md-editor div.${theme}-theme`)
    }
    expect(output).toContain('--md-theme-color-reverse')
    expect(output).toContain('c-vendor-md-zoom-in')
    // 主题插入在原 @import 位置，编辑器自身样式仍可在后面覆盖。
    expect(output.indexOf('.github-theme')).toBeLessThan(
      output.indexOf('.md-editor-checkbox')
    )
    const selectors: string[] = []
    parse(output).walkRules(rule => {
      selectors.push(...rule.selectors)
    })
    expect(
      selectors.some(selector => /^div\.[\w-]+-theme/.test(selector))
    ).toBe(false)
  })

  test('Markdown 新增条件导入或未知依赖时拒绝擅自展开', () => {
    const directory = mkdtempSync(join(tmpdir(), 'robot-markdown-import-'))
    const filename = join(directory, 'style.css')
    try {
      for (const source of [
        "@import '@vavt/markdown-theme/css/all.css' screen;",
        "@import 'https://example.com/theme.css';",
        "@import './unknown.css';",
        '@charset "ISO-8859-1";',
      ]) {
        writeFileSync(filename, source)
        expect(() =>
          readVendorStyles(filename, 'md-editor-v3/lib/style.css')
        ).toThrow()
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  test('消费者生产 CSS 保留主题规则且无失效 import/charset 警告', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'robot-markdown-build-'))
    const dependency = 'md-editor-v3/lib/style.css'
    const vendor = readVendorStyles(
      resolve('node_modules', dependency),
      dependency
    )
    const warnings: string[] = []
    try {
      writeFileSync(
        join(directory, 'index.html'),
        '<link rel="stylesheet" href="./style.css">'
      )
      writeFileSync(
        join(directory, 'style.css'),
        `:root{--c-primary:blue}\n${vendor}`
      )
      const result = await build({
        root: directory,
        configFile: false,
        customLogger: {
          info: () => {},
          warn: message => {
            warnings.push(message)
          },
          warnOnce: message => {
            warnings.push(message)
          },
          error: message => {
            throw new Error(message)
          },
          clearScreen: () => {},
          hasErrorLogged: () => false,
          hasWarned: false,
        },
        build: { write: false },
      })
      if (!('output' in result))
        throw new Error('Expected a single CSS build result')
      const css = result.output
        .filter(item => item.type === 'asset' && item.fileName.endsWith('.css'))
        .map(item => (item.type === 'asset' ? String(item.source) : ''))
        .join('\n')
      for (const theme of ['github', 'cyanosis', 'smart-blue']) {
        expect(css).toContain(`.${theme}-theme`)
      }
      expect(css).toContain('--md-theme-color-reverse')
      expect(css).not.toMatch(/@(?:charset|import)\b/)
      expect(
        warnings.filter(message => /@(?:charset|import)/.test(message))
      ).toEqual([])
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
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
