/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 发布 CSS 的越界与 scoped 编译回归测试
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { describe, expect, test } from 'bun:test'
import { assertComponentStyleBoundary } from '../scripts/build/style-boundary.js'
import { componentUtilitiesPlugin } from '../scripts/build/unocss-sfc'
import { compileStyle } from '@vue/compiler-sfc'
import { COMPONENT_SEMANTIC_ROLES } from '../src/core/theme'

describe('component style boundaries', () => {
  test('scoped 样式与命名空间内的递归组件样式可以发布', () => {
    expect(() =>
      assertComponentStyleBoundary(
        '.title[data-v-a] {color:red}.c-menu .n-button{color:blue}',
        'test'
      )
    ).not.toThrow()
  })
  test('混合选择器中任意一个全局逃逸都阻止发布', () => {
    for (const css of [
      'body{color:white}',
      '.c-menu, .title {color:white}',
      ':root{--c-bg:red;color:white}',
      ':deep(.n-button){color:white}',
    ])
      expect(() => assertComponentStyleBoundary(css, 'test')).toThrow()
  })
  test('全局兜底只开放私有主题变量与既有过渡 token', () => {
    expect(() =>
      assertComponentStyleBoundary(
        ':root{/* shared fallback */--c-theme-primary:#2080f0;--c-theme-bg-card:white;--c-transition-fast:0.15s;--c-transition-base:0.3s}',
        'test'
      )
    ).not.toThrow()
    for (const css of [
      ':root{--c-primary:#f00}',
      ':root{--c-bg-card:white}',
      ':root{background:red}',
      ':root{--n-color:red}',
      ':root{--c-theme-primary:blue;--n-color:red}',
      ':root{--c-theme-primary:blue;color:red}',
      ':root{--c-transition-custom:2s}',
      '@property --c-primary{syntax:"<color>";inherits:true;initial-value:red}',
      '@PROPERTY --c-primary{syntax:"<color>";inherits:true;initial-value:red}',
    ])
      expect(() => assertComponentStyleBoundary(css, 'test')).toThrow()
  })
  test('每个公开语义角色都由调用方配置，组件只声明私有兜底与领域钩子', () => {
    for (const role of COMPONENT_SEMANTIC_ROLES) {
      expect(() =>
        assertComponentStyleBoundary(`.c-example{--c-${role}:red}`, 'test')
      ).toThrow('公共主题变量')
      expect(() =>
        assertComponentStyleBoundary(
          `.c-example{--c-theme-${role}:red}`,
          'test'
        )
      ).not.toThrow()
    }
    expect(() =>
      assertComponentStyleBoundary(
        '.c-example{--c-table-bg:white;--c-user-picker-border:red;--cl-surface:black;--c-transition-fast:0.15s;--c-transition-base:0.3s}',
        'test'
      )
    ).not.toThrow()
  })
  test('函数选择器的每个分支都必须受真正的命名空间或 scoped 属性限制', () => {
    for (const selector of [
      ':is(.c-tree,.c-menu) .n-button',
      ':IS(.c-tree,.c-menu) .n-button',
      ':where(.c-tree,:is(.c-menu,.c-tabs)) .n-input',
      '.c-tree :is(.n-button,body)',
      ':is(.n-input,body)[data-v-a]',
      '[data-v-a] :where(.n-card,.n-card-header)',
      '.c-tree:not(:has(.outside)) .n-button',
      ':is(.c-tree .row,.c-menu .row) + .n-button',
    ])
      expect(() =>
        assertComponentStyleBoundary(`${selector}{color:red}`, 'test')
      ).not.toThrow()
    for (const selector of [
      ':is(.c-tree,body)',
      ':where(.c-tree,html) .n-button',
      ':is(.c-tree,:where(.c-menu,body)) .n-input',
      ':is([data-v-a],body)',
      'body:has(.c-tree)',
      ':not(.c-tree)',
      '.n-button:not(.c-tree)',
      '.n-button[data-marker=".c-tree"]',
      '.c-tree + .n-button',
      '.c-tree + body .n-button',
      ':is(.c-tree .row,.c-menu) + .n-button',
    ])
      expect(() =>
        assertComponentStyleBoundary(`${selector}{color:red}`, 'test')
      ).toThrow()
  })
  test('局部原生变量与组件内部相邻元素仍可使用', () => {
    expect(() =>
      assertComponentStyleBoundary(
        '.c-login .n-button{--n-color:transparent}.c-tree > .row + .row{border-color:red}',
        'test'
      )
    ).not.toThrow()
  })
  test('工具类与图标在没有宿主 UnoCSS 的情况下进入 scoped 样式', async () => {
    const output = await componentUtilitiesPlugin().transform(
      '<template><div class="inline-block flex gap-2.5"><i class="i-mdi:check"/></div></template>',
      '/test/Example.vue'
    )
    const css =
      output?.code.match(/<style scoped>([\s\S]*)<\/style>/)?.[1] || ''
    const scoped = compileStyle({
      source: css,
      filename: 'Example.vue',
      id: 'data-v-example',
      scoped: true,
    }).code
    expect(scoped).toContain('.inline-block[data-v-example]')
    expect(scoped).toContain('mask')
    expect(scoped).toContain('data:image/svg+xml')
    expect(() => assertComponentStyleBoundary(scoped, 'Example')).not.toThrow()
  })
})
