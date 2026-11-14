/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 组件发布 CSS 作用域校验，禁止通用全局选择器逃逸
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import { parse } from 'postcss'
import selectorParser from 'postcss-selector-parser'

const positiveAlternatives = new Set([
  ':is',
  ':where',
  ':matches',
  ':-webkit-any',
  ':-moz-any',
])
const legacyGlobalTokens = new Set([
  '--c-transition-fast',
  '--c-transition-base',
])
const publicSemanticNames = new Set([
  'primary',
  'success',
  'warning',
  'error',
  'info',
  'on-solid',
  'border',
  'radius',
  'focus-ring',
  'skeleton-bg',
])

function isGlobalFallbackToken(property) {
  return property.startsWith('--c-theme-') || legacyGlobalTokens.has(property)
}

function isPublicSemanticToken(property) {
  if (!property.startsWith('--c-')) return false
  const role = property.slice(4)
  return (
    publicSemanticNames.has(role) ||
    /^(?:primary-|bg-|text-[1-4]$|radius-|shadow-|control-height-)/.test(role)
  )
}

function isScopeAnchor(node) {
  return (
    (node.type === 'class' && node.value.startsWith('c-')) ||
    (node.type === 'attribute' && /^data-v-[\w-]+$/.test(node.attribute))
  )
}

function inheritedScope(relation, owned, ancestor) {
  if (relation === '' || relation === '>') return owned
  return (relation === '+' || relation === '~') && ancestor
}

function alternativeScope(node) {
  const alternatives = node.nodes.map(selectorScope)
  return {
    owned: alternatives.length > 0 && alternatives.every(item => item.owned),
    ancestor:
      alternatives.length > 0 && alternatives.every(item => item.ancestor),
  }
}

/** 只把实际匹配路径上的 namespace/作用域作为边界；not/has 内的条件不算锚点。 */
function selectorScope(selector) {
  let owned = false
  let ancestor = false
  for (const node of selector.nodes) {
    if (node.type === 'combinator') {
      const relation = node.value.trim()
      // 子/后代仍在当前作用域内；相邻/后续兄弟只能继承共同祖先的作用域。
      const inherited = inheritedScope(relation, owned, ancestor)
      owned = inherited
      ancestor = inherited
    } else if (isScopeAnchor(node)) {
      owned = true
    } else if (
      node.type === 'pseudo' &&
      positiveAlternatives.has(node.value.toLowerCase())
    ) {
      const alternative = alternativeScope(node)
      owned ||= alternative.owned
      ancestor ||= alternative.ancestor
    }
  }
  return { owned, ancestor }
}

function selectorViolation(selector, rule) {
  if (/:deep\(|:global\(/.test(selector))
    return `未编译的 Vue 样式选择器 ${selector}`
  if (selector === ':root') {
    const onlyFallbacks = rule.nodes.every(
      node =>
        node.type === 'comment' ||
        (node.type === 'decl' && isGlobalFallbackToken(node.prop))
    )
    return onlyFallbacks
      ? undefined
      : `全局默认值必须使用私有主题变量 ${selector}`
  }
  const parsed = selectorParser().astSync(selector)
  return parsed.nodes.every(item => selectorScope(item).owned)
    ? undefined
    : `组件样式越过自身边界 ${selector}`
}

/** 校验组件自身产物；第三方样式在此校验之后由所属组件单独合并。 */
export function assertComponentStyleBoundary(css, owner) {
  const root = parse(css)
  const violations = []
  // 公共语义变量属于调用方；即使声明在组件根，也会遮住调用方的继承配置。
  root.walkDecls(declaration => {
    if (isPublicSemanticToken(declaration.prop))
      violations.push(`组件默认值不能声明公共主题变量 ${declaration.prop}`)
  })
  // @property 的 initial-value 同样是全局默认，不能借注册属性绕过 :root 边界。
  root.walkAtRules(rule => {
    if (
      rule.name.toLowerCase() === 'property' &&
      !isGlobalFallbackToken(rule.params.trim())
    )
      violations.push(`全局属性注册必须使用私有主题变量 ${rule.params}`)
  })
  root.walkRules(rule => {
    if (
      rule.parent?.type === 'atrule' &&
      rule.parent.name.endsWith('keyframes')
    )
      return
    for (const selector of rule.selectors) {
      const violation = selectorViolation(selector, rule)
      if (violation) violations.push(violation)
    }
  })
  if (violations.length) throw new Error(`${owner}: ${violations.join('; ')}`)
}
