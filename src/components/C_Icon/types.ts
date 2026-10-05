/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-08-09
 * @FilePath: \naive-ui-components\src\components\C_Icon\types.ts
 * @Description: 图标组件公共类型
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import type { Component } from 'vue'

export interface IconProps {
  name?: string | Component
  type?: 'iconify' | 'unocss' | 'component' | 'svg' | 'image'
  color?: string
  size?: number | string
  svgPath?: string
  viewBox?: string
  alt?: string
  clickable?: boolean
  loading?: boolean
  fallbackIcon?: string
  /** 图标 API 请求超时（毫秒）；超时后显示离线占位或配置的回退图标。 */
  loadTimeout?: number
  title?: string
  ariaLabel?: string
  customClass?: string
  rotate?: number
  flip?: 'horizontal' | 'vertical' | 'both'
  componentProps?: Record<string, unknown>
}
