/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-20
 * @Description: 面包屑纯数据解析，复用宿主菜单并保留自动路由模式。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import type { BreadcrumbItem } from '../_shared/public'
import type { BreadcrumbMenuItem, BreadcrumbRouteRecord } from './types'

export interface ResolveBreadcrumbOptions {
  items?: readonly BreadcrumbItem[]
  menus?: readonly BreadcrumbMenuItem[]
  matched: readonly BreadcrumbRouteRecord[]
  path: string
  formatLabel?: (label: string) => string
}

interface MenuNode {
  path: string
  label: string
  icon?: string
  disabled: boolean
  children: MenuNode[]
}

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : ''

const last = <T>(items: readonly T[]): T | undefined => items[items.length - 1]
const pathname = (path: string): string => path.split(/[?#]/, 1)[0]
const isPattern = (path: string): boolean => /(^|\/)[:*]/.test(pathname(path))

function normalizeSegments(path: string): string {
  const segments: string[] = []
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return `/${segments.join('/')}`
}

function resolvePath(value: string | number | undefined, parent = ''): string {
  const source = String(value ?? '').trim()
  if (!source || /^(?:[a-z][\w+.-]*:|\/\/|#)/i.test(source)) return ''
  const suffixIndex = source.search(/[?#]/)
  const suffix = suffixIndex < 0 ? '' : source.slice(suffixIndex)
  const path = suffixIndex < 0 ? source : source.slice(0, suffixIndex)
  const joined = path.startsWith('/') ? path : `${pathname(parent)}/${path}`
  return `${normalizeSegments(joined)}${suffix}`
}

const itemLabel = (item: BreadcrumbMenuItem): string =>
  text(item.label) || text(item.meta?.title)
const itemIcon = (item: BreadcrumbMenuItem): string | undefined =>
  text(item.icon) || text(item.meta?.icon) || undefined
const isHiddenMenu = (item: BreadcrumbMenuItem): boolean =>
  item.meta?.hidden === true || item.type === 'divider'
const isTransparentMenu = (item: BreadcrumbMenuItem): boolean =>
  item.type === 'group' || item.meta?.breadcrumb === false

function normalizeMenu(
  item: BreadcrumbMenuItem,
  parent: string,
  inheritedDisabled: boolean
): MenuNode[] {
  if (isHiddenMenu(item)) return []
  const disabled = inheritedDisabled || item.disabled === true
  const path =
    item.type === 'group'
      ? parent
      : resolvePath(text(item.path) || item.key, parent)
  const children = normalizeTree(item.children ?? [], path || parent, disabled)
  const label = itemLabel(item)
  if (isTransparentMenu(item) || !label || !path) return children
  return [{ path, label, icon: itemIcon(item), disabled, children }]
}

function normalizeTree(
  items: readonly BreadcrumbMenuItem[],
  parent = '',
  inheritedDisabled = false
): MenuNode[] {
  return items.flatMap(item => normalizeMenu(item, parent, inheritedDisabled))
}

function toDropdownItems(
  nodes: readonly MenuNode[],
  formatLabel: (label: string) => string
): BreadcrumbItem[] {
  return nodes.flatMap(node => {
    const children = toDropdownItems(node.children, formatLabel)
    if (isPattern(node.path) && !children.length) return []
    return [
      {
        key: node.path,
        label: formatLabel(node.label),
        icon: node.icon,
        disabled: node.disabled || isPattern(node.path),
        ...(children.length ? { children } : {}),
      },
    ]
  })
}

function toBreadcrumbItem(
  node: MenuNode,
  formatLabel: (label: string) => string,
  key = node.path
): BreadcrumbItem {
  return {
    key,
    label: formatLabel(node.label),
    icon: node.icon,
    disabled: node.disabled || isPattern(key),
    children: toDropdownItems(node.children, formatLabel),
  }
}

function menuMatchScore(
  node: MenuNode,
  currentPath: string,
  matchedPaths: readonly string[]
): number {
  const path = pathname(node.path)
  if (
    path === currentPath ||
    (isPattern(path) && path === last(matchedPaths))
  ) {
    return 300000 + path.length
  }
  if (path !== '/' && currentPath.startsWith(`${path}/`))
    return 200000 + path.length
  return matchedPaths.includes(path) ? 100000 + path.length : 0
}

function findMenuChain(
  nodes: readonly MenuNode[],
  currentPath: string,
  matchedPaths: readonly string[]
): MenuNode[] {
  let best: MenuNode[] = []
  let bestScore = 0
  const visit = (
    children: readonly MenuNode[],
    ancestors: readonly MenuNode[]
  ) => {
    children.forEach(node => {
      const chain = [...ancestors, node]
      const score = menuMatchScore(node, currentPath, matchedPaths)
      if (score > bestScore) {
        best = chain
        bestScore = score
      }
      visit(node.children, chain)
    })
  }
  visit(nodes, [])
  return best
}

function fallbackLabel(
  record: BreadcrumbRouteRecord | undefined,
  path: string
): string {
  const title = text(record?.meta?.title)
  if (title) return title
  const name =
    typeof record?.name === 'symbol' ? record.name.description : record?.name
  if (text(name)) return text(name)
  const segment = last(pathname(path).split('/').filter(Boolean)) || '/'
  try {
    return decodeURIComponent(segment).replace(/[-_]+/g, ' ')
  } catch {
    return segment
  }
}

function matchedBreadcrumbs(
  options: ResolveBreadcrumbOptions,
  formatLabel: (label: string) => string
): BreadcrumbItem[] {
  const result: BreadcrumbItem[] = []
  let parent = ''
  options.matched.forEach((record, index) => {
    parent = resolvePath(record.path, parent)
    const current = index === options.matched.length - 1
    const item = matchedItem(record, parent, current, options, formatLabel)
    if (item) result.push(item)
  })
  return result
}

function visibleMatched(
  record: BreadcrumbRouteRecord,
  current: boolean
): boolean {
  if (record.meta?.breadcrumb === false) return false
  return (
    current ||
    (record.meta?.hidden !== true && Boolean(text(record.meta?.title)))
  )
}

function matchedItem(
  record: BreadcrumbRouteRecord,
  parent: string,
  current: boolean,
  options: ResolveBreadcrumbOptions,
  formatLabel: (label: string) => string
): BreadcrumbItem | undefined {
  if (!visibleMatched(record, current)) return undefined
  const children =
    options.menus === undefined
      ? normalizeTree(record.children ?? [], parent)
      : []
  return {
    key: current ? options.path : parent,
    label: formatLabel(
      current ? fallbackLabel(record, options.path) : text(record.meta?.title)
    ),
    icon: itemIcon(record),
    disabled: !current && isPattern(parent),
    children: toDropdownItems(children, formatLabel),
  }
}

function mapsCurrentPage(
  node: MenuNode | undefined,
  currentPath: string,
  matchedPaths: readonly string[]
): boolean {
  if (!node) return false
  return (
    pathname(node.path) === currentPath ||
    (isPattern(node.path) && pathname(node.path) === last(matchedPaths))
  )
}

function menuBreadcrumbs(
  options: ResolveBreadcrumbOptions,
  formatLabel: (label: string) => string
): BreadcrumbItem[] | undefined {
  const currentPath = pathname(resolvePath(options.path) || options.path)
  const tree = normalizeTree(options.menus ?? [])
  const matchedPaths = options.matched.map(record => pathname(record.path))
  const chain = findMenuChain(tree, currentPath, matchedPaths)
  const lastNode = last(chain)
  const mapsCurrent = mapsCurrentPage(lastNode, currentPath, matchedPaths)
  const excludesCurrent = last(options.matched)?.meta?.breadcrumb === false
  const visibleChain =
    excludesCurrent && mapsCurrent ? chain.slice(0, -1) : chain
  if (!visibleChain.length) return undefined
  return visibleChain.map(node =>
    toBreadcrumbItem(
      node,
      formatLabel,
      mapsCurrent && node === lastNode ? options.path : node.path
    )
  )
}

function cloneItems(
  items: readonly BreadcrumbItem[],
  inheritedDisabled = false
): BreadcrumbItem[] {
  return items.map(item => ({
    ...item,
    ...(inheritedDisabled ? { disabled: true } : {}),
    ...(item.children === undefined
      ? {}
      : {
          children: cloneItems(
            item.children,
            inheritedDisabled || item.disabled === true
          ),
        }),
  }))
}

function appendCurrentPage(
  items: BreadcrumbItem[],
  options: ResolveBreadcrumbOptions,
  formatLabel: (label: string) => string
): BreadcrumbItem[] {
  const current = last(options.matched)
  if (current?.meta?.breadcrumb === false || last(items)?.key === options.path)
    return items
  items.push({
    key: options.path,
    label: formatLabel(fallbackLabel(current, options.path)),
    icon: current ? itemIcon(current) : undefined,
  })
  return items
}

/** 统计可访问的叶子页面；禁用目录的整棵子树不计入。 */
export function countBreadcrumbPages(items: readonly BreadcrumbItem[]): number {
  return items.reduce((total, item) => {
    if (item.disabled) return total
    const count = item.children?.length
      ? countBreadcrumbPages(item.children)
      : 1
    return total + count
  }, 0)
}

/**
 * 优先使用授权菜单生成祖先链；未传菜单时保留路由 children 自动模式。
 * 手动 items 只复制结构，不格式化标签或修改调用方的数据。
 */
export function resolveBreadcrumbItems(
  options: ResolveBreadcrumbOptions
): BreadcrumbItem[] {
  if (options.items !== undefined) return cloneItems(options.items)
  const formatLabel = options.formatLabel ?? (label => label)
  const items =
    menuBreadcrumbs(options, formatLabel) ??
    matchedBreadcrumbs(options, formatLabel)
  return appendCurrentPage(items, options, formatLabel)
}
