/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-28
 * @FilePath: \naive-ui-components\src\components\C_Form\numberInput.ts
 * @Description: 数字字段的紧凑外观和原生输入无障碍默认值，不重实现数值逻辑
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import type { ComponentDensity } from '../../core/density'
import type { FormOption } from './types'
import type { RendererProps } from './composables/useFormRenderer'

/** 字段显式属性优先；范围、精度、键盘、只读和禁用继续由 Naive UI 处理。 */
export function resolveNumberInputProps(
  props: RendererProps,
  item: FormOption,
  density: ComponentDensity
): RendererProps {
  const native = props.inputProps
  const inputProps =
    native && typeof native === 'object' && !Array.isArray(native)
      ? (native as Record<string, unknown>)
      : {}
  return {
    ...props,
    ...(density === 'compact' && props.showButton === undefined
      ? { showButton: false }
      : {}),
    inputProps: {
      role: 'spinbutton',
      inputmode: props.precision === 0 ? 'numeric' : 'decimal',
      'aria-label': item.label,
      'aria-valuenow': Number.isFinite(props.value) ? props.value : undefined,
      'aria-valuemin': props.min ?? undefined,
      'aria-valuemax': props.max ?? undefined,
      ...inputProps,
    },
  }
}
