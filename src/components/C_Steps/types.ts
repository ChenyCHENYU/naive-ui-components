/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-08-09
 * @FilePath: \naive-ui-components\src\components\C_Steps\types.ts
 * @Description: 步骤条组件公共类型
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

export interface StepItem {
  title: string
  description?: string
  time?: string
  icon?: string
  status?: 'wait' | 'process' | 'finish' | 'error'
  disabled?: boolean
  detail?: string
}

/** 步骤数据与常用展示配置；只读数组可直接来自共享配置。 */
export interface StepsProps {
  steps: readonly StepItem[]
  current?: number
  direction?: 'horizontal' | 'vertical'
  clickable?: boolean
  /** 水平连接线是否贴近图标；默认保留两端间距。 */
  connected?: boolean
}
