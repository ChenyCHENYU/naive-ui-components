/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-03-06
 * @Description: C_OrgChart 组织架构图组件导出入口
 * Copyright (c) 2026 by CHENY, All Rights Reserved 😎.
 */

import OrgChart from './index.vue'
import type { ComponentPublicInstance, PublicProps } from 'vue'
import type {
  OrgChartEmits,
  OrgChartExpose,
  OrgChartNode,
  OrgChartProps,
  OrgChartSlots,
} from './types'

type ChartListeners<T extends object> = {
  [E in keyof OrgChartEmits<T> as `on${Capitalize<E>}`]?: (
    ...args: OrgChartEmits<T>[E]
  ) => void
}
type ChartInstance<T extends object> = Omit<
  ComponentPublicInstance<OrgChartProps<T>, OrgChartExpose<T>>,
  '$props' | '$slots' | '$emit'
> & {
  $props: OrgChartProps<T> & ChartListeners<T> & PublicProps
  $slots: OrgChartSlots<T>
  $emit: {
    (event: 'node-click', ...args: OrgChartEmits<T>['node-click']): void
    (event: 'node-expand', ...args: OrgChartEmits<T>['node-expand']): void
    (event: 'node-collapse', ...args: OrgChartEmits<T>['node-collapse']): void
    (
      event: 'update:selectedKey',
      ...args: OrgChartEmits<T>['update:selectedKey']
    ): void
    (
      event: 'update:expandedKeys',
      ...args: OrgChartEmits<T>['update:expandedKeys']
    ): void
  }
}

/** 保留旧版 InstanceType 模板 ref，同时保留 SFC 的泛型调用签名。 */
export const C_OrgChart = OrgChart as typeof OrgChart & {
  new <T extends object = OrgChartNode>(
    props: OrgChartProps<T>
  ): ChartInstance<object extends T ? OrgChartNode : T>
}

export type {
  OrgChartNode,
  OrgChartDirection,
  OrgChartLineStyle,
  OrgChartProps,
  OrgChartKey,
  OrgChartSlots,
  OrgChartNodeSlotProps,
  OrgChartEmits,
  OrgChartExpose,
} from './types'
