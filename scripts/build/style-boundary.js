/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 组件发布 CSS 作用域校验，禁止通用全局选择器逃逸
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { parse } from 'postcss'

/** 校验组件自身产物；第三方样式在此校验之后由所属组件单独合并。 */
export function assertComponentStyleBoundary(css, owner) {
  const root = parse(css)
  const violations = []
  root.walkRules(rule => {
    if (
      rule.parent?.type === 'atrule' &&
      rule.parent.name.endsWith('keyframes')
    )
      return
    for (const selector of rule.selectors) {
      if (/:deep\(|:global\(/.test(selector)) {
        violations.push(`未编译的 Vue 样式选择器 ${selector}`)
        continue
      }
      const positiveSelector = selector.replace(/:(?:not|has)\([^)]*\)/g, '')
      if (
        positiveSelector.includes('[data-v-') ||
        /\.c-[\w-]+/.test(positiveSelector)
      )
        continue
      if (
        selector === ':root' &&
        rule.nodes.every(
          node =>
            node.type === 'comment' ||
            (node.type === 'decl' && node.prop.startsWith('--c-'))
        )
      )
        continue
      violations.push(`组件样式越过自身边界 ${selector}`)
    }
  })
  if (violations.length) throw new Error(`${owner}: ${violations.join('; ')}`)
}
