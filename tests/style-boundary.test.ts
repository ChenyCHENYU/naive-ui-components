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
