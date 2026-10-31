/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-31
 * @Description: 表单与表格编辑弹窗共用的视口约束及原生 Card 分区样式
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */
import type { CSSProperties } from 'vue'
import type { ComponentDensity } from '../../core/density'

/** 纯样式解析，不依赖宿主原子类、DOM 测量或逐字段监听。 */
export function resolveFormModalStyles(
  width: number | string,
  density?: ComponentDensity
) {
  const compact = density === 'compact'
  const gutter = compact ? '12px' : 'clamp(12px, 2.5vw, 16px)'
  const cssWidth =
    typeof width === 'number'
      ? `${Number.isFinite(width) && width > 0 ? width : 600}px`
      : width
  // Modal 经 Teleport 渲染后不保证继承 SFC 作用域属性。
  // 原生分区样式只调整外壳，避免覆盖内嵌业务卡片。
  return {
    shell: {
      width: cssWidth,
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100dvh - 32px)',
      overflow: 'hidden',
      borderRadius: '10px',
    },
    header: {
      minHeight: compact ? '40px' : '46px',
      padding: `${compact ? 8 : 12}px ${gutter}`,
      fontSize: '15px',
      borderBottom: '1px solid var(--n-border-color)',
      flexShrink: 0,
    },
    content: {
      padding: `${compact ? 10 : 14}px ${gutter} 8px`,
      minHeight: 0,
      overflow: 'auto',
    },
    footer: {
      padding: `${compact ? 8 : 10}px ${gutter}`,
      background: 'var(--n-action-color)',
      borderTop: '1px solid var(--n-border-color)',
      flexShrink: 0,
    },
  } satisfies Record<string, CSSProperties>
}
