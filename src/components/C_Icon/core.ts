/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-06
 * @Description: 图标尺寸归一化与离线回退图形
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */

import type { IconifyIcon } from '@iconify/vue'

/** 数值字符串与数字采用像素单位，CSS 尺寸字符串保持原意。 */
export function normalizeIconSize(size: number | string): string {
  if (typeof size === 'number') return `${Math.max(0, size)}px`
  const value = size.trim()
  return /^\d+(?:\.\d+)?$/.test(value) ? `${value}px` : value
}

/** 无需网络或宿主图标集合的终端回退图标。 */
export const OFFLINE_ICON: IconifyIcon = {
  width: 24,
  height: 24,
  body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 4v6m0 4h.01"/>',
}
