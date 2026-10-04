/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_Guide 用户引导组件类型定义
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

/** 通用功能示意图，不包含宿主业务数据。 */
export type GuideIllustration =
  | 'navigation'
  | 'search'
  | 'tabs'
  | 'account'
  | 'overview'
  | 'notification'
  | 'fullscreen'
  | 'language'
  | 'theme'
  | 'settings'

/** 可使用选择器、真实元素或动态解析函数定位目标。 */
export type GuideTarget = string | Element | (() => Element | null | undefined)

/** 引导实例公开方法，用于宿主在路由变化时主动停止等场景。 */
export interface GuideExpose {
  startGuide: (force?: boolean) => Promise<void>
  stopGuide: () => void
  resetCompleted: () => void
  isCompleted: () => boolean
}

/** 引导步骤定义 */
export interface GuideStep {
  /** 目标元素；不传时可展示居中的欢迎步骤。 */
  element?: GuideTarget
  /** 弹出层配置 */
  popover: {
    title: string
    description: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    /** 可选的轻量示意图，使用组件主题色。 */
    illustration?: GuideIllustration
  }
  /** 步骤所属分组（用于步骤分组展示） */
  group?: string
  /** 进入此步骤前的回调 */
  onHighlightStarted?: (element: Element | undefined, step: GuideStep) => void
  /** 离开此步骤后的回调 */
  onDeselected?: (element: Element | undefined, step: GuideStep) => void
  /** 是否跳过此步骤的条件 */
  skipIf?: () => boolean
}

/** 引导主题配置 */
export interface GuideTheme {
  /** 弹层背景色 */
  popoverBgColor?: string
  /** 弹层文字色 */
  popoverTextColor?: string
  /** 按钮主色 */
  primaryColor?: string
  /** 遮罩层透明度 */
  overlayOpacity?: number
  /** 弹层圆角 */
  borderRadius?: string
}

/** 引导持久化配置 */
export interface GuidePersistence {
  /** 是否启用持久化（记住已完成的引导） */
  enabled?: boolean
  /** 持久化 key 前缀 */
  keyPrefix?: string
}

/** C_Guide Props */
export interface GuideProps {
  /** 引导步骤 */
  steps?: GuideStep[]
  /** 完成按钮文字 */
  doneBtnText?: string
  /** 下一步按钮文字 */
  nextBtnText?: string
  /** 上一步按钮文字 */
  prevBtnText?: string
  /** 是否显示跳过按钮；allowClose 为 false 时不显示，默认 true。 */
  showSkipButton?: boolean
  /** 跳过按钮文字，默认“跳过引导”。 */
  skipBtnText?: string
  /** 是否显示进度条 */
  showProgress?: boolean
  /** 是否启用键盘导航（← → Esc） */
  keyboard?: boolean
  /** 是否启用动画 */
  animate?: boolean
  /** 是否允许点击遮罩关闭 */
  allowClose?: boolean
  /** 自动跳过不存在或不可见的目标，默认 true。 */
  skipMissingElements?: boolean
  /** 主题配置 */
  theme?: GuideTheme
  /** 持久化配置 */
  persistence?: GuidePersistence
  /** 弹层自定义 CSS 类 */
  popoverClass?: string
  /** 是否显示触发按钮（设为 false 则仅通过 expose 的 startGuide 触发） */
  showTrigger?: boolean
  /** 触发按钮的 tooltip 文字 */
  triggerTooltip?: string
  /** 触发按钮图标 */
  triggerIcon?: string
}
