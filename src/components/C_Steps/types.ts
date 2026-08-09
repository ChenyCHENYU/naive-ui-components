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
