/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 第三方发布 CSS 的命名空间隔离，兼容编辑器 Teleport 弹层
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { parse } from 'postcss'

const policies = {
  'vue3-puzzle-vcode/dist/main.css': /\.(?:vue-auth-box_|vue-puzzle-)/,
  'highlight.js/styles/github.css': /\.hljs(?:\b|-)/,
  '@wangeditor-next/editor/dist/css/style.css': /\.w-e-/,
  'driver.js/dist/driver.css': /\.driver-/,
  'leaflet/dist/leaflet.css': /\.leaflet-/,
  'md-editor-v3/lib/style.css': /\.(?:md-editor(?:\b|-)|medium-zoom-)/,
  'xgplayer/dist/index.min.css': /\.xg(?:player\b|-)|(?:^|[\s>+~])xg-[\w-]+/,
}

/** 限定已确认的通用类，检查供应商升级有没有扩大全局影响范围。 */
export function isolateVendorStyles(css, packagePath) {
  const namespace = policies[packagePath]
  if (!namespace) throw new Error(`未定义第三方样式边界: ${packagePath}`)
  const root = parse(css)
  const markdown = packagePath === 'md-editor-v3/lib/style.css'
  const animationNames = markdown
    ? new Map([
        ['zoomIn', 'c-vendor-md-zoom-in'],
        ['zoomOut', 'c-vendor-md-zoom-out'],
      ])
    : new Map()

  root.walkAtRules(atRule => {
    if (atRule.name.endsWith('keyframes') && animationNames.has(atRule.params))
      atRule.params = animationNames.get(atRule.params)
  })
  root.walkDecls(declaration => {
    if (!/^(?:-webkit-)?animation(?:-name)?$/.test(declaration.prop)) return
    for (const [name, replacement] of animationNames) {
      declaration.value = declaration.value.replace(
        new RegExp(`(?<![\\w-])${name}(?![\\w-])`, 'g'),
        replacement
      )
    }
  })

  const violations = []
  root.walkRules(rule => {
    if (
      rule.parent?.type === 'atrule' &&
      rule.parent.name.endsWith('keyframes')
    )
      return
    rule.selectors = rule.selectors.map(selector => {
      if (markdown && /^\.(?:animation|zoom-in|zoom-out)$/.test(selector))
        return `.md-editor-modal${selector}`
      if (
        packagePath === '@wangeditor-next/editor/dist/css/style.css' &&
        selector === '.no-scroll'
      )
        return '.w-e-text-container.no-scroll'
      if (packagePath === 'leaflet/dist/leaflet.css' && selector === '.lvml')
        return '.leaflet-container .lvml'
      return selector
    })
    for (const selector of rule.selectors) {
      if (/:deep\(|:global\(/.test(selector)) {
        violations.push(selector)
        continue
      }
      const positive = selector.replace(/:(?:not|has)\([^)]*\)/g, '')
      if (namespace.test(positive)) continue
      // 编辑器的公共 token 保留原协议，内容样式必须有 w-e 命名空间。
      if (
        packagePath === '@wangeditor-next/editor/dist/css/style.css' &&
        [':root', ':host'].includes(selector) &&
        rule.nodes.every(
          node =>
            node.type === 'comment' ||
            (node.type === 'decl' && node.prop.startsWith('--w-e-'))
        )
      )
        continue
      violations.push(selector)
    }
  })
  if (violations.length)
    throw new Error(`${packagePath}: 第三方样式越界 ${violations.join('; ')}`)
  return root.toString()
}
