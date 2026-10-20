/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-20
 * @Description: 面包屑菜单输入契约，不依赖应用 Store 或菜单渲染实现。
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

export interface BreadcrumbRouteMeta {
  [key: string]: unknown
  title?: unknown
  icon?: unknown
  hidden?: unknown
  breadcrumb?: unknown
}

/** 可直接接收应用提供的授权菜单，非字符串图标由组件安全忽略。 */
export interface BreadcrumbMenuItem {
  path?: string
  key?: string | number
  name?: string | symbol | null
  label?: string
  icon?: unknown
  meta?: BreadcrumbRouteMeta
  children?: readonly BreadcrumbMenuItem[]
  disabled?: boolean
  type?: string
}

/** Vue Router 路由记录的最小只读结构，兼容 normalized 和 raw children。 */
export interface BreadcrumbRouteRecord {
  path: string
  name?: string | symbol | null
  meta?: BreadcrumbRouteMeta
  children?: readonly BreadcrumbRouteRecord[]
}
