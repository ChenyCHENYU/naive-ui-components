/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 全局页面加载组件与延迟显示控制器的公开类型
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */
export interface PageLoadingProps {
  /** 是否显示；路由生命周期由接入项目控制。 */
  show: boolean
  /** 默认使用组件库的加载文案。 */
  label?: string
  /** 可选说明，例如目标页面名称。 */
  description?: string
  /** 默认使用 Naive UI 主色。 */
  color?: string
}

export interface PageLoadingOptions {
  /** 延迟显示的毫秒数，默认 160；完成速度快时不显示遮罩。 */
  delay?: number
}
