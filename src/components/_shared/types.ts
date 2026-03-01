/**
 * @robot-admin/naive-ui-components 菜单路由共享类型
 *
 * 遵循 Vue Router meta 标准扩展，兼容主流 Admin 框架的路由数据格式
 */

import type { VNode } from 'vue'

/**
 * 路由项 — 组件库统一的路由/菜单数据结构
 *
 * 设计原则：
 * - 顶层字段与 Vue Router `RouteRecordRaw` 对齐
 * - `meta` 字段采用 Admin 生态公约（title / icon / hidden / affix / keepAlive）
 * - 同时兼容后端直接返回的 JSON 路由表（path + meta 即可）
 *
 * @example Vue Router 格式
 * ```ts
 * const route: RouteItem = {
 *   path: '/dashboard',
 *   name: 'Dashboard',
 *   meta: { title: '仪表盘', icon: 'mdi:monitor-dashboard' },
 *   children: [...]
 * }
 * ```
 *
 * @example 后端 JSON 格式
 * ```ts
 * const menuFromApi: RouteItem = {
 *   path: '/system/user',
 *   meta: { title: '用户管理', icon: 'mdi:account' }
 * }
 * ```
 */
export interface RouteItem {
  /** 路由路径（必须） */
  path: string
  /** 路由名称 */
  name?: string
  /** 重定向路径 */
  redirect?: string
  /** 组件名称或路径（用于动态导入） */
  component?: string | (() => Promise<any>)

  /** 菜单/路由元数据 */
  meta?: RouteMeta

  /** 子路由 */
  children?: RouteItem[]

  // ====== NMenu 特殊类型（可选） ======
  /** 菜单项类型：'group' 分组 | 'divider' 分割线 */
  type?: 'group' | 'divider'
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * 路由元数据 — 兼容 Vue Router RouteMeta 扩展标准
 *
 * 参考：
 * - Vue Router: https://router.vuejs.org/guide/advanced/meta.html
 * - Vben Admin / Naive Admin Pro / Ant Design Pro Vue 的公约字段
 */
export interface RouteMeta {
  /** 页面/菜单标题 */
  title?: string
  /** 图标名称（Iconify 格式如 'mdi:home'，或自定义） */
  icon?: string | (() => VNode)
  /** 是否在菜单中隐藏 */
  hidden?: boolean
  /** 是否固定在标签栏 */
  affix?: boolean
  /** 是否缓存页面（keep-alive） */
  keepAlive?: boolean
  /** 是否全屏显示（不显示 header/sidebar） */
  full?: boolean
  /** 外部链接 URL */
  link?: string
  /** 排序权重 */
  orderNo?: number
  /** 扩展属性 */
  [key: string]: any
}

/**
 * 标签项 — C_TagsView 使用的标签数据结构
 */
export interface TagItem {
  /** 路由路径 */
  path: string
  /** 显示标题（已翻译） */
  title: string
  /** 原始标题（未翻译，用于语言切换后重新翻译） */
  originalTitle?: string
  /** 图标名 */
  icon?: string
  /** 元数据 */
  meta?: {
    /** 是否固定在标签栏 */
    affix?: boolean
    [key: string]: any
  }
}

/**
 * 面包屑项 — C_Breadcrumb 使用的数据结构
 */
export interface BreadcrumbItem {
  /** 路径 key */
  key: string
  /** 显示文本 */
  label: string
  /** 图标名称 */
  icon?: string
  /** 子级列表（用于下拉） */
  children?: BreadcrumbItem[]
}
