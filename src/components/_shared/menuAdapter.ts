/**
 * 菜单适配器 — 将路由数据转换为 NMenu 的 MenuOption[]
 *
 * 设计理念：
 * - 开箱即用：`createMenuOptions(routes)` 零配置即可生成菜单
 * - 完全可控：通过 `MenuAdapterConfig` 定制每一步转换逻辑
 * - i18n 解耦：`labelFormatter` 回调注入翻译函数，不绑定任何 i18n 方案
 *
 * @example 基础用法
 * ```ts
 * import { createMenuOptions } from '@robot-admin/naive-ui-components'
 *
 * const menuOptions = createMenuOptions(routes)
 * ```
 *
 * @example 带 i18n + 过滤
 * ```ts
 * const menuOptions = createMenuOptions(routes, {
 *   labelFormatter: t,          // vue-i18n 的 t 函数
 *   filter: route => !route.meta?.hidden,
 * })
 * ```
 *
 * @example 自定义 key 取值
 * ```ts
 * const menuOptions = createMenuOptions(routes, {
 *   getKey: route => route.name || route.path,
 * })
 * ```
 */

import { h, type VNode } from 'vue'
import { Icon } from '@iconify/vue'
import type { MenuOption } from 'naive-ui/es'
import type { RouteItem } from './types'

/**
 * 菜单适配器配置
 */
export interface MenuAdapterConfig {
  /**
   * 标签文本格式化函数（用于 i18n）
   * 默认：原样返回 title
   */
  labelFormatter?: (title: string) => string

  /**
   * 获取菜单项的唯一 key
   * 默认：`normalizePath(route.path)`
   */
  getKey?: (route: RouteItem) => string

  /**
   * 获取显示文本
   * 默认：`route.meta?.title || route.name || ''`
   */
  getLabel?: (route: RouteItem) => string

  /**
   * 路由过滤器 — return false 排除该项
   * 默认：排除 `meta.hidden === true`
   */
  filter?: (route: RouteItem) => boolean

  /**
   * 自定义图标渲染
   * 默认：字符串 → Iconify Icon；函数 → 直接调用
   */
  renderIcon?: (
    icon: string | (() => VNode) | undefined
  ) => (() => VNode) | undefined

  /**
   * 是否递归处理 children
   * 默认：true
   */
  recursive?: boolean
}

// ====== 内置默认值 ======

const normalizePath = (path: string): string =>
  path.startsWith('/') ? path : `/${path}`

const defaultGetKey = (route: RouteItem): string =>
  route.path ? normalizePath(route.path) : ''

const defaultGetLabel = (route: RouteItem): string =>
  route.meta?.title || route.name || ''

const defaultFilter = (route: RouteItem): boolean => !route.meta?.hidden

const defaultRenderIcon = (
  icon: string | (() => VNode) | undefined
): (() => VNode) | undefined => {
  if (!icon) return undefined
  if (typeof icon === 'string') {
    return () =>
      h(
        'span',
        {
          class: 'n-icon',
          style: 'display: inline-flex; align-items: center;',
        },
        [h(Icon, { icon })]
      )
  }
  if (typeof icon === 'function') return icon
  return undefined
}

/**
 * 将路由数据转换为 NMenu 的 MenuOption[]
 *
 * 支持的输入格式：
 * 1. **Vue Router RouteRecordRaw** — 直接传 `router.getRoutes()` 或手写路由表
 * 2. **后端 JSON 路由表** — `{ path, meta: { title, icon }, children }`
 * 3. **自定义格式** — 通过 config 完全自定义 key/label/icon 的取值逻辑
 *
 * @param routes 路由数据数组
 * @param config 适配器配置
 * @returns NMenu 可直接使用的 MenuOption[]
 */
export function createMenuOptions(
  routes: RouteItem[],
  config: MenuAdapterConfig = {}
): MenuOption[] {
  const {
    labelFormatter = (s: string) => s,
    getKey = defaultGetKey,
    getLabel = defaultGetLabel,
    filter = defaultFilter,
    renderIcon = defaultRenderIcon,
    recursive = true,
  } = config

  const convert = (items: RouteItem[]): MenuOption[] => {
    return items.filter(filter).map(item => {
      const icon = item.meta?.icon || (item as any).icon
      const children =
        recursive && item.children?.length ? convert(item.children) : undefined

      return {
        key: getKey(item),
        label: labelFormatter(getLabel(item)),
        disabled: item.disabled || false,
        icon: renderIcon(icon),
        ...(item.type && { type: item.type }),
        ...(children?.length && { children }),
      }
    }) as MenuOption[]
  }

  return convert(routes)
}

/**
 * 将路由树扁平化为一维数组（常用于搜索、快捷导航）
 *
 * @param routes 路由数据数组
 * @param filter 过滤器（默认排除 hidden）
 * @returns 扁平化后的路由数组
 */
export function flattenRoutes(
  routes: RouteItem[],
  filter: (route: RouteItem) => boolean = defaultFilter
): RouteItem[] {
  const result: RouteItem[] = []
  const walk = (items: RouteItem[]) => {
    for (const item of items) {
      if (filter(item)) {
        result.push(item)
      }
      if (item.children?.length) {
        walk(item.children)
      }
    }
  }
  walk(routes)
  return result
}
