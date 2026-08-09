/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-08-09
 * @FilePath: \naive-ui-components\src\components\C_Icon\types.ts
 * @Description: 图标组件公共类型
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

export interface IconProps {
  name: string | unknown
  type?: 'iconify' | 'unocss' | 'component' | 'svg' | 'image'
  color?: string
  size?: number | string
  svgPath?: string
  viewBox?: string
  alt?: string
  clickable?: boolean
  loading?: boolean
  fallbackIcon?: string
  title?: string
  ariaLabel?: string
  customClass?: string
  rotate?: number
  flip?: 'horizontal' | 'vertical' | 'both'
  componentProps?: Record<string, unknown>
}
