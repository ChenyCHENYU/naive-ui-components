/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-20
 * @Description: 同源 VRender Group 的 SDK 声明兼容边界
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
import type { VRender } from '@visactor/vtable-gantt'

/** SDK 的 Group.removeChild 与 INode 签名不一致；只适配同源 Group，不接受任意对象。 */
export function appendGanttGroup(
  parent: VRender.Group,
  child: VRender.Group
): void {
  parent.add(child as unknown as Parameters<VRender.Group['add']>[0])
}
