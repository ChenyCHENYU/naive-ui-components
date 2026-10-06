/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @FilePath: \naive-ui-components\src\components\C_Loading\types.ts
 * @Description: 通用 SVG 加载态的尺寸、提示和主题颜色
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */
export interface LoadingProps {
  /** SVG 尺寸，单位 px，默认 48。 */
  size?: number
  /** 可选可见提示；不传时仍提供可访问的加载说明。 */
  label?: string
  /** 默认使用 Naive UI 主题主色。 */
  color?: string
}
