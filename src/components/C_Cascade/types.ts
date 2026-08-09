/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-08-09
 * @FilePath: \naive-ui-components\src\components\C_Cascade\types.ts
 * @Description: 级联选择组件公共类型
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

export interface CascadeItem {
  label: string
  value: string | number
  children?: CascadeItem[]
}

export interface CascadeValue {
  primary?: Pick<CascadeItem, 'label' | 'value'> | null
  secondary?: Pick<CascadeItem, 'label' | 'value'> | null
  tertiary?: Pick<CascadeItem, 'label' | 'value'> | null
}
