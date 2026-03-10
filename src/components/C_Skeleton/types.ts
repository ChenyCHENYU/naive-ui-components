/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_Skeleton 骨架屏组件类型定义
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

/** 骨架屏预设模式 */
export type SkeletonPreset =
  | 'text'
  | 'avatar'
  | 'card'
  | 'table'
  | 'form'
  | 'list'
  | 'detail'
  | 'image'

/** 骨架屏动画类型 */
export type SkeletonAnimation = 'pulse' | 'wave' | false

/** 表格骨架配置 */
export interface SkeletonTableConfig {
  /** 行数 */
  rows?: number
  /** 列数 */
  cols?: number
  /** 是否显示表头 */
  showHeader?: boolean
  /** 是否显示操作列 */
  showActions?: boolean
}

/** 表单骨架配置 */
export interface SkeletonFormConfig {
  /** 字段数 */
  fields?: number
  /** 每行列数 */
  cols?: number
  /** 是否显示标签 */
  showLabel?: boolean
  /** 是否显示操作按钮 */
  showActions?: boolean
}

/** 列表骨架配置 */
export interface SkeletonListConfig {
  /** 列表项数 */
  items?: number
  /** 是否显示头像 */
  showAvatar?: boolean
  /** 描述行数 */
  descLines?: number
}

/** 卡片骨架配置 */
export interface SkeletonCardConfig {
  /** 是否显示封面图 */
  showCover?: boolean
  /** 标题行数 */
  titleLines?: number
  /** 描述行数 */
  descLines?: number
  /** 是否显示底部操作 */
  showFooter?: boolean
}

/** 详情骨架配置 */
export interface SkeletonDetailConfig {
  /** 字段数 */
  fields?: number
  /** 每个字段的值行数 */
  valueLines?: number
  /** 是否显示头像 */
  showAvatar?: boolean
}

/** C_Skeleton Props */
export interface SkeletonProps {
  /** 预设模式 */
  preset?: SkeletonPreset
  /** 是否正在加载（true 显示骨架屏，false 显示插槽内容） */
  loading?: boolean
  /** 动画类型 */
  animation?: SkeletonAnimation
  /** 重复次数（用于 text/card/list 模式） */
  repeat?: number
  /** 圆角大小 */
  borderRadius?: string
  /** 表格配置 */
  table?: SkeletonTableConfig
  /** 表单配置 */
  form?: SkeletonFormConfig
  /** 列表配置 */
  list?: SkeletonListConfig
  /** 卡片配置 */
  card?: SkeletonCardConfig
  /** 详情配置 */
  detail?: SkeletonDetailConfig
}
